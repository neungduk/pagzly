/**
 * 431차 1-2 — 개념 일러스트 15종(viewBox 200×200, 직접 그린 도형). 같은 개념도 변형 3종(구도 + 색 슬롯 회전)·스타일 3종.
 * 레이어: 뒤 큰 도형(back) → 중간 오브젝트 → 앞 작은 장식, 그림자는 항상 오른쪽 아래(광원 좌상단).
 * 장식·개념 설명용이다: 효능·수치·성분 함량을 그림으로 주장하지 않고, 얼굴·피부 클로즈업·브랜드 로고·캐릭터·실존 제품 형태를 그리지 않는다(병·옷걸이 등은 일반 형태).
 */
import { back, dot, lineColor, makeCtx, paint, paintDark, shadow, shine, spark, wrapSvg, type Ctx, type IllustColors, type IllustStyle } from "@/lib/illustrations/core";

export type IllustId = "drop" | "shield" | "leaf" | "flask" | "layers" | "sparkle" | "wind" | "clock" | "tape" | "hanger" | "weave" | "wave" | "box" | "check" | "bag";
export const ILLUST_IDS: readonly IllustId[] = ["drop", "shield", "leaf", "flask", "layers", "sparkle", "wind", "clock", "tape", "hanger", "weave", "wave", "box", "check", "bag"];
export const ILLUST_LABEL: Record<IllustId, string> = {
  drop: "수분·물방울", shield: "보호·방패", leaf: "성분·잎", flask: "성분·플라스크", layers: "레이어·겹", sparkle: "빛·반짝임", wind: "온도·바람", clock: "시간·시계",
  tape: "사이즈·줄자", hanger: "코디·옷걸이", weave: "소재·직조", wave: "세탁·물결", box: "배송·상자", check: "안전·체크", bag: "휴대·가방",
};

const W = "#FFFFFF";

type Draw = (c: Ctx) => string;

const drop: Draw = (c) =>
  back(c) +
  shadow(c, 100, 166, 36) +
  (c.v === 1 ? `<path d="M142 78 C142 78 124 100 124 116 a18 18 0 0 0 36 0 C160 100 142 78 142 78 Z" ${paint(c, "s")}/>` : "") +
  `<path d="M96 40 C96 40 58 88 58 120 a38 38 0 0 0 76 0 C134 88 96 40 96 40 Z" ${paint(c, "p")}/>` +
  shine(c, "M76 112 C75 124 80 134 88 138 C82 130 80 122 82 108 Z") +
  (c.style === "line" ? "" : `<path d="M78 108 C77 120 82 130 90 134" stroke="${W}" stroke-opacity="0.7" stroke-width="6" fill="none" stroke-linecap="round"/>`) +
  (c.v === 2 ? `<ellipse cx="100" cy="168" rx="52" ry="8" fill="none" stroke="${lineColor(c, "s")}" stroke-width="3" stroke-opacity="0.6"/><ellipse cx="100" cy="168" rx="34" ry="5" fill="none" stroke="${lineColor(c, "s")}" stroke-width="3" stroke-opacity="0.8"/>` : "") +
  dot(c, 150, 62, 8, "s") + dot(c, 48, 76, 6, "t") + dot(c, 160, 130, 5, "t");

