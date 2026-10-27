/**
 * 467차 — 검수용 placeholder 사진 대용품(ph2) 생성기. 거의 단색이던 `public/qa-fixtures/ph/*`(단순 타원) 대신 상업 사진처럼 보이는 SVG를 코드로 만든다:
 * 벽/테이블 gradient 배경, 스튜디오 조명(왼쪽 위 광원) 윤곽, 원통·상자 입체 gradient, 바닥 반사 그림자. 외부 이미지·네트워크·필터 요소 없음(rect·ellipse·path·circle·gradient만).
 * 앱 코드·말뭉치·기준 출력은 바꾸지 않는다 — 갤러리 도구(--ph2)가 사진 경로를 이 파일로 바꿔 쓸 때만 쓴다.
 *   npx tsx scripts/make-ph2-467.ts      # public/qa-fixtures/ph2/<제품>-<톤>.svg 24개 (제품 8 × 톤 3)
 */
import fs from "node:fs";

export const OUT = "public/qa-fixtures/ph2";
export const PRODUCTS = ["bottle", "tube", "jar", "box", "shoe", "keyboard", "bag", "pouch"] as const;
export const TONES = [
  { id: "warm", wallA: "#F6EBDD", wallB: "#E8D3BC", table: "#D9BFA3", accent: "#B5654A" },
  { id: "cool", wallA: "#E7EEF5", wallB: "#CBD8E6", table: "#B7C6D8", accent: "#2F5F8F" },
  { id: "sage", wallA: "#EAF0E6", wallB: "#CFDCC8", table: "#B9CBB0", accent: "#3F7A55" },
] as const;
export type Tone = (typeof TONES)[number];

