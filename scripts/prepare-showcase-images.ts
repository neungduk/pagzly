// review/attempt-*.png 에서 상세페이지 영역을 잘라 public/showcase/ 에 저장한다.
// 실행: npx tsx scripts/prepare-showcase-images.ts

import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.join(__dirname, "..");

const ITEMS = [
  {
    src: "review/attempt-화장품-뷰티-1.png",
    thumb: "public/showcase/cosmetics-thumb.png",
    full: "public/showcase/cosmetics-full.png",
  },
  {
    src: "review/attempt-의류-패션-1.png",
    thumb: "public/showcase/fashion-thumb.png",
    full: "public/showcase/fashion-full.png",
  },
  {
    src: "review/attempt-식품-1.png",
    thumb: "public/showcase/food-thumb.png",
    full: "public/showcase/food-full.png",
  },
  {
    src: "review/attempt-전자제품-2.png",
    thumb: "public/showcase/electronics-thumb.png",
    full: "public/showcase/electronics-full.png",
  },
  {
    src: "review/attempt-생활용품-1.png",
    thumb: "public/showcase/lifestyle-thumb.png",
    full: "public/showcase/lifestyle-full.png",
  },
] as const;

async function main() {
  const outDir = path.join(ROOT, "public/showcase");
  fs.mkdirSync(outDir, { recursive: true });

  for (const item of ITEMS) {
    const srcPath = path.join(ROOT, item.src);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Missing: ${item.src}`);
    }

    fs.copyFileSync(srcPath, path.join(ROOT, item.full));

    const meta = await sharp(srcPath).metadata();
    const width = meta.width ?? 750;
    const top = Math.round(width * 0.72);
    const thumbHeight = Math.round(width * (4 / 3));

    await sharp(srcPath)
      .extract({
        left: 0,
        top,
        width,
        height: Math.min(thumbHeight, (meta.height ?? top + thumbHeight) - top),
      })
      .png()
      .toFile(path.join(ROOT, item.thumb));

    console.log(`✓ ${path.basename(item.thumb)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