const shield: Draw = (c) =>
  back(c) +
  shadow(c, 100, 172, 40) +
  (c.v === 1 ? `<path d="M100 34 L154 54 V100 C154 136 130 158 100 168 C70 158 46 136 46 100 V54 Z" transform="rotate(10 100 100) translate(8 4)" ${paintDark(c, "t", 0.1)}/>` : "") +
  `<path d="M100 36 L152 54 V100 C152 134 128 156 100 166 C72 156 48 134 48 100 V54 Z" ${paint(c, "p")}/>` +
  `<path d="M100 54 L136 66 V100 C136 124 120 140 100 148 C80 140 64 124 64 100 V66 Z" ${paint(c, "s", { soft: 0.3 })}/>` +
  shine(c, "M60 64 L98 50 V62 L68 74 Z") +
  `<path d="M82 102 L96 116 L122 86" stroke="${c.style === "line" ? lineColor(c, "p") : W}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
  (c.v === 2 ? spark(c, 156, 44, 12, "t") + spark(c, 44, 140, 8, "s") : dot(c, 160, 138, 6, "t") + dot(c, 44, 60, 5, "s"));

const leaf: Draw = (c) =>
  back(c) +
  shadow(c, 100, 168, 40) +
  `<path d="M52 128 C32 104 40 72 70 62 C82 90 78 116 52 128 Z" ${paint(c, c.v === 1 ? "p" : "s")}/>` +
  `<path d="M58 154 C44 98 82 54 150 44 C158 100 124 148 58 154 Z" ${paint(c, c.v === 1 ? "s" : "p")}/>` +
  `<path d="M62 150 C86 112 114 80 146 50" stroke="${c.style === "line" ? lineColor(c, "p") : W}" stroke-opacity="0.65" stroke-width="4" fill="none" stroke-linecap="round"/>` +
  shine(c, "M70 100 C80 80 100 64 126 54 C104 70 86 86 70 100 Z") +
  dot(c, 160, 130, 7, "t") + dot(c, 150, 150, 4, "s") + (c.v === 2 ? spark(c, 44, 52, 10, "t") : "");

const flask: Draw = (c) =>
  back(c) +
  shadow(c, 100, 168, 44) +
  `<path d="M82 42 H118 V84 L152 140 C158 152 150 164 138 164 H62 C50 164 42 152 48 140 L82 84 Z" ${paint(c, "t", { soft: 0.14 })}/>` +
  `<path d="M62 128 H138 L152 140 C158 152 150 164 138 164 H62 C50 164 42 152 48 140 Z" ${paint(c, "p")}/>` +
  `<rect x="74" y="34" width="52" height="10" rx="5" ${paint(c, "s")}/>` +
  shine(c, "M84 50 H92 V86 L62 138 L58 134 L84 86 Z") +
  `<circle cx="96" cy="146" r="5" fill="${W}" fill-opacity="0.7"/><circle cx="114" cy="138" r="3.5" fill="${W}" fill-opacity="0.7"/><circle cx="106" cy="154" r="3" fill="${W}" fill-opacity="0.6"/>` +
  (c.v === 1 ? `<circle cx="136" cy="62" r="10" ${paint(c, "s", { soft: 0.3 })}/>` : "") + dot(c, 150, 96, 6, "s") + dot(c, 48, 90, 5, "t");

function layer(c: Ctx, cy: number, role: "p" | "s" | "t"): string {
  const top = `M100 ${cy - 26} L152 ${cy} L100 ${cy + 26} L48 ${cy} Z`;
  return `<path d="M48 ${cy} L100 ${cy + 26} L100 ${cy + 38} L48 ${cy + 12} Z" ${paintDark(c, role, 0.26)}/><path d="M152 ${cy} L100 ${cy + 26} L100 ${cy + 38} L152 ${cy + 12} Z" ${paintDark(c, role, 0.14)}/><path d="${top}" ${paint(c, role)}/>`;
}
const layers: Draw = (c) =>
  back(c) +
  shadow(c, 100, 170, 52) +
  layer(c, 130, "t") + layer(c, 98, "s") + layer(c, c.v === 2 ? 62 : 66, "p") +
  shine(c, "M62 66 L100 46 L100 52 L70 68 Z") + spark(c, 156, 40, 10, "s") + dot(c, 44, 44, 5, "t");

const sparkle: Draw = (c) =>
  back(c) +
  shadow(c, 100, 172, 30) +
  `<path d="M100 32 C104 74 112 90 154 100 C112 110 104 126 100 168 C96 126 88 110 46 100 C88 90 96 74 100 32 Z" ${paint(c, "p")}/>` +
  shine(c, "M100 44 C101 70 104 82 116 92 C104 84 98 70 100 44 Z") +
  spark(c, 152, 50, 18, "s") + spark(c, 52, 148, 14, "t") + (c.v === 1 ? spark(c, 48, 52, 9, "s") : dot(c, 158, 146, 6, "t"));

const wind: Draw = (c) => {
  const sw = c.style === "line" ? 6 : 10;
  const col = (r: "p" | "s" | "t") => lineColor(c, r);
  return (
    back(c) +
    `<path d="M36 82 H112 C136 82 136 52 114 52" stroke="${col("p")}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>` +
    `<path d="M36 108 H142 C170 108 170 142 144 142" stroke="${col("s")}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>` +
    `<path d="M36 134 H90 C108 134 108 158 92 158" stroke="${col("t")}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>` +
    (c.style === "line" ? "" : `<path d="M44 78 H100" stroke="${W}" stroke-opacity="0.5" stroke-width="3" fill="none" stroke-linecap="round"/>`) +
    dot(c, 160, 66, 7, "s") + dot(c, 156, 86, 4, "t") + (c.v === 2 ? spark(c, 56, 50, 9, "t") : dot(c, 60, 52, 5, "p"))
  );
};

