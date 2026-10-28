/**
 * 468차 V5 — 구도 부품(변형이 직접 쓴다). 467차는 후처리 레이어로 장식을 얹었지만 본문 구도는 "가운데 컬럼에 박스 쌓기"로 남았다.
 * 여기 부품은 변형 안에서 구도 자체를 바꾼다: 풀블리드(섹션 가장자리까지)·좌우 비대칭(열 폭 불일치)·겹침(음수 마진)·엇갈림(translate).
 * 안전: 가로 음수 마진은 섹션 패딩(24px) 안에서만(`BLEED` = 24) → 섹션 바깥으로 나가지 않는다. 글 상자는 사진 위(z-index 2). 새 글자 없음 — 호출부가 넘긴 마크업만 배치한다.
 * 가격·규정·구매 버튼은 이 부품을 쓰지 않는다(touch·고지·구매 카드 제외). 모든 부품은 V5 켜짐에서 `v5-parts`를 거쳐서만 호출된다.
 */
import { depthShadow, hairline, type V4Palette } from "@/lib/palette-v4";
import { hexToRgba } from "@/lib/design-tokens";
import { esc } from "@/lib/type-treatments";

/** `wrap`의 섹션 좌우 패딩(px). 풀블리드 음수 마진은 이 값을 넘지 않는다 */
export const BLEED = 24;

type Img = { url: string; pos?: string };
const frame = (im: Img, alt: string, ar: string, extra: string, p: V4Palette): string =>
  `<div style="position:relative;aspect-ratio:${ar};overflow:hidden;background:${p.tints[1]};${extra}"><img src="${esc(im.url)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;object-position:${im.pos ?? "50% 45%"}"/></div>`;

/** 576 내용 열의 왼쪽 시작선(섹션이 더 넓으면 가운데 정렬 열에 맞춘다) */
const SIDE = "max(24px,calc(50% - 288px))";

/** 흰 카드(글 상자) 공통 면 */
export const cardFace = (p: V4Palette, shadow: "soft" | "float" = "float"): string => `background:#FFFFFF;border:${hairline(p.ink)};box-shadow:${depthShadow(shadow, p.ink)}`;

/**
 * 풀블리드 사진 + 걸친 글 카드: 사진은 섹션 가장자리까지(좌우 -24px), 카드는 사진 아래쪽에 걸쳐(-52px) 한쪽(side)으로 치우친다.
 * 카드 좌우 마진이 달라(36/12px) 좌우 비대칭이기도 하다. 사진이 없으면 호출하지 않는다.
 */
export function bleedPhoto(im: Img, alt: string, cardInner: string, p: V4Palette, o: { side?: "left" | "right"; ar?: string } = {}): string {
  const left = (o.side ?? "left") === "left";
  return (
    `<div style="margin:0 -${BLEED}px">${frame(im, alt, o.ar ?? "16 / 10", "", p)}</div>` +
    `<div style="position:relative;z-index:2;max-width:576px;margin:0 auto"><div style="box-sizing:border-box;margin:-52px ${left ? 12 : 36}px 0 ${left ? 36 : 12}px;padding:20px 18px;border-radius:16px;${cardFace(p)}">${cardInner}</div></div>`
  );
}

/**
 * 엇갈린 2열: 사진 58%(세로 4:5) + 글 칸 42%. 글 카드가 사진 쪽으로 6% 걸치고(음수 마진) 칸 아래쪽에 붙어(align-self:flex-end) 높이가 어긋난다.
 * 좁은 폭에서도 줄바꿈하지 않는다(min-width:0 + overflow-wrap:anywhere) — 열 폭 불일치는 유지된다.
 */
export function splitAsym(im: Img, alt: string, textInner: string, p: V4Palette, o: { flip?: boolean } = {}): string {
  const photo = `<div style="flex:0 0 58%;min-width:0">${frame(im, alt, "4 / 5", "border-radius:12px", p)}</div>`;
  const text = `<div style="flex:1 1 0%;min-width:0;align-self:flex-end;position:relative;z-index:2;box-sizing:border-box;margin:0 ${o.flip ? "-6%" : "0"} -14px ${o.flip ? "0" : "-6%"};padding:14px 12px;border-radius:12px;overflow-wrap:anywhere;${cardFace(p)}">${textInner}</div>`;
  return `<div style="display:flex;align-items:stretch;padding-bottom:14px;min-width:0;${o.flip ? "flex-direction:row-reverse" : ""}">${photo}${text}</div>`;
}

/**
 * 엇갈린 카드 그리드: 카드를 두 열에 번갈아 담고 오른쪽 열을 drop px 내린다(translateY). 두 열 폭은 같지만 시작 높이가 달라 가로선이 어긋난다.
 * 내린 만큼 바닥 여백을 둔다(다음 섹션과 겹치지 않게).
 */
