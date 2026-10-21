export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** 426차 W3 — 업로드 재인코딩 시 긴 변 상한(px). 이보다 크면 비율을 유지해 줄인다 */
export const MAX_UPLOAD_EDGE = 4096;
/** JPEG 재인코딩 품질(0~1). 0.95 — 육안 열화가 없는 수준으로 고정(418차 샘플 전후 비교 기준) */
export const UPLOAD_JPEG_QUALITY = 0.95;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "JPG, PNG 파일만 업로드할 수 있습니다.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "이미지는 8MB 이하여야 합니다.";
  }
  return null;
}

/** 긴 변이 maxEdge를 넘으면 비율을 유지해 줄인 크기, 아니면 그대로 */
export function planReencodeSize(width: number, height: number, maxEdge: number = MAX_UPLOAD_EDGE): { width: number; height: number; scaled: boolean } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0, scaled: false };
  const long = Math.max(width, height);
  if (long <= maxEdge) return { width: Math.round(width), height: Math.round(height), scaled: false };
  const s = maxEdge / long;
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)), scaled: true };
}

export type MetadataFound = { exif: boolean; xmp: boolean; iptc: boolean };

/**
 * 파일 바이트에 EXIF·XMP·IPTC 메타데이터가 들어 있는지 훑는다(위치 정보 포함 여부 점검용, 파싱 없이 표식만 확인).
 * JPEG: APP1 "Exif"·XMP, APP13(IPTC) 세그먼트. PNG: eXIf 청크, iTXt/tEXt의 XMP 키워드. 그 밖의 형식은 모두 false.
 */
export function detectImageMetadata(bytes: Uint8Array): MetadataFound {
  const out: MetadataFound = { exif: false, xmp: false, iptc: false };
  const ascii = (from: number, len: number) => String.fromCharCode(...bytes.slice(from, from + len));
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 4 <= bytes.length && bytes[i] === 0xff) {
      const marker = bytes[i + 1]!;
      if (marker === 0xd9 || marker === 0xda) break; // 이미지 끝·스캔 시작 이후에는 메타 세그먼트가 없다
      const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
      if (len < 2) break;
      if (marker === 0xe1) {
        if (ascii(i + 4, 4) === "Exif") out.exif = true;
        if (ascii(i + 4, 28).startsWith("http://ns.adobe.com/xap/1.0/")) out.xmp = true;
      }
      if (marker === 0xed) out.iptc = true;
      i += 2 + len;
    }
    return out;
  }
  if (bytes.length > 8 && ascii(1, 3) === "PNG") {
    let i = 8;
    while (i + 8 <= bytes.length) {
      const len = ((bytes[i]! << 24) | (bytes[i + 1]! << 16) | (bytes[i + 2]! << 8) | bytes[i + 3]!) >>> 0;
      const type = ascii(i + 4, 4);
      if (type === "eXIf") out.exif = true;
      if ((type === "iTXt" || type === "tEXt") && ascii(i + 8, 17).startsWith("XML:com.adobe.xmp")) out.xmp = true;
      if (type === "IEND") break;
      i += 12 + len;
    }
  }
  return out;
}

export const hasImageMetadata = (bytes: Uint8Array): boolean => {
  const m = detectImageMetadata(bytes);
  return m.exif || m.xmp || m.iptc;
};

/**
 * 426차 W3 — 업로드 전 재인코딩으로 EXIF·위치 정보(GPS)·XMP·IPTC를 제거한다(브라우저 전용, canvas).
 *  - EXIF 방향은 디코딩할 때 적용(imageOrientation: "from-image")한 뒤 메타를 버리므로 회전된 사진이 옆으로 눕지 않는다.
 *  - 긴 변이 4096px을 넘으면 비율을 유지해 줄인다. JPEG는 품질 0.95, PNG는 무손실.
 *  - ICC 프로파일은 canvas가 sRGB로 변환해 그린다(색 영향은 샘플 전후 비교로 확인).
 *  - JPEG·PNG가 아니면 그대로 돌려준다(비이미지 파일 업로드 경로와 같은 함수를 써도 안전). 디코딩·인코딩이 실패하면 예외를 던지며,
 *    호출부는 **원본을 올리지 않고** 오류로 처리해야 한다(위치 정보가 그대로 공개되는 것을 막기 위해).
 */
export async function stripImageMetadata(file: File, opts: { maxEdge?: number; jpegQuality?: number } = {}): Promise<File> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return file;
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = planReencodeSize(bitmap.width, bitmap.height, opts.maxEdge ?? MAX_UPLOAD_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d를 사용할 수 없습니다.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, file.type === "image/jpeg" ? (opts.jpegQuality ?? UPLOAD_JPEG_QUALITY) : undefined),
    );
    if (!blob || blob.type !== file.type) throw new Error("이미지를 다시 저장하지 못했습니다.");
    return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

/** 업로드 직전 준비: 이미지면 메타데이터를 제거해 돌려주고, 실패하면 원본을 올리지 않고 사용자용 문구의 예외를 던진다 */
export async function prepareUploadFile(file: File): Promise<File> {
  try {
    return await stripImageMetadata(file);
  } catch {
    throw new Error("이미지를 처리하지 못했습니다. 다른 사진으로 다시 시도해 주세요.");
  }
}
