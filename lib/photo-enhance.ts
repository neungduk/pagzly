import Replicate from "replicate";
import sharp from "sharp";
import { getCategoryTheme } from "@/lib/category-theme";

const CANVAS_SIZE = 1200;

let replicateClient: Replicate | null = null;

function getReplicateClient(): Replicate {
  if (!replicateClient) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN이 설정되지 않았습니다.");
    }
    replicateClient = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  }
  return replicateClient;
}

// Replicate의 851-labs/background-remover 모델로 배경을 제거한 뒤,
// 카테고리 테마 색으로 만든 부드러운 스튜디오 배경 위에 합성한다.
// Photoroom의 "AI 배경 생성"과 비슷한 느낌을 훨씬 저렴하게 재현하는 것이 목표.
export async function enhanceProductImage(
  sourceImageUrl: string,
  category: string,
): Promise<Buffer> {
  const replicate = getReplicateClient();

  // 1. 배경 제거 (투명 PNG 컷아웃)
  const output = await replicate.run("851-labs/background-remover", {
    input: { image: sourceImageUrl },
  });

  const cutoutUrl = Array.isArray(output) ? output[0] : output;
  if (!cutoutUrl || typeof cutoutUrl !== "string") {
    throw new Error("배경 제거 결과를 받지 못했습니다.");
  }

  const cutoutResponse = await fetch(cutoutUrl);
  if (!cutoutResponse.ok) {
    throw new Error("배경 제거된 이미지를 불러오지 못했습니다.");
  }
  const cutoutBuffer = Buffer.from(await cutoutResponse.arrayBuffer());

  // 2. 카테고리 테마 색으로 스튜디오 배경(부드러운 방사형 그라데이션 + 그림자) 생성
  const theme = getCategoryTheme(category);
  const backdropSvg = `
    <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="38%" r="72%">
          <stop offset="0%" stop-color="${theme.accentSoft}" />
          <stop offset="100%" stop-color="#FFFFFF" />
        </radialGradient>
        <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(0,0,0,0.16)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <ellipse cx="${CANVAS_SIZE / 2}" cy="${CANVAS_SIZE * 0.83}" rx="${CANVAS_SIZE * 0.26}" ry="${CANVAS_SIZE * 0.045}" fill="url(#shadow)" />
    </svg>
  `;
  const backdropBuffer = await sharp(Buffer.from(backdropSvg)).png().toBuffer();

  // 3. 컷아웃을 캔버스 크기에 맞게 리사이즈
  const targetSize = Math.round(CANVAS_SIZE * 0.68);
  const cutoutResized = await sharp(cutoutBuffer)
    .resize(targetSize, targetSize, { fit: "inside", withoutEnlargement: false })
    .toBuffer();
  const cutoutMeta = await sharp(cutoutResized).metadata();
  const width = cutoutMeta.width ?? targetSize;
  const height = cutoutMeta.height ?? targetSize;
  const left = Math.round((CANVAS_SIZE - width) / 2);
  const top = Math.round((CANVAS_SIZE - height) / 2) - Math.round(CANVAS_SIZE * 0.02);

  // 4. 배경 위에 합성
  const finalBuffer = await sharp(backdropBuffer)
    .composite([{ input: cutoutResized, left, top }])
    .png()
    .toBuffer();

  return finalBuffer;
}
