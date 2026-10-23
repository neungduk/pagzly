/**
 * 443차 4-3 — 합성 픽스처(scripts/fixtures/archetype-*.json) 사진 교체: 모든 픽스처가 같은 음식 선반·글자 박힌 사진을 가리켜
 * 립 틴트 같은 페이지에 엉뚱한 사진이 나오던 것을, 카테고리 색 톤의 글자 없는 플레이스홀더(그라데이션 면 + 단순 도형, 직접 생성 → 저작권 문제 없음)로 바꾼다.
 *   npx tsx scripts/gen-fixture-placeholders.ts          (이미 바꾼 픽스처는 건너뜀, 같은 입력이면 같은 출력)
 * 사진 주소 /qa-fixtures/synth/<파일> → /qa-fixtures/ph/<카테고리>/<파일>. 크기(가로×세로)는 원래 파일과 같게 해 레이아웃 비율을 유지한다(원본이 없으면 480×600).
 * 총 용량은 실행 끝에 출력한다(상한 8MB).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const FIX_DIR = "scripts/fixtures";
const OLD = "/qa-fixtures/synth/";
const OUT_ROOT = "public/qa-fixtures/ph";

/** 카테고리 → [폴더 키, 위 색, 아래 색, 도형 색] — 각 카테고리의 흔한 상품 톤(뷰티 분홍, 식품 크림, 전자 쿨 그레이 …) */
const CATEGORY: Record<string, [string, string, string, string]> = {
  "의류/패션": ["fashion", "#E4DDD2", "#BFB3A2", "#F4EFE8"],
  "화장품/뷰티": ["beauty", "#F7E3DF", "#E3BDB7", "#FFF6F3"],
  식품: ["food", "#F6E7C1", "#E2C583", "#FFF8E6"],
  생활용품: ["living", "#DDE4D3", "#B9C6AA", "#F3F6EE"],
  전자제품: ["tech", "#DCE3EC", "#AFBCCE", "#F1F5FA"],
  반려동물: ["pet", "#EFDDC8", "#D0B08E", "#FBF3E9"],
};

const hash = (s: string): number => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
};

function svgOf(w: number, h: number, top: string, bottom: string, shape: string, name: string): string {
  const k = hash(name);
  const cx = Math.round(w * (0.42 + (k % 17) / 100));
  const cy = Math.round(h * (0.46 + ((k >> 5) % 11) / 100));
  const r = Math.round(Math.min(w, h) * (0.2 + ((k >> 9) % 9) / 100));
  const form = k % 3;
  const body =
    form === 0
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${shape}" fill-opacity="0.85"/>`
      : form === 1
        ? `<rect x="${cx - r}" y="${cy - Math.round(r * 1.2)}" width="${r * 2}" height="${Math.round(r * 2.4)}" rx="${Math.round(r * 0.35)}" fill="${shape}" fill-opacity="0.85"/>`
        : `<ellipse cx="${cx}" cy="${cy}" rx="${Math.round(r * 1.25)}" ry="${Math.round(r * 0.8)}" fill="${shape}" fill-opacity="0.85"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<rect y="${Math.round(h * 0.72)}" width="${w}" height="${h - Math.round(h * 0.72)}" fill="${shape}" fill-opacity="0.22"/>` +
    body +
    `</svg>`
  );
}

async function main() {
  let total = 0;
  let made = 0;
  for (const file of fs.readdirSync(FIX_DIR).filter((f) => f.startsWith("archetype-") && f.endsWith(".json")).sort()) {
    const p = path.join(FIX_DIR, file);
    let text = fs.readFileSync(p, "utf8");
    const category = (JSON.parse(text) as { category?: string }).category ?? "";
    const spec = CATEGORY[category];
    if (!spec) throw new Error(`${file}: 카테고리 '${category}'에 맞는 색 톤이 없음`);
    const [key, top, bottom, shape] = spec;
    const names = [...new Set([...text.matchAll(new RegExp(`${OLD.replace(/\//g, "\\/")}([^"\\\\]+)`, "g"))].map((m) => m[1]!))];
    for (const name of names) {
      const src = path.join("public/qa-fixtures/synth", name);
      let w = 480;
      let h = 600;
      if (fs.existsSync(src)) {
        const meta = await sharp(src).metadata();
        w = meta.width ?? w;
        h = meta.height ?? h;
      }
      const dest = path.join(OUT_ROOT, key, name);
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const img = sharp(Buffer.from(svgOf(w, h, top, bottom, shape, `${key}/${name}`)));
        await (/\.jpe?g$/i.test(name) ? img.jpeg({ quality: 82 }) : img.png({ compressionLevel: 9 })).toFile(dest);
        made += 1;
      }
      text = text.split(`${OLD}${name}`).join(`/qa-fixtures/ph/${key}/${name}`);
    }
    fs.writeFileSync(p, text);
  }
  for (const f of fs.readdirSync(OUT_ROOT, { recursive: true }) as string[]) {
    const fp = path.join(OUT_ROOT, f);
    if (fs.statSync(fp).isFile()) total += fs.statSync(fp).size;
  }
  console.log(`플레이스홀더 새로 ${made}개, 폴더 총 ${(total / 1024 / 1024).toFixed(2)}MB (상한 8MB)`);
  if (total > 8 * 1024 * 1024) process.exit(1);
}
void main();
