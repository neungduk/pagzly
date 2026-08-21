/**
 * review/photo-sources.json에 기록된 Pexels 사진을 다시 다운로드.
 * 카테고리 필터 가능: npx tsx scripts/download-from-sources.ts 반려동물 생활용품
 * 필터 없으면 누락된 파일만 다운로드.
 */

import fs from "fs";
import path from "path";

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

type SourceEntry = {
  category: string;
  file: string;
  pexelsId: number;
  pexelsUrl: string;
};

async function main() {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) { console.error("PEXELS_API_KEY 필요"); process.exit(1); }

  const sourcesPath = path.join(__dirname, "..", "review", "photo-sources.json");
  const sources: SourceEntry[] = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));

  const filterCats = process.argv.slice(2);
  const targets = filterCats.length > 0
    ? sources.filter((s) => filterCats.some((f) => s.category.includes(f)))
    : sources.filter((s) => !fs.existsSync(path.join(__dirname, "..", s.file)));

  if (targets.length === 0) {
    console.log("다운로드할 파일 없음");
    return;
  }

  console.log(`${targets.length}장 다운로드 시작...\n`);

  for (const entry of targets) {
    const dest = path.join(__dirname, "..", entry.file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    const res = await fetch(`https://api.pexels.com/v1/photos/${entry.pexelsId}`, {
      headers: { Authorization: apiKey },
    });
    if (!res.ok) {
      console.error(`✗ ${entry.file} — Pexels API ${res.status}`);
      continue;
    }
    const photo = (await res.json()) as { src: { large2x: string; large: string } };
    const imgUrl = photo.src.large2x || photo.src.large;

    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) {
      console.error(`✗ ${entry.file} — 이미지 다운로드 실패 ${imgRes.status}`);
      continue;
    }
    fs.writeFileSync(dest, Buffer.from(await imgRes.arrayBuffer()));
    console.log(`✓ ${entry.file}`);
  }

  console.log("\n완료.");
}

main().catch((err) => { console.error(err); process.exit(1); });
