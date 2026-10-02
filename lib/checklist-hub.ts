/**
 * 체크리스트 3~4개를 제품 원형 사진 둘레에 배치하는 허브 다이어그램 좌표(0~100 정사각 기준).
 * 라이브(DetailSectionRenderer)와 export가 같은 좌표를 쓴다.
 */
export type ChecklistHubNode = {
  /** 라벨 중심 */
  x: number;
  y: number;
  /** 연결선 시작(라벨 쪽) / 끝(원 테두리) */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type ChecklistHubLayout = {
  cx: number;
  cy: number;
  r: number;
  nodes: ChecklistHubNode[];
};

export const CHECKLIST_HUB_MAX_CHARS = 16;
/** 라벨 박스 폭(%) */
export const CHECKLIST_HUB_LABEL_W = 38;

export function isChecklistHubEligible(
  items: string[],
  opts: { flat: boolean; compactFollow: boolean; boldBlock: boolean; hasImage: boolean },
): boolean {
  if (!opts.flat || opts.compactFollow || opts.boldBlock || !opts.hasImage) return false;
  if (items.length !== 3 && items.length !== 4) return false;
  return items.every((item) => {
    const t = item.trim();
    return t.length > 0 && t.length <= CHECKLIST_HUB_MAX_CHARS;
  });
}

function node(cx: number, cy: number, r: number, x: number, y: number, gap: number): ChecklistHubNode {
  const dx = x - cx;
  const dy = y - cy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const round = (v: number) => Math.round(v * 10) / 10;
  return {
    x,
    y,
    x1: round(x - ux * gap),
    y1: round(y - uy * gap),
    x2: round(cx + ux * (r + 2.5)),
    y2: round(cy + uy * (r + 2.5)),
  };
}

export function checklistHubLayout(count: number): ChecklistHubLayout {
  if (count === 3) {
    const cx = 50;
    const cy = 52;
    const r = 25;
    return {
      cx,
      cy,
      r,
      nodes: [node(cx, cy, r, 50, 9, 9), node(cx, cy, r, 19, 89, 12), node(cx, cy, r, 81, 89, 12)],
    };
  }
  const cx = 50;
  const cy = 50;
  const r = 25;
  return {
    cx,
    cy,
    r,
    nodes: [
      node(cx, cy, r, 19, 11, 12),
      node(cx, cy, r, 81, 11, 12),
      node(cx, cy, r, 19, 89, 12),
      node(cx, cy, r, 81, 89, 12),
    ],
  };
}
