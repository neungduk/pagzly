/**
 * 448차 1-1 — 극단 합성 사진 세트(결정적 시드, 그라데이션·노이즈·도형만). 실사진이 클라우드에 없어서, 실사진에서 깨질 만한 극단을 코드로 흉내 낸다.
 *   npx tsx scripts/gen-photo-stress.ts [--out=review/448-verify/photos]
 * 파일: <id>.jpg(투명 필요 없는 것) — 합계 10MB 이하. 목록은 STRESS_PHOTOS(id·설명·크기).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export type StressPhoto = { id: string; label: string; w: number; h: number };
export const STRESS_PHOTOS: StressPhoto[] = [
  { id: "cutout-white", label: "흰 배경 컷아웃(제품 단독)", w: 800, h: 800 },
  { id: "white-shadow", label: "순백 + 연한 그림자", w: 800, h: 800 },
  { id: "very-dark", label: "매우 어두운 사진", w: 800, h: 800 },
  { id: "mid-gray", label: "중간 회색 저대비", w: 800, h: 800 },
  { id: "sat-red", label: "고채도 빨강 면", w: 800, h: 800 },
  { id: "sat-blue", label: "고채도 파랑 면", w: 800, h: 800 },
  { id: "sat-yellow", label: "고채도 노랑 면", w: 800, h: 800 },
  { id: "sat-green", label: "고채도 초록 면", w: 800, h: 800 },
  { id: "noise-shelf", label: "고주파 노이즈(식품 진열대 같은 복잡한 배경)", w: 800, h: 800 },
  { id: "portrait-45", label: "세로로 긴 모델 사진 4:5", w: 800, h: 1000 },
  { id: "landscape-169", label: "가로로 긴 풍경 16:9", w: 1280, h: 720 },
  { id: "square-vignette", label: "정사각 + 모서리 비네팅", w: 800, h: 800 },
  { id: "sky-ground", label: "상단 밝음·하단 어두움 그라데이션(하늘/바닥)", w: 800, h: 1000 },
  { id: "pastel-low", label: "1색 저대비 파스텔", w: 800, h: 800 },
  { id: "face-oval", label: "중앙 밝은 타원 + 어두운 주변(얼굴 위치)", w: 800, h: 1000 },
  { id: "tiny-120", label: "극소 해상도 120px(폴백 경계)", w: 120, h: 120 },
  { id: "ratio-3to1", label: "극대 종횡비 3:1(폴백 경계)", w: 1200, h: 400 },
];

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const svg = (w: number, h: number, body: string, defs = ""): Buffer => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`);

function body(p: StressPhoto): Buffer {
  const { w, h } = p;
  const bottle = (fill: string, shade: string) => `<rect x="${w * 0.36}" y="${h * 0.2}" width="${w * 0.28}" height="${h * 0.6}" rx="${w * 0.05}" fill="${fill}"/><rect x="${w * 0.42}" y="${h * 0.12}" width="${w * 0.16}" height="${h * 0.1}" rx="${w * 0.02}" fill="${shade}"/>`;
  switch (p.id) {
    case "cutout-white": return svg(w, h, `<rect width="${w}" height="${h}" fill="#FFFFFF"/>${bottle("#B8B2A6", "#8E8878")}`);
    case "white-shadow": return svg(w, h, `<rect width="${w}" height="${h}" fill="#FFFFFF"/><ellipse cx="${w / 2}" cy="${h * 0.84}" rx="${w * 0.3}" ry="${h * 0.04}" fill="url(#s)"/>${bottle("#D9D4C8", "#B5AFA0")}`, `<radialGradient id="s"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`);
    case "very-dark": return svg(w, h, `<rect width="${w}" height="${h}" fill="#0A0A0C"/><circle cx="${w * 0.6}" cy="${h * 0.4}" r="${w * 0.25}" fill="#17171B"/>`);
    case "mid-gray": return svg(w, h, `<rect width="${w}" height="${h}" fill="#808080"/><rect x="${w * 0.2}" y="${h * 0.25}" width="${w * 0.6}" height="${h * 0.5}" fill="#858585"/>`);
    case "sat-red": return svg(w, h, `<rect width="${w}" height="${h}" fill="#FF1A1A"/>`);
    case "sat-blue": return svg(w, h, `<rect width="${w}" height="${h}" fill="#1A2BFF"/>`);
    case "sat-yellow": return svg(w, h, `<rect width="${w}" height="${h}" fill="#FFE600"/>`);
    case "sat-green": return svg(w, h, `<rect width="${w}" height="${h}" fill="#00D13A"/>`);
    case "portrait-45": return svg(w, h, `<rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w / 2}" cy="${h * 0.22}" r="${w * 0.1}" fill="#C8A58C"/><rect x="${w * 0.3}" y="${h * 0.3}" width="${w * 0.4}" height="${h * 0.55}" rx="${w * 0.06}" fill="#3C4A63"/>`, `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9E4DE"/><stop offset="1" stop-color="#9A9288"/></linearGradient>`);
    case "landscape-169": return svg(w, h, `<rect width="${w}" height="${h * 0.6}" fill="url(#sk)"/><rect y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="#3F5A2E"/><circle cx="${w * 0.75}" cy="${h * 0.3}" r="${h * 0.12}" fill="#FFF6D8"/>`, `<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FA8E8"/><stop offset="1" stop-color="#D8ECFF"/></linearGradient>`);
    case "square-vignette": return svg(w, h, `<rect width="${w}" height="${h}" fill="#C9B79C"/><rect width="${w}" height="${h}" fill="url(#v)"/>`, `<radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient>`);
    case "sky-ground": return svg(w, h, `<rect width="${w}" height="${h}" fill="url(#g)"/>`, `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDFEFF"/><stop offset=".55" stop-color="#BCD4EA"/><stop offset=".56" stop-color="#2A2A26"/><stop offset="1" stop-color="#050505"/></linearGradient>`);
    case "pastel-low": return svg(w, h, `<rect width="${w}" height="${h}" fill="#F3E9EC"/><circle cx="${w / 2}" cy="${h / 2}" r="${w * 0.3}" fill="#F0E4E8"/>`);
    case "face-oval": return svg(w, h, `<rect width="${w}" height="${h}" fill="#1A1614"/><ellipse cx="${w / 2}" cy="${h * 0.38}" rx="${w * 0.2}" ry="${h * 0.2}" fill="#F1D9C6"/>`);
    case "tiny-120": return svg(w, h, `<rect width="${w}" height="${h}" fill="#7C8A9A"/><circle cx="60" cy="60" r="30" fill="#DDE3EA"/>`);
    case "ratio-3to1": return svg(w, h, `<rect width="${w}" height="${h}" fill="url(#g)"/>`, `<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2C3E50"/><stop offset="1" stop-color="#BDC3C7"/></linearGradient>`);
    default: return svg(w, h, `<rect width="${w}" height="${h}" fill="#888"/>`);
  }
}

/** 노이즈 사진은 raw 버퍼로(결정적 PRNG): 블록 4px 단위 무작위 색 + 줄무늬 */
async function noiseShelf(p: StressPhoto, out: string): Promise<void> {
  const r = rng(448);
  const cell = 4, cw = Math.ceil(p.w / cell), ch = Math.ceil(p.h / cell);
  const px = Buffer.alloc(p.w * p.h * 3);
  const colors: number[][] = Array.from({ length: cw * ch }, () => [Math.floor(r() * 256), Math.floor(r() * 256), Math.floor(r() * 256)]);
  for (let y = 0; y < p.h; y += 1) for (let x = 0; x < p.w; x += 1) {
    const c = colors[Math.floor(y / cell) * cw + Math.floor(x / cell)]!;
    const stripe = Math.floor(y / 40) % 2 ? 0.55 : 1;
    const i = (y * p.w + x) * 3;
    px[i] = c[0]! * stripe; px[i + 1] = c[1]! * stripe; px[i + 2] = c[2]! * stripe;
  }
  await sharp(px, { raw: { width: p.w, height: p.h, channels: 3 } }).jpeg({ quality: 82 }).toFile(out);
}

export async function generate(outDir: string): Promise<string[]> {
  fs.mkdirSync(outDir, { recursive: true });
  const files: string[] = [];
  for (const p of STRESS_PHOTOS) {
    const out = path.join(outDir, `${p.id}.jpg`);
    if (p.id === "noise-shelf") await noiseShelf(p, out);
    else if (p.id === "very-dark") {
      const r = rng(7);
      const noise = Buffer.alloc(p.w * p.h * 3);
      for (let i = 0; i < noise.length; i += 1) noise[i] = Math.floor(r() * 10);
      await sharp(noise, { raw: { width: p.w, height: p.h, channels: 3 } }).composite([{ input: await sharp(body(p)).png().toBuffer(), blend: "lighten" }]).jpeg({ quality: 88 }).toFile(out);
    } else await sharp(body(p)).jpeg({ quality: 88 }).toFile(out);
    files.push(out);
  }
  return files;
}

if (/gen-photo-stress\.ts$/.test(process.argv[1] ?? "")) {
  const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "review/448-verify/photos";
  void generate(out).then((f) => { const kb = f.reduce((s, x) => s + fs.statSync(x).size, 0) / 1024; console.log(`${f.length}장, ${kb.toFixed(0)}KB → ${out}`); });
}
