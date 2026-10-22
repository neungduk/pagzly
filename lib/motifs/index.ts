/**
 * 439차 2-2 — 그래픽 모티프 라이브러리(코드 SVG/CSS만, 외부 이미지 0, 모션 없음).
 * 팔레트 색으로 그리는 절차 생성 장식: 블롭(유기적 윤곽 8종)·파동 구분선·도트 그리드·사선 스트라이프·동심원·반원 아치·
 * 별/스파클·점선 연결선·스티커형 원형 배지(입력 문구만, 직선 글자)·리본/태그.
 *
 * 배치 규칙(안전 영역 — 좌표 모델로 회귀가 검사):
 *  - 모티프는 섹션의 위 또는 아래 경계에 붙는다(anchor top|bottom). offset은 경계에서 섹션 안쪽으로의 거리(음수면 경계를 넘어 이웃 섹션 위로 걸침).
 *  - 섹션 안으로 들어오는 깊이 = offset + 높이 ≤ SAFE_BAND_PX(40). v4 블록의 글 영역은 상하 여백(mood 적용 후 최소 41px) 안쪽에서 시작하므로 글과 겹치지 않는다.
 *  - 경계 밖(이웃 섹션)으로 넘어가는 깊이 = -offset ≤ CROSS_MAX_PX(20). 이웃 섹션의 글은 상하 여백(최소 24px) 안쪽이라 겹치지 않는다.
 *  - 좌우는 섹션 안(inset ≥0) — 가로 스크롤이 생기지 않게 한다.
 *  - 섹션당 최대 2개. 색은 옅은 틴트·보조색(알파 ≤0.5)이라 글 대비에 영향이 없고, 글 뒤에 깔리지 않는다.
 *  - 마크업에 data-pz-motif="id" data-mz="anchor:offset:높이"를 남겨 린터·회귀가 같은 좌표 모델로 다시 계산한다.
 * mood가 모티프 종류를 고른다: 미니멀=선·점, 팝=블롭·스파클, 클리닉=곡선·원, 스트리트=사선·리본, 내추럴=블롭·파동, 따뜻함=아치·도트.
 * 스티커 배지의 곡선 글자(textPath)는 PNG 캡처(html-to-image)·마켓 HTML 편집기에서의 동작을 확인하지 못해 직선 글자로 고정했다.
 */
export type MotifId = "blob" | "wave" | "dots" | "stripes" | "rings" | "arch" | "sparkle" | "connector" | "sticker" | "ribbon";
export const MOTIF_IDS: readonly MotifId[] = ["blob", "wave", "dots", "stripes", "rings", "arch", "sparkle", "connector", "sticker", "ribbon"];

export const SAFE_BAND_PX = 40;
export const CROSS_MAX_PX = 20;
export const MAX_MOTIFS_PER_SECTION = 2;

export type MotifColors = { a: string; b: string; c: string };
export type MotifPlacement = { id: MotifId; anchor: "top" | "bottom"; side: "left" | "right" | "center"; /** 경계에서 안쪽으로(px, 음수=경계 밖으로 걸침) */ offset: number; /** 좌우 가장자리에서(px, 음수=밖으로 걸침) */ inset: number; w: number; h: number; variant: number };

/** 섹션 안으로 들어오는 깊이(px) */
export const intrusion = (p: Pick<MotifPlacement, "offset" | "h">): number => Math.max(0, p.offset + p.h);
export const isSafe = (p: Pick<MotifPlacement, "offset" | "h"> & { inset?: number }): boolean => intrusion(p) <= SAFE_BAND_PX && -p.offset <= CROSS_MAX_PX && (p.inset ?? 0) >= 0;

/** mood → 모티프 후보(앞쪽이 우선) */
export const MOOD_MOTIFS: Record<string, MotifId[]> = {
  "minimal-luxe": ["connector", "dots", "rings"],
  clinic: ["rings", "wave", "dots"],
  natural: ["blob", "wave", "arch"],
  playful: ["blob", "sparkle", "dots"],
  street: ["stripes", "ribbon", "sparkle"],
  warm: ["arch", "dots", "blob"],
};
const DEFAULT_MOTIFS: MotifId[] = ["dots", "rings", "wave"];
export const motifsForMood = (mood: string | null | undefined): MotifId[] => (mood && MOOD_MOTIFS[mood]) || DEFAULT_MOTIFS;

