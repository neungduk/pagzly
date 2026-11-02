/**
 * 473차 D — checklist 기본 그리드(hub·pain bubble 제외)의 V5 레이아웃 모드.
 * 라이브·export가 같은 모드 표를 읽고, DOM만 각자 그린다(비교 정책·수치 게이트 비변경).
 * 새 카피 없음. designV5On()일 때만 호출한다.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import { BODY_SIG } from "@/lib/body-sig-v5";

/** 2열 카드 / 가로 칩 / 계단형 — BODY_SIG.list에 맞춘 일반 checklist 분기 */
export type ChecklistV5Mode = "cards2" | "chips" | "stair" | "rows";

export function checklistV5Mode(id: ArchetypeId): ChecklistV5Mode {
  const list = BODY_SIG[id].list;
  if (list === "chip") return "chips";
  if (list === "stair" || list === "timeline") return "stair";
  if (list === "rows" || list === "bento") return "rows";
  return "cards2";
}

/** export용 — 항목 배열 → ul 내부 HTML(아이콘·문구는 호출측이 이미 이스케이프한 조각을 넘긴다) */
export function checklistV5ItemsInnerHtml(
  mode: ChecklistV5Mode,
  cells: Array<{ iconHtml: string; textHtml: string; border: string; background: string; fg: string }>,
): { ulStyle: string; itemsHtml: string } {
  if (mode === "chips") {
    const itemsHtml = cells
      .map(
        (c) =>
          `<li style="display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;border:${c.border};background:${c.background};color:${c.fg};font-size:14px;font-weight:600;line-height:1.35;word-break:keep-all">${c.iconHtml}${c.textHtml}</li>`,
      )
      .join("");
    return { ulStyle: "list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:10px;justify-content:center", itemsHtml };
  }
  if (mode === "stair") {
    const itemsHtml = cells
      .map(
        (c, i) =>
          `<li style="display:flex;align-items:flex-start;gap:12px;margin-left:${i * 14}px;padding:14px 16px;border-radius:14px;border:${c.border};background:${c.background};color:${c.fg};font-size:15px;font-weight:600;line-height:1.4;word-break:keep-all">${c.iconHtml}<span style="flex:1 1 0%;min-width:0">${c.textHtml}</span></li>`,
      )
      .join("");
    return { ulStyle: "list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px", itemsHtml };
  }
  if (mode === "rows") {
    const itemsHtml = cells
      .map(
        (c) =>
          `<li style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;border:${c.border};background:${c.background};color:${c.fg};font-size:15px;font-weight:600;line-height:1.4;word-break:keep-all;text-align:left">${c.iconHtml}<span style="flex:1 1 0%;min-width:0">${c.textHtml}</span></li>`,
      )
      .join("");
    return { ulStyle: "list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:10px", itemsHtml };
  }
  // cards2 — 기존 2열 카드에 가깝게(호출측이 grid CSS를 덧붙일 수 있음)
  const itemsHtml = cells
    .map(
      (c) =>
        `<li style="text-align:center;font-size:15px;padding:20px 16px;border-radius:16px;border:${c.border};background:${c.background};color:${c.fg};font-weight:600;line-height:1.375;word-break:keep-all">${c.iconHtml}${c.textHtml}</li>`,
    )
    .join("");
  return { ulStyle: "list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:12px", itemsHtml };
}

/** 라이브용 — 모드별 ul/li 클래스·인라인 힌트 */
export function checklistV5LiveHints(mode: ChecklistV5Mode): {
  ulClass: string;
  liClass: string;
  stairOffsetPx: (i: number) => number;
  iconPlacement: "top" | "start";
} {
  switch (mode) {
    case "chips":
      return { ulClass: "relative mt-10 flex flex-wrap justify-center gap-2.5", liClass: "inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-[14px] font-semibold leading-snug [word-break:keep-all]", stairOffsetPx: () => 0, iconPlacement: "start" };
    case "stair":
      return { ulClass: "relative mt-10 flex flex-col gap-2.5", liClass: "flex items-start gap-3 rounded-[14px] border px-4 py-3.5 text-left text-[15px] font-semibold leading-snug [word-break:keep-all]", stairOffsetPx: (i) => i * 14, iconPlacement: "start" };
    case "rows":
      return { ulClass: "relative mt-10 grid grid-cols-2 gap-2.5", liClass: "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] font-semibold leading-snug [word-break:keep-all]", stairOffsetPx: () => 0, iconPlacement: "start" };
    default:
      return { ulClass: "relative mt-10 grid grid-cols-2 gap-x-4 gap-y-8", liClass: "flex flex-col items-center rounded-2xl border px-4 py-5 text-center text-[15px] font-semibold leading-snug [word-break:keep-all]", stairOffsetPx: () => 0, iconPlacement: "top" };
  }
}