const W = 600; const H = 750;
const defs = (t: Tone): string =>
  `<defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.wallA}"/><stop offset="1" stop-color="${t.wallB}"/></linearGradient>` +
  `<linearGradient id="tbl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.table}"/><stop offset="1" stop-color="${t.wallB}"/></linearGradient>` +
  `<linearGradient id="cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.28"/><stop offset="0.28" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.34"/></linearGradient>` +
  `<linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="0.38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="glow" cx="0.3" cy="0.2" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
const bg = (t: Tone): string => `<rect width="${W}" height="${H}" fill="url(#wall)"/><rect y="520" width="${W}" height="${H - 520}" fill="url(#tbl)"/><rect y="516" width="${W}" height="6" fill="#000" opacity="0.06"/><rect width="${W}" height="${H}" fill="url(#glow)"/>`;
const floor = (cx: number, w: number): string => `<ellipse cx="${cx}" cy="586" rx="${w}" ry="22" fill="url(#shadow)"/>`;

const BODY: Record<(typeof PRODUCTS)[number], (t: Tone) => string> = {
  bottle: (t) => floor(300, 120) + `<rect x="226" y="250" width="148" height="330" rx="26" fill="${t.accent}"/><rect x="226" y="250" width="148" height="330" rx="26" fill="url(#cyl)"/><rect x="262" y="196" width="76" height="62" rx="10" fill="#2B2B2B"/><rect x="262" y="196" width="76" height="62" rx="10" fill="url(#cyl)"/><rect x="246" y="360" width="108" height="120" rx="8" fill="#fff" opacity="0.88"/><rect x="262" y="384" width="76" height="8" rx="4" fill="${t.accent}" opacity="0.7"/><rect x="262" y="404" width="56" height="6" rx="3" fill="#000" opacity="0.18"/><rect x="232" y="262" width="22" height="300" rx="11" fill="url(#top)" opacity="0.5"/>`,
  tube: (t) => floor(300, 130) + `<path d="M232 560 L246 250 Q300 226 354 250 L368 560 Z" fill="${t.accent}"/><path d="M232 560 L246 250 Q300 226 354 250 L368 560 Z" fill="url(#cyl)"/><rect x="258" y="190" width="84" height="64" rx="12" fill="#F4F4F2"/><rect x="258" y="190" width="84" height="64" rx="12" fill="url(#cyl)"/><rect x="248" y="540" width="104" height="20" fill="#000" opacity="0.14"/><rect x="262" y="330" width="76" height="90" rx="8" fill="#fff" opacity="0.85"/>`,
  jar: (t) => floor(300, 170) + `<rect x="170" y="330" width="260" height="240" rx="34" fill="#F7F4EF"/><rect x="170" y="330" width="260" height="240" rx="34" fill="url(#cyl)"/><rect x="158" y="278" width="284" height="70" rx="22" fill="${t.accent}"/><rect x="158" y="278" width="284" height="70" rx="22" fill="url(#cyl)"/><rect x="158" y="278" width="284" height="22" rx="11" fill="url(#top)"/><rect x="214" y="418" width="172" height="76" rx="8" fill="${t.accent}" opacity="0.18"/><rect x="236" y="440" width="128" height="8" rx="4" fill="${t.accent}"/>`,
  box: (t) => floor(300, 190) + `<path d="M150 320 L330 290 L450 320 L450 560 L330 590 L150 560 Z" fill="#F5F3EE"/><path d="M330 290 L450 320 L450 560 L330 590 Z" fill="#000" opacity="0.18"/><path d="M150 320 L330 290 L450 320 L330 350 Z" fill="#fff" opacity="0.6"/><rect x="190" y="400" width="120" height="14" rx="7" fill="${t.accent}"/><rect x="190" y="430" width="86" height="8" rx="4" fill="#000" opacity="0.2"/><circle cx="244" cy="500" r="26" fill="${t.accent}" opacity="0.85"/>`,
  shoe: (t) => floor(300, 210) + `<path d="M120 540 Q116 470 170 450 L260 430 Q300 380 360 380 Q420 384 452 440 Q500 452 490 510 Q488 548 440 552 L150 556 Q124 556 120 540 Z" fill="${t.accent}"/><path d="M120 540 Q116 470 170 450 L260 430 Q300 380 360 380 Q420 384 452 440 Q500 452 490 510 Q488 548 440 552 L150 556 Q124 556 120 540 Z" fill="url(#top)" opacity="0.5"/><rect x="118" y="540" width="374" height="26" rx="13" fill="#F4F1EA"/><rect x="118" y="556" width="374" height="10" rx="5" fill="#000" opacity="0.12"/><path d="M270 436 L350 420 M284 458 L364 440 M298 480 L378 462" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.85"/>`,
  keyboard: (t) => floor(300, 250) + `<path d="M70 470 L120 400 L480 400 L530 470 L530 540 L70 540 Z" fill="#E9E7E2"/><path d="M70 470 L530 470 L530 540 L70 540 Z" fill="#000" opacity="0.1"/>` + [0, 1, 2].map((r) => [...Array(11).keys()].map((c) => `<rect x="${108 + c * 34 - r * 6}" y="${414 + r * 22}" width="28" height="16" rx="4" fill="${r === 0 ? t.accent : "#FAF9F6"}" opacity="${r === 0 ? 0.8 : 1}"/>`).join("")).join("") + `<rect x="170" y="482" width="260" height="16" rx="5" fill="#FAF9F6"/>`,
  bag: (t) => floor(300, 190) + `<path d="M210 330 Q210 230 300 230 Q390 230 390 330" fill="none" stroke="${t.accent}" stroke-width="16" stroke-linecap="round"/><path d="M140 560 L168 330 Q300 300 432 330 L460 560 Z" fill="${t.accent}"/><path d="M140 560 L168 330 Q300 300 432 330 L460 560 Z" fill="url(#cyl)"/><rect x="262" y="376" width="76" height="46" rx="10" fill="#F4F1EA" opacity="0.9"/><circle cx="300" cy="399" r="8" fill="${t.accent}"/>`,
  pouch: (t) => floor(300, 160) + `<path d="M190 560 L200 260 Q300 232 400 260 L410 560 Z" fill="#F7F4EF"/><path d="M190 560 L200 260 Q300 232 400 260 L410 560 Z" fill="url(#cyl)"/><rect x="196" y="250" width="208" height="22" rx="8" fill="${t.accent}"/><rect x="196" y="250" width="208" height="12" rx="6" fill="url(#top)"/><circle cx="300" cy="400" r="62" fill="${t.accent}" opacity="0.9"/><rect x="236" y="484" width="128" height="10" rx="5" fill="${t.accent}" opacity="0.6"/><rect x="256" y="508" width="88" height="7" rx="3.5" fill="#000" opacity="0.18"/>`,
};

export function svgOf(product: (typeof PRODUCTS)[number], tone: Tone): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs(tone)}${bg(tone)}${BODY[product](tone)}</svg>\n`;
}

/** 카테고리 폴더(beauty·fashion·tech·food·living·pet…) → 제품 후보 */
export const PRODUCTS_BY_CATEGORY: Record<string, Array<(typeof PRODUCTS)[number]>> = {
  beauty: ["bottle", "tube", "jar"], fashion: ["shoe", "bag"], tech: ["keyboard", "box"], food: ["pouch", "box"], living: ["box", "jar"], pet: ["pouch", "bag"],
};

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const p of PRODUCTS) for (const t of TONES) { fs.writeFileSync(`${OUT}/${p}-${t.id}.svg`, svgOf(p, t)); n += 1; }
  console.log(`쓴 파일: ${n}개 → ${OUT}/`);
}
if (require.main === module) main();