/** 블롭 윤곽 8종(100×100 상자, 닫힌 3차 베지어) */
const BLOBS = [
  "M50 4C72 4 94 20 95 46C96 72 76 96 50 96C24 96 5 76 5 50C5 24 28 4 50 4Z",
  "M56 6C80 10 98 30 92 56C86 82 64 98 40 92C16 86 2 64 8 40C14 16 32 2 56 6Z",
  "M46 5C66 2 90 14 94 38C98 62 86 90 60 95C34 100 8 84 5 58C2 32 26 8 46 5Z",
  "M52 8C74 6 96 26 94 50C92 74 80 94 54 94C28 94 10 80 6 56C2 32 30 10 52 8Z",
  "M40 6C62 0 92 12 96 40C100 68 78 96 50 94C22 92 2 72 4 46C6 20 18 12 40 6Z",
  "M60 4C84 10 98 36 92 60C86 84 58 100 34 92C10 84 0 58 8 34C16 10 36 -2 60 4Z",
  "M48 3C70 5 88 22 96 44C104 66 82 94 54 97C26 100 4 80 4 52C4 24 26 1 48 3Z",
  "M54 5C78 3 94 28 94 52C94 76 72 98 46 95C20 92 4 70 6 46C8 22 30 7 54 5Z",
];

const svgOpen = (w: number, h: number, vb: string) => `<svg viewBox="${vb}" width="${w}" height="${h}" aria-hidden="true" focusable="false" style="display:block;overflow:visible">`;

/** 모티프 SVG(크기 w×h, 색은 팔레트) */
export function motifSvg(id: MotifId, w: number, h: number, c: MotifColors, variant = 0, text = ""): string {
  switch (id) {
    case "blob":
      return `${svgOpen(w, h, "0 0 100 100")}<path d="${BLOBS[variant % BLOBS.length]}" fill="${c.a}" fill-opacity="0.5"/></svg>`;
    case "wave": {
      const amp = 6 + (variant % 3) * 2;
      return `${svgOpen(w, h, "0 0 120 24")}<path d="M0 12 Q15 ${12 - amp} 30 12 T60 12 T90 12 T120 12" fill="none" stroke="${c.b}" stroke-width="2.4" stroke-linecap="round" stroke-opacity="0.55"/></svg>`;
    }
    case "dots": {
      const cols = Math.max(2, Math.round(w / 12));
      const rows = Math.max(2, Math.round(h / 12));
      let d = "";
      for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) d += `<circle cx="${x * 12 + 4}" cy="${y * 12 + 4}" r="2"/>`;
      return `${svgOpen(w, h, `0 0 ${cols * 12} ${rows * 12}`)}<g fill="${c.b}" fill-opacity="0.45">${d}</g></svg>`;
    }
    case "stripes": {
      let d = "";
      for (let x = -40; x < 120; x += 12) d += `<path d="M${x} 40 L${x + 40} 0" />`;
      return `${svgOpen(w, h, "0 0 100 40")}<g stroke="${c.a}" stroke-width="5" stroke-opacity="0.5">${d}</g></svg>`;
    }
    case "rings":
      return `${svgOpen(w, h, "0 0 100 100")}<g fill="none" stroke="${c.b}" stroke-opacity="0.45" stroke-width="2"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="32"/><circle cx="50" cy="50" r="18"/></g></svg>`;
    case "arch":
      return `${svgOpen(w, h, "0 0 100 50")}<path d="M4 50 A46 46 0 0 1 96 50" fill="none" stroke="${c.a}" stroke-width="7" stroke-opacity="0.5" stroke-linecap="round"/></svg>`;
    case "sparkle":
      return `${svgOpen(w, h, "0 0 100 100")}<path d="M50 4 C54 38 62 46 96 50 C62 54 54 62 50 96 C46 62 38 54 4 50 C38 46 46 38 50 4Z" fill="${c.c}" fill-opacity="0.55"/></svg>`;
    case "connector":
      return `${svgOpen(w, h, "0 0 120 12")}<path d="M6 6 H114" stroke="${c.b}" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round" stroke-opacity="0.6"/><circle cx="6" cy="6" r="4" fill="${c.b}" fill-opacity="0.6"/><circle cx="114" cy="6" r="4" fill="${c.b}" fill-opacity="0.6"/></svg>`;
    case "ribbon":
      return `${svgOpen(w, h, "0 0 120 32")}<path d="M0 0 H120 L108 16 L120 32 H0 Z" fill="${c.a}" fill-opacity="0.5"/></svg>`;
    case "sticker":
      // 입력 문구만(직선 글자). 바탕은 진한 색(c.c)·글자 흰색 — 대비는 호출하는 쪽이 보정한 c.c를 넘긴다
      return `${svgOpen(w, h, "0 0 100 100")}<circle cx="50" cy="50" r="48" fill="${c.c}"/><circle cx="50" cy="50" r="41" fill="none" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="1.5" stroke-dasharray="3 4"/></svg>${text}`;
  }
}