export function staggerGrid(cards: string[], o: { drop?: number; gap?: number } = {}): string {
  const drop = o.drop ?? 28;
  const gap = o.gap ?? 12;
  const colA = cards.filter((_, i) => i % 2 === 0);
  const colB = cards.filter((_, i) => i % 2 === 1);
  const col = (list: string[], extra = "") => `<div style="flex:1 1 0%;min-width:0;display:flex;flex-direction:column;gap:${gap}px;${extra}">${list.join("")}</div>`;
  return `<div style="display:flex;gap:${gap}px;align-items:flex-start;padding-bottom:${drop}px">${col(colA)}${col(colB, `transform:translateY(${drop}px)`)}</div>`;
}

/**
 * 튀어나온 큰 문장: 입력 문장을 섹션 가장자리까지 번지는 띠 위에 크게. 띠는 좌우 -24px(풀블리드), 글은 한쪽(side)에 몰려 반대편은 비워 둔다.
 * `size`는 호출부가 글자 수로 맞춘다(fitTitlePx). 큰따옴표 기호는 장식(aria-hidden).
 */
export function pullOut(text: string, p: V4Palette, o: { size: number; side?: "left" | "right"; ink: string; mark?: string }): string {
  const left = (o.side ?? "left") === "left";
  const mark = o.mark ? `<span aria-hidden="true" style="position:absolute;${left ? "right:18px" : "left:18px"};top:-4px;font-size:96px;line-height:1;font-weight:900;color:${hexToRgba(p.deep, 0.14)};pointer-events:none">${o.mark}</span>` : "";
  return `<div style="position:relative;margin:0 -${BLEED}px;padding:28px ${left ? "56px" : SIDE} 28px ${left ? SIDE : "56px"};background:${p.tints[0]};overflow:hidden">${mark}<p style="position:relative;margin:0;font-size:${o.size}px;line-height:1.28;font-weight:800;letter-spacing:-0.02em;color:${o.ink};word-break:keep-all;overflow-wrap:anywhere">${esc(text)}</p></div>`;
}

/**
 * 좌우로 엇갈리는 카드 쌓기: 카드마다 한쪽에 몰린다(짝수=왼쪽 정렬·오른쪽 inset px 비움, 홀수=반대). 같은 폭이 아니라 offset 마진 차 ≥ 20px.
 */
export function offsetStack(cards: string[], o: { inset?: number; gap?: number } = {}): string {
  const inset = o.inset ?? 32;
  const gap = o.gap ?? 12;
  return `<div style="display:flex;flex-direction:column;gap:${gap}px">${cards.map((c, i) => `<div style="min-width:0;margin:0 ${i % 2 ? 0 : inset}px 0 ${i % 2 ? inset : 0}px">${c}</div>`).join("")}</div>`;
}

/** 큰 번호가 한쪽에 걸려 글 블록을 밀어내는 구도: 번호 칸(고정 폭)은 반대편 여백으로 -12px 걸치고 글 칸이 남은 폭을 쓴다. flip=오른쪽 번호 */
export function heroNumber(numHtml: string, textHtml: string, o: { flip?: boolean; w?: number } = {}): string {
  const w = o.w ?? 84;
  return `<div style="display:flex;align-items:flex-start;gap:12px;${o.flip ? "flex-direction:row-reverse" : ""}"><div style="flex:0 0 ${w}px;min-width:0;margin:0 ${o.flip ? "-8px" : "0"} 0 ${o.flip ? "0" : "-8px"}">${numHtml}</div><div style="flex:1 1 0%;min-width:0">${textHtml}</div></div>`;
}

/**
 * 크기·각도가 다른 사진 덱(2~3장): 큰 사진을 바닥에 두고 작은 사진이 모서리를 덮는다. 각 장은 서로 다른 반경·기울기. 래퍼 overflow:hidden.
 * 폴라로이드(467차)와 달리 흰 테두리 없는 직사각 컷이 겹친다.
 */
export function layerDeck(imgs: Img[], alt: string, p: V4Palette, o: { flip?: boolean } = {}): string {
  const list = imgs.filter((x) => x?.url).slice(0, 3);
  if (list.length < 2) return "";
  const side = o.flip ? "right" : "left";
  const other = o.flip ? "left" : "right";
  const big = `<div style="width:72%;margin-${side}:0">${frame(list[0]!, alt, "4 / 5", "border-radius:16px", p)}</div>`;
  const mid = `<div style="position:absolute;${other}:0;top:12%;width:46%;transform:rotate(${o.flip ? -3 : 3}deg);box-shadow:${depthShadow("float", p.ink)};border-radius:10px;overflow:hidden">${frame(list[1]!, alt, "1 / 1", "", p)}</div>`;
  const small = list[2] ? `<div style="position:absolute;${other}:6%;bottom:2%;width:36%;transform:rotate(${o.flip ? 4 : -4}deg);border:4px solid #FFFFFF;border-radius:10px;overflow:hidden;box-shadow:${depthShadow("soft", p.ink)}">${frame(list[2], alt, "3 / 4", "", p)}</div>` : "";
  return `<div data-pz-dyn-clip style="position:relative;overflow:hidden;padding:6px 4px 14px">${big}${mid}${small}</div>`;
}