const clock: Draw = (c) => {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const r1 = i % 3 === 0 ? 32 : 36;
    const r2 = 40;
    return `<line x1="${(100 + Math.sin(a) * r1).toFixed(1)}" y1="${(104 - Math.cos(a) * r1).toFixed(1)}" x2="${(100 + Math.sin(a) * r2).toFixed(1)}" y2="${(104 - Math.cos(a) * r2).toFixed(1)}" stroke="${lineColor(c, "s")}" stroke-width="3" stroke-linecap="round"/>`;
  }).join("");
  return (
    back(c) +
    shadow(c, 100, 170, 46) +
    `<circle cx="100" cy="104" r="56" ${paint(c, "p")}/>` +
    `<circle cx="100" cy="104" r="45" fill="${W}" fill-opacity="${c.style === "line" ? 0.6 : 0.95}"/>` +
    ticks +
    `<line x1="100" y1="104" x2="100" y2="74" stroke="${lineColor(c, "s")}" stroke-width="6" stroke-linecap="round"/><line x1="100" y1="104" x2="${c.v === 1 ? 74 : 124}" y2="${c.v === 1 ? 118 : 116}" stroke="${lineColor(c, "p")}" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="104" r="5" fill="${lineColor(c, "s")}"/>` +
    shine(c, "M62 84 C68 66 84 54 102 50 C86 58 74 70 68 88 Z") +
    `<rect x="92" y="36" width="16" height="9" rx="3" ${paint(c, "s")}/>` + dot(c, 158, 52, 7, "t") + dot(c, 46, 62, 5, "s")
  );
};

const tape: Draw = (c) => {
  const ticks = Array.from({ length: 8 }, (_, i) => `<line x1="${104 + i * 11}" y1="94" x2="${104 + i * 11}" y2="${i % 2 ? 102 : 106}" stroke="${c.style === "line" ? lineColor(c, "s") : W}" stroke-width="2.5" stroke-linecap="round"/>`).join("");
  return (
    back(c) +
    shadow(c, 100, 160, 62) +
    `<g transform="rotate(${c.v === 1 ? -10 : c.v === 2 ? 8 : 0} 100 110)">` +
    `<rect x="84" y="92" width="92" height="30" rx="4" ${paint(c, "s")}/>` + ticks +
    `<circle cx="84" cy="108" r="46" ${paint(c, "p")}/><circle cx="84" cy="108" r="26" ${paint(c, "t", { soft: 0.3 })}/><circle cx="84" cy="108" r="9" fill="${W}" fill-opacity="0.9"/>` +
    shine(c, "M50 96 C54 76 70 66 88 64 C72 70 62 82 58 100 Z") +
    `</g>` + dot(c, 154, 58, 7, "t") + dot(c, 40, 60, 5, "s")
  );
};