/** 배치 하나의 HTML(절대 위치). 섹션 쪽이 position:relative여야 한다 */
export function motifHtml(p: MotifPlacement, c: MotifColors): string {
  const v = `${p.anchor}:${p.offset}:${p.h}`;
  const horiz = p.side === "center" ? `left:50%;margin-left:${-Math.round(p.w / 2)}px` : `${p.side}:${p.inset}px`;
  return `<span aria-hidden="true" data-pz-motif="${p.id}" data-mz="${v}" style="position:absolute;${p.anchor}:${p.offset}px;${horiz};width:${p.w}px;height:${p.h}px;pointer-events:none;z-index:0">${motifSvg(p.id, p.w, p.h, c, p.variant)}</span>`;
}

/** 크기 표(장식 종류별 w×h) */
const SIZE: Record<MotifId, [number, number]> = {
  blob: [56, 56], wave: [120, 24], dots: [60, 36], stripes: [80, 32], rings: [56, 56], arch: [72, 36], sparkle: [36, 36], connector: [120, 12], sticker: [56, 56], ribbon: [96, 26],
};

/**
 * 섹션 하나의 모티프 배치(결정적). seed로 종류·위치를 고르고, 안전 영역(SAFE_BAND_PX) 안에 들어오도록 offset을 정한다.
 * cross=true면 첫 모티프가 위 경계를 넘어 이웃 섹션 위로 걸친다(면 전환이 칼같이 끊기지 않게).
 */
export function planMotifs(mood: string | null | undefined, seed: number, opts: { count?: number; cross?: boolean } = {}): MotifPlacement[] {
  const ids = motifsForMood(mood);
  const n = Math.min(MAX_MOTIFS_PER_SECTION, opts.count ?? 1);
  const out: MotifPlacement[] = [];
  for (let k = 0; k < n; k += 1) {
    const id = ids[(seed + k) % ids.length]!;
    const [w, h] = SIZE[id];
    const anchor: "top" | "bottom" = k === 0 ? "top" : "bottom";
    const side: "left" | "right" = (seed + k) % 2 === 0 ? "right" : "left";
    // 걸침: 경계 밖으로 최대 CROSS_MAX_PX, 안쪽 깊이는 안전 영역 이하. 걸치지 않으면 경계 안쪽 여백 띠 안에 둔다
    const offset = k === 0 && opts.cross ? Math.max(-CROSS_MAX_PX, Math.min(-Math.round(h / 3), SAFE_BAND_PX - h)) : Math.max(-CROSS_MAX_PX, Math.min(12, SAFE_BAND_PX - h));
    out.push({ id, anchor, side, offset, inset: 8 + ((seed >> 2) % 3) * 6, w, h, variant: seed + k });
  }
  return out;
}

/** 마크업에서 모티프 좌표 표식(data-mz)을 읽는다 — 린터·회귀용 */
export function readMotifMarks(html: string): Array<{ id: string; anchor: string; offset: number; h: number }> {
  return [...html.matchAll(/data-pz-motif="([a-z]+)" data-mz="(top|bottom):(-?\d+):(\d+)"/g)].map((m) => ({ id: m[1]!, anchor: m[2]!, offset: Number(m[3]), h: Number(m[4]) }));
}
