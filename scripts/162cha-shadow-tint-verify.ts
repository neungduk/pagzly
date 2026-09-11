import sharp from "sharp";
import {
  sampleBackdropAmbientColor,
  tintedShadowColor,
  buildProductShadowSvg,
  buildSoftContactShadowSvg,
  buildSilhouetteShadowBuffer,
} from "../lib/photo-composite";
import { DEFAULT_SHADOW } from "../lib/vision-utils";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

async function main() {
  // 1. sampleBackdropAmbientColor — 단색 배경에서 정확히 그 색을 뽑아내는지
  const warmBg = await sharp({
    create: { width: 400, height: 400, channels: 3, background: { r: 220, g: 180, b: 140 } },
  })
    .png()
    .toBuffer();
  const ambientWarm = await sampleBackdropAmbientColor(warmBg);
  console.log("  warm ambient:", ambientWarm);
  assert(
    Math.abs(ambientWarm.r - 220) < 3 && Math.abs(ambientWarm.g - 180) < 3 && Math.abs(ambientWarm.b - 140) < 3,
    "sampleBackdropAmbientColor recovers solid warm background color",
  );

  const coolBg = await sharp({
    create: { width: 400, height: 400, channels: 3, background: { r: 140, g: 150, b: 165 } },
  })
    .png()
    .toBuffer();
  const ambientCool = await sampleBackdropAmbientColor(coolBg);
  console.log("  cool ambient:", ambientCool);

  // 2. tintedShadowColor — 순수 검정이 아니라 배경 색조를 유지한 어두운 색인지
  const tintWarm = tintedShadowColor(ambientWarm);
  const tintCool = tintedShadowColor(ambientCool);
  console.log("  warm tint:", tintWarm, " cool tint:", tintCool);
  assert(
    !(tintWarm.r === 0 && tintWarm.g === 0 && tintWarm.b === 0),
    "warm tint is not pure black",
  );
  assert(
    tintWarm.r > tintWarm.b,
    "warm background → shadow tint is warmer (R > B), matching crawl guidance (no pure black)",
  );
  assert(
    tintCool.b >= tintCool.r,
    "cool background → shadow tint stays cool-leaning (B >= R), not flattened to gray/black",
  );
  assert(
    tintWarm.r < ambientWarm.r,
    "tint is darker than the ambient source (still reads as a shadow, not a flat color)",
  );

  // 3. buildProductShadowSvg — tint 파라미터가 실제로 SVG stop-color에 반영되는지
  const placement = { left: 100, top: 100, width: 200, height: 200 };
  const svgDefault = buildProductShadowSvg(400, placement, DEFAULT_SHADOW);
  const svgTinted = buildProductShadowSvg(400, placement, DEFAULT_SHADOW, tintWarm);
  assert(svgDefault.includes("#000000"), "no-tint call still defaults to pure black (backward compatible)");
  assert(!svgTinted.includes("#000000"), "tinted call no longer uses pure black");
  const hex = `#${tintWarm.r.toString(16).padStart(2, "0")}${tintWarm.g.toString(16).padStart(2, "0")}${tintWarm.b.toString(16).padStart(2, "0")}`;
  assert(svgTinted.includes(hex), `tinted svg contains expected hex ${hex}`);

  // 4. buildSoftContactShadowSvg — 동일 검증
  const contactDefault = buildSoftContactShadowSvg(400, DEFAULT_SHADOW);
  const contactTinted = buildSoftContactShadowSvg(400, DEFAULT_SHADOW, tintCool);
  assert(contactDefault.includes("#000000"), "contact shadow no-tint defaults to black");
  assert(!contactTinted.includes("#000000"), "contact shadow tinted no longer pure black");

  // 5. buildSilhouetteShadowBuffer — tint 유무에 따라 결과 PNG의 평균 픽셀색이 달라지는지
  const cutout = await sharp({
    create: { width: 200, height: 200, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 255 } },
  })
    .png()
    .toBuffer();
  const shadowBufDefault = await buildSilhouetteShadowBuffer(cutout, 400, placement, DEFAULT_SHADOW);
  const shadowBufTinted = await buildSilhouetteShadowBuffer(cutout, 400, placement, DEFAULT_SHADOW, tintWarm);
  const rawDefault = await sharp(shadowBufDefault).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rawTinted = await sharp(shadowBufTinted).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // 그림자가 실제로 칠해진 중심부 픽셀 비교 (알파가 있는 영역)
  const centerIdx = (200 * rawDefault.info.width + 200) * rawDefault.info.channels;
  const defR = rawDefault.data[centerIdx];
  const tintR = rawTinted.data[centerIdx];
  console.log(`  silhouette center R: default=${defR} tinted=${tintR}`);
  assert(defR !== tintR, "silhouette shadow buffer differs between default(black) and tinted variants");

  console.log("\n162cha-shadow-tint-verify.ts done.");
}

main().catch((e) => {
  console.error("SCRIPT ERROR", e);
  process.exitCode = 1;
});