const hanger: Draw = (c) =>
  back(c) +
  shadow(c, 100, 168, 52) +
  `<path d="M66 118 H134 L150 166 H50 Z" ${paint(c, "s", { soft: 0.22 })}/>` +
  `<path d="M100 72 L156 116 C162 121 158 130 150 130 H50 C42 130 38 121 44 116 Z" ${paint(c, "p")}/>` +
  `<path d="M100 72 C100 60 116 56 120 46 C124 34 104 28 98 40" stroke="${lineColor(c, "p")}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
  shine(c, "M52 118 L96 82 L98 90 L64 122 Z") + dot(c, 156, 60, 6, "t") + (c.v === 2 ? spark(c, 44, 56, 10, "s") : dot(c, 46, 70, 5, "s"));

const weave: Draw = (c) => {
  let g = "";
  const x0 = 44, y0 = 48, step = 24;
  for (let i = 0; i < 5; i += 1) g += `<rect x="${x0}" y="${y0 + i * step}" width="${step * 5 - 8}" height="15" rx="4" ${paint(c, "p")}/>`;
  for (let j = 0; j < 5; j += 1) for (let i = 0; i < 5; i += 1) if ((i + j + (c.v === 1 ? 1 : 0)) % 2 === 0) g += `<rect x="${x0 + j * step}" y="${y0 + i * step - 4}" width="15" height="${step - 2}" rx="4" ${paint(c, "s")}/>`;
  return back(c) + shadow(c, 100, 172, 56) + g + dot(c, 160, 44, 7, "t") + dot(c, 44, 150, 6, "t");
};

const wave: Draw = (c) => {
  const sw = c.style === "line" ? 6 : 11;
  const w = (y: number, r: "p" | "s" | "t") => `<path d="M30 ${y} q17 -20 34 0 t34 0 t34 0 t34 0" stroke="${lineColor(c, r)}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
  return back(c) + w(78, "p") + w(106, "s") + w(134, "t") + `<circle cx="152" cy="54" r="9" ${paint(c, "s", { soft: 0.3 })}/><circle cx="46" cy="60" r="6" ${paint(c, "t", { soft: 0.3 })}/><circle cx="164" cy="150" r="5" ${paint(c, "p", { soft: 0.3 })}/>` + (c.v === 2 ? spark(c, 58, 152, 9, "s") : "");
};

const box: Draw = (c) =>
  back(c) +
  shadow(c, 104, 168, 56) +
  `<path d="M48 80 L100 106 L100 162 L48 136 Z" ${paintDark(c, "p", 0.18)}/>` +
  `<path d="M152 80 L100 106 L100 162 L152 136 Z" ${paintDark(c, "p", 0.34)}/>` +
  `<path d="M100 54 L152 80 L100 106 L48 80 Z" ${paint(c, "s")}/>` +
  `<path d="M86 61 L138 87 L124 94 L72 68 Z" fill="${W}" fill-opacity="${c.style === "line" ? 0.5 : 0.55}"/>` +
  shine(c, "M54 84 L96 106 L96 112 L54 90 Z") + (c.v === 1 ? spark(c, 156, 44, 11, "t") : dot(c, 158, 48, 7, "t")) + dot(c, 42, 56, 5, "s");

const check: Draw = (c) =>
  back(c) +
  shadow(c, 100, 172, 44) +
  `<circle cx="100" cy="100" r="68" fill="none" stroke="${lineColor(c, "s")}" stroke-width="3" stroke-opacity="0.6" stroke-dasharray="3 9" stroke-linecap="round"/>` +
  `<circle cx="100" cy="100" r="52" ${paint(c, "p")}/>` +
  shine(c, "M62 84 C68 66 84 54 102 50 C86 58 74 70 68 88 Z") +
  `<path d="M76 102 L94 120 L126 82" stroke="${c.style === "line" ? lineColor(c, "p") : W}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
  spark(c, 160, 48, 12, "t") + dot(c, 42, 150, 6, "s") + (c.v === 2 ? dot(c, 164, 146, 6, "t") : "");

const bag: Draw = (c) =>
  back(c) +
  shadow(c, 102, 168, 50) +
  `<path d="M78 86 V72 C78 44 124 44 124 72 V86" stroke="${lineColor(c, "s")}" stroke-width="8" fill="none" stroke-linecap="round"/>` +
  `<path d="M50 84 H152 L160 162 H42 Z" ${paint(c, "p")}/>` +
  `<rect x="${c.v === 1 ? 104 : 66}" y="116" width="44" height="30" rx="6" ${paint(c, "s", { soft: 0.3 })}/>` +
  shine(c, "M56 90 H92 L88 98 H58 Z") + dot(c, 162, 60, 7, "t") + (c.v === 2 ? spark(c, 42, 52, 10, "s") : dot(c, 44, 66, 5, "s"));

const DRAW: Record<IllustId, Draw> = { drop, shield, leaf, flask, layers, sparkle, wind, clock, tape, hanger, weave, wave, box, check, bag };

/** 일러스트 SVG 문자열 — 같은 (id, style, colors, variant, key)면 항상 같은 문자열이라 라이브·export·PNG가 같다 */
export function illustrationSvg(id: IllustId, style: IllustStyle, colors: IllustColors, variant: number, key = ""): string {
  const c = makeCtx(style, colors, variant, `${id}|${key}`);
  const body = DRAW[id](c);
  return wrapSvg(c, body);
}
