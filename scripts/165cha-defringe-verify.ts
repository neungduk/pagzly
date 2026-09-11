/**
 * 165차 — defringeCutoutEdges() 검증. $0, 수동 구성한 raw RGBA 버퍼만 사용
 * (rembg 번짐을 흉내낸 합성 픽셀 — 실측 API 호출 없음).
 */
import sharp from "sharp";
import { defringeCutoutEdges } from "../lib/photo-composite";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

const SIZE = 20;
const CH = 4;

function makeFringedSquare(): Buffer {
  // 20x20 캔버스: 완전 투명 배경 + 중앙 8x8 완전 불투명 빨강 + 그 주위 2px
  // 반투명(alpha=120) 초록 "번짐" 테두리(rembg가 원본 초록 배경을 살짝 남긴 상황을 흉내).
  const data = Buffer.alloc(SIZE * SIZE * CH, 0);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = (y * SIZE + x) * CH;
      const inInterior = x >= 6 && x < 14 && y >= 6 && y < 14;
      const inRing = x >= 4 && x < 16 && y >= 4 && y < 16 && !inInterior;
      if (inInterior) {
        data[i] = 255;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      } else if (inRing) {
        data[i] = 0;
        data[i + 1] = 200;
        data[i + 2] = 0;
        data[i + 3] = 120; // 반투명 — "번짐 존" (16<=a<235)
      }
      // 나머지는 이미 0(완전 투명)
    }
  }
  return data;
}

async function toPng(raw: Buffer): Promise<Buffer> {
  return sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer();
}

async function readRaw(buf: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function main() {
  const rawInput = makeFringedSquare();
  const inputPng = await toPng(rawInput);
  const before = await readRaw(inputPng);

  // 번짐 존의 한 픽셀(외곽 코너, (4,4)) — 원래 초록(0,200,0)이었는지 확인
  const ringCornerIdx = (4 * SIZE + 4) * 4;
  assert(
    before.data[ringCornerIdx + 1] === 200 && before.data[ringCornerIdx] === 0,
    "before defringe: ring pixel is green-tinted fringe (0,200,0)",
  );
  assert(before.data[ringCornerIdx + 3] === 120, "before defringe: ring pixel alpha is 120 (semi-transparent)");

  const result = await defringeCutoutEdges(inputPng, 2);
  const after = await readRaw(result);

  // 1) 번짐 픽셀의 RGB가 인근 완전 불투명(빨강) 이웃 쪽으로 바뀌어야 함 — 더 이상 순수 초록이 아님
  const r = after.data[ringCornerIdx];
  const g = after.data[ringCornerIdx + 1];
  const b = after.data[ringCornerIdx + 2];
  assert(r > 0, `defringed ring pixel picks up red from opaque neighbor (r=${r})`);
  assert(g < 200, `defringed ring pixel loses green fringe tint (g=${g}, was 200)`);
  assert(b === 0, `defringed ring pixel has no blue contamination (b=${b})`);

  // 2) 알파는 절대 건드리지 않아야 함 (경계 형태/페더링 보존)
  assert(
    after.data[ringCornerIdx + 3] === 120,
    `alpha is preserved exactly at ring pixel (got ${after.data[ringCornerIdx + 3]}, expected 120)`,
  );

  // 3) 완전 불투명 인테리어 픽셀은 전혀 변경되지 않아야 함
  const interiorIdx = (8 * SIZE + 8) * 4;
  assert(
    after.data[interiorIdx] === 255 &&
      after.data[interiorIdx + 1] === 0 &&
      after.data[interiorIdx + 2] === 0 &&
      after.data[interiorIdx + 3] === 255,
    "fully opaque interior pixel is completely unchanged",
  );

  // 4) 완전 투명 배경 픽셀도 전혀 변경되지 않아야 함
  const bgIdx = (0 * SIZE + 0) * 4;
  assert(
    after.data[bgIdx + 3] === 0,
    "fully transparent background pixel stays alpha=0",
  );

  // 5) 근방에 깨끗한(완전 불투명) 이웃이 전혀 없는 경우 — 원본 색 그대로 유지(안전 폴백)
  const isolatedFringe = Buffer.alloc(10 * 10 * 4, 0);
  for (let y = 3; y < 7; y += 1) {
    for (let x = 3; x < 7; x += 1) {
      const i = (y * 10 + x) * 4;
      isolatedFringe[i] = 10;
      isolatedFringe[i + 1] = 200;
      isolatedFringe[i + 2] = 10;
      isolatedFringe[i + 3] = 100; // 반투명, 주변에 완전 불투명 이웃 없음
    }
  }
  const isolatedPng = await sharp(isolatedFringe, { raw: { width: 10, height: 10, channels: 4 } })
    .png()
    .toBuffer();
  const isolatedResult = await defringeCutoutEdges(isolatedPng, 2);
  const isolatedAfter = await readRaw(isolatedResult);
  const centerIdx = (5 * 10 + 5) * 4;
  assert(
    isolatedAfter.data[centerIdx + 1] === 200,
    "no clean opaque neighbor within radius -> original color preserved (safe fallback)",
  );

  if (process.exitCode === 1) {
    console.error("\n165차 defringe verification FAILED");
    process.exit(1);
  } else {
    console.log("\n165차 defringe verification PASSED (all assertions ok)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
