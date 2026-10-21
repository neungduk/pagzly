/**
 * 회귀 — 426차 W3·W6 업로드 안전. 이미지 메타데이터(EXIF·XMP·IPTC) 탐지, 재인코딩 크기 계산, 프록시 허용 호스트·콘텐츠 타입·크기 상한. 호출 0.
 * (브라우저 canvas 재인코딩 자체는 scripts/_426-exif-verify.ts 로 실제 브라우저에서 확인한 결과를 보고서에 기록)
 */
import sharp from "sharp";
import { detectImageMetadata, hasImageMetadata, planReencodeSize } from "../../lib/image-upload";
import { PROXY_MAX_BYTES, isAllowedImageType, isAllowedProxyUrl, readCapped } from "../../lib/proxy-image-policy";

export const name = "업로드 안전 — 메타데이터 탐지·재인코딩 크기·프록시 호스트/타입/크기 정책";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };

  // 크기 계산
  eq("작은 이미지는 그대로", planReencodeSize(1000, 800), { width: 1000, height: 800, scaled: false });
  eq("긴 변 4096 초과는 축소", planReencodeSize(6000, 3000), { width: 4096, height: 2048, scaled: true });
  eq("세로 이미지 축소", planReencodeSize(3000, 8192), { width: 1500, height: 4096, scaled: true });
  eq("0 크기", planReencodeSize(0, 100).scaled, false);

  // 메타데이터 탐지: sharp로 만든 JPEG
  const raw = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#c33" } });
  const plain = await raw.clone().jpeg().toBuffer();
  const withExif = await raw
    .clone()
    .withExif({ IFD0: { Make: "Cam" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "37/1 30/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "127/1 0/1 0/1" } })
    .jpeg()
    .toBuffer();
  eq("메타 없는 JPEG", detectImageMetadata(new Uint8Array(plain)), { exif: false, xmp: false, iptc: false });
  eq("EXIF 있는 JPEG", detectImageMetadata(new Uint8Array(withExif)).exif, true);
  eq("hasImageMetadata", [hasImageMetadata(new Uint8Array(plain)), hasImageMetadata(new Uint8Array(withExif))], [false, true]);
  eq("비이미지", hasImageMetadata(new TextEncoder().encode("hello")), false);
  const pngPlain = await raw.clone().png().toBuffer();
  eq("PNG 메타 없음", hasImageMetadata(new Uint8Array(pngPlain)), false);

  // 프록시 정책
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://abcd.supabase.co", NODE_ENV: "production" };
  const ok = (u: string, e = env) => isAllowedProxyUrl(u, e);
  eq("자기 Supabase 허용", ok("https://abcd.supabase.co/storage/v1/object/public/images/a.png"), true);
  eq("다른 Supabase 프로젝트 거절", ok("https://other.supabase.co/x.png"), false);
  eq("replicate 허용", ok("https://replicate.delivery/pbxt/a.png"), true);
  eq("replicate 서브도메인 허용", ok("https://pbxt.replicate.delivery/a.png"), true);
  eq("유사 도메인 거절", ok("https://evilreplicate.delivery/a.png"), false);
  eq("googleapis 거절", ok("https://storage.googleapis.com/x.png"), false);
  eq("http 거절(운영)", ok("http://abcd.supabase.co/x.png"), false);
  eq("자격 증명 포함 거절", ok("https://user:pw@abcd.supabase.co/x.png"), false);
  eq("localhost 운영 거절", ok("http://localhost:3000/x.png"), false);
  eq("localhost 개발 허용", ok("http://localhost:3000/x.png", { ...env, NODE_ENV: "development" }), true);
  eq("내부 IP 거절", ok("http://169.254.169.254/latest/meta-data", { ...env, NODE_ENV: "development" }), false);
  eq("Supabase URL 미설정이면 replicate만", [ok("https://abcd.supabase.co/x.png", { NODE_ENV: "production" }), ok("https://a.replicate.delivery/x.png", { NODE_ENV: "production" })], [false, true]);
  eq("이상한 문자열", ok("not a url"), false);

  // 콘텐츠 타입
  eq("이미지 타입", ["image/png", "image/jpeg", "image/webp; charset=x", "image/svg+xml", "application/octet-stream", "text/html", null].map((t) => isAllowedImageType(t)), [true, true, true, false, false, false, false]);

  // 크기 상한
  const stream = (n: number, chunk = 1024 * 1024) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        for (let left = n; left > 0; left -= chunk) c.enqueue(new Uint8Array(Math.min(chunk, left)));
        c.close();
      },
    });
  eq("상한 이내", (await readCapped(stream(3 * 1024 * 1024), PROXY_MAX_BYTES))?.byteLength, 3 * 1024 * 1024);
  eq("상한 초과는 null", await readCapped(stream(PROXY_MAX_BYTES + 1), PROXY_MAX_BYTES), null);
  eq("본문 없음", (await readCapped(null, 10))?.byteLength, 0);
  return fails;
}
