/**
 * 469차 V5 — 사진 배경 정보 구간(`data-info`)을 아키타입에 묶는다. 정보 구간 CSS(`infoCss`·`designV2Css`)는 points를 항상 진한 면 + 어두운 카드 + 사진 스크림으로 칠해
 * 8종 아키타입이 모두 같은 짙은 덩어리를 가졌다(468차 배너 토큰은 일러스트 배너만 다뤘다). 여기서는 같은 선택자·`!important`로 **뒤에서 덮어쓴다**
 * (`archetypeCssV5`가 나가는 <style>이 두 CSS 뒤에 놓인다 — export 2471→2475, 라이브 6151→6152).
 *
 * 토큰 `infoBackdrop`:
 *  - `scrim-deep`  : 덮어쓰지 않는다(impact·pop — 의도된 진한 성격)
 *  - `scrim-light` : 밝은 틴트 스크림(알파는 기존 `scrimAlpha` 규칙으로 최악 검은 사진에서도 잉크 글자 5.5:1) + 흰 카드 + 잉크 글자 (editorial·luxe·catalog·techsheet)
 *  - `photo-plain` : 같은 구성에 스크림을 한 단계 옅게(사진이 더 비침; 카드가 불투명이라 글자 대비는 카드가 맡는다) (softlife·narrative)
 *  - `solid`       : 사진 URL이 없을 때(또는 실패 대비) 팔레트 틴트 면 — 밝은 성격은 사진이 없으면 모두 이 모양
 * 글자는 모두 잉크(#1B1B18)·진한 색(`c.deep`, 흰 종이 4.5:1 보장)·카드(불투명 흰색) 위. 새 글자 없음(번호는 기존 CSS counter).
 * V5 꺼짐·편집 모드에서는 호출되지 않는다(`archetypeCssV5`와 같은 자리).
 */
import type { InfoColors } from "@/lib/info-style";
import { safeBackdropUrl, scrimAlpha, type InfoBackdropMap } from "@/lib/info-backdrop";
import { hexToRgba, mixHex } from "@/lib/design-tokens";
import type { ArchetypeTokens } from "@/lib/page-archetype-v5";

const IMP = "!important";
const rule = (sel: string, decl: string): string => `${sel}{${decl.split(";").filter(Boolean).map((d) => `${d}${IMP}`).join(";")}}`;

/** 상품 정보 표(#pagzly-info) 구조: ledger = 라벨 칸/값 칸 가는 선 목록(editorial·luxe·techsheet), stack = 라벨 위·값 큼직한 카드 쌓기(그 외) */
const SPEC_LEDGER = new Set(["editorial", "luxe", "techsheet"]);

/**
 * 469차 V5 — 상품 정보(spec_table·nutrition_table, 앵커 #pagzly-info) 구조 재작성. DOM(표·썸네일·도식·칩)은 그대로 두고 표를 목록으로 다시 그린다 — 가는 표 8종 동일 → 아키타입별 두 구조.
 * 크기표·배송(size_table·shipping_info)은 id가 달라 건드리지 않는다(도식·고지). 입력 값 원문 그대로(CSS만). 글자는 값 16~17px·라벨 12px.
 */
export function specListCssV5(scope: string, t: ArchetypeTokens, c: InfoColors): string {
  const S = `${scope} #pagzly-info`;
  const ink = c.ink;
  const out: string[] = [rule(`${S} table,${S} tbody`, "display:block;width:100%")];
  if (SPEC_LEDGER.has(t.id)) {
    out.push(rule(`${S} tr`, `display:flex;align-items:baseline;gap:16px;padding:16px 6px;background:transparent;border-top:0;border-bottom:1px solid ${hexToRgba(ink, 0.16)}`));
    out.push(rule(`${S} th`, `flex:0 0 32%;width:auto;min-width:0;padding:0;background:transparent;font-size:12px;font-weight:700;letter-spacing:0.08em;color:${hexToRgba(ink, 0.66)};opacity:1`));
    out.push(rule(`${S} td`, `flex:1 1 0%;min-width:0;padding:0;font-size:16px;line-height:1.65;color:${ink};overflow-wrap:anywhere`));
  } else {
    const r = Math.round(14 * Math.max(0.4, t.radius));
    const shadow = t.shadow.kind === "hard" ? `${t.shadow.offset}px ${t.shadow.offset}px 0 ${ink}` : "none";
    out.push(rule(`${S} tr`, `display:block;margin:0 0 10px;padding:14px 18px;background:#FFFFFF;border:${t.border.w}px solid ${hexToRgba(ink, Math.min(0.5, 0.14 * t.border.alphaMul))};border-radius:${r}px;box-shadow:${shadow}`));
    out.push(rule(`${S} th`, `display:block;width:auto;padding:0 0 4px;background:transparent;font-size:12px;font-weight:700;letter-spacing:0.1em;color:${c.deep};opacity:1`));
    out.push(rule(`${S} td`, `display:block;padding:0;font-size:17px;font-weight:700;line-height:1.5;color:${ink};overflow-wrap:anywhere`));
  }
  return out.join("");
}

export function infoCssV5(scope: string, t: ArchetypeTokens, c: InfoColors, backdrops?: InfoBackdropMap): string {
  if (t.infoBackdrop === "scrim-deep") return specListCssV5(scope, t, c);
  const sec = (k: string) => `${scope} [data-info="${k}"]`;
  const ip = (k: string) => `[data-ip="${k}"]`;
  const ink = c.ink;
  const tint = mixHex("#FFFFFF", c.soft, 0.55);
  const out: string[] = [];

  // ── points: 진한 면 → 밝은 틴트(사진이 있으면 옅은 스크림 아래로 비침), 카드는 불투명 흰색 ──
  const url = safeBackdropUrl(backdrops?.points);
  const worst = scrimAlpha(tint, ink, "#000000", 5.5); // 검은 사진 최악에서도 잉크 5.5:1
  const a = t.infoBackdrop === "photo-plain" ? Math.max(0.72, worst) : Math.max(0.86, worst);
  const scrim = hexToRgba(tint, Math.min(0.96, a));
  const bg = url && t.infoBackdrop !== "solid" ? `linear-gradient(${scrim},${scrim}),url("${url}") center/cover no-repeat` : tint;
  const PG = `${sec("points")} ${ip("pgrid")}`;
  out.push(rule(sec("points"), `background:${bg};border-top-color:${c.accent}`));
  out.push(rule(`${sec("points")} .pagzly-display-headline,${sec("points")} .pagzly-display-headline span`, `color:${ink}`));
  out.push(rule(`${PG}>div`, `background:#FFFFFF;border:1px solid ${hexToRgba(ink, 0.14)};box-shadow:0 6px 18px ${hexToRgba(ink, 0.08)}`));
  out.push(`${PG}>div::before{color:${hexToRgba(ink, 0.62)}${IMP}}`);
  out.push(rule(`${PG}>div[data-em]`, `background:${c.deep};border:2px solid ${c.deep};box-shadow:0 10px 24px ${hexToRgba(ink, 0.22)}`));
  out.push(rule(`${PG}>div>p`, `color:${ink}`));
  out.push(rule(`${PG}>div>p:first-of-type`, `color:${c.deep}`));
  out.push(rule(`${PG}>div[data-em]>p`, `color:#FFFFFF`));
  out.push(rule(`${PG}>div[data-em]>p:first-of-type`, `color:#FFFFFF`));
  out.push(`${PG}>div[data-em]::before{color:rgba(255,255,255,0.85)${IMP}}`);
  out.push(`${PG}>div:not(:last-child)::after{color:${c.deep}${IMP}}`);

  // ── stat(혼방 막대): dramatic의 진한 면 → 소프트 면(infoCss 비-dramatic 경로와 같은 값) ──
  out.push(rule(sec("stat"), `background:${c.soft}`));
  out.push(rule(`${sec("stat")} .pagzly-display-headline,${sec("stat")} .pagzly-display-headline span`, `color:${ink}`));
  const BR = `${sec("stat")} ${ip("bars")}>div`;
  out.push(rule(`${BR}>div:first-child span:not(:last-child),${BR}>div:first-child>div span`, `color:${ink}`));
  out.push(rule(`${BR}>div:first-child>span:last-child>*`, `color:${ink}`));
  out.push(rule(`${BR}[data-top]>div:first-child>span:last-child>*`, `color:${c.deep}`));
  out.push(rule(`${BR}>div:nth-child(2)`, `background:rgba(27,27,24,0.12)`));
  out.push(rule(`${BR}>div:nth-child(2)>div`, `background:rgba(27,27,24,0.38)`));
  out.push(rule(`${BR}[data-top]>div:nth-child(2)>div`, `background:linear-gradient(90deg,${c.deep},${c.accent})`));
  out.push(rule(`${sec("stat")}>p`, `color:rgba(27,27,24,0.78)`));
  // 숫자 칸(statnum): 포인트색 면 → 기본 면 + 잉크 글자
  out.push(rule(sec("statnum"), `background:${c.base}`));
  out.push(rule(`${sec("statnum")} *`, `color:${ink}`)); // 기존 비-dramatic 경로는 진한 색(기본 면 위 2.6:1 테마가 있었다) → 잉크

  // ── steps 마지막 카드(dramatic 반전) → 다른 카드와 같은 흰 카드 ──
  const last = `${sec("steps")} ol>li:last-child`;
  out.push(rule(last, `background:#FFFFFF;border-left-color:${c.accent}`));
  out.push(rule(`${last}>div:first-child>span,${last}>span:first-child`, `color:${c.accent}`));
  out.push(rule(`${last}>div:last-child>p`, `color:${c.accent}`));
  out.push(rule(`${last}>div:last-child>span,${last}>div:last-child>span b[data-ip="lead"]`, `color:${ink}`));
  out.push(rule(`${last}>div:last-child>span b[data-ip="lead"]`, `color:${c.deep}`));
  out.push(specListCssV5(scope, t, c));
  return out.join("");
}
