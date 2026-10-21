/**
 * 419차 3-6 — 장면 이미지의 제품 실물 크기 스펙. 호출 없음(순수 함수, 생성 연결·비전 호출은 421차).
 *  - 입력: 판매자가 이미 쓰는 선택 입력 productSizeHint("35mL, 높이 약 9cm")를 파싱 → 비어 있으면 카테고리·용량 사전으로 추정.
 *    추정값이면 estimated=true로 슬롯 메타에 남긴다. 용량도 종류도 모르면 null(크기를 지어내지 않는다).
 *  - 프롬프트: 실제 치수 문장 + 장면별 비교 문장(제품 크기에서 계산). 420차에서 30mL 병이 얼굴·책상에 비해 지나치게 크게 나온 문제 대응.
 *  - 크기 게이트: 생성 결과에서 비전이 잰 병 높이·기준물 픽셀을 실제 비율과 비교(기본 ±35%). 밖이면 재생성 1회 → 그래도 실패면 폴백.
 */

export type ProductDimensions = {
  /** cm */
  heightCm: number;
  diameterCm?: number;
  volumeMl?: number;
  /** 사전 추정이면 true, 판매자 입력에서 읽었으면 false */
  estimated: boolean;
};

// ── 카테고리+용량 사전 (표 전문은 419차 보고서) ──
type Row = { maxMl: number; heightCm: number; diameterCm: number };
/** 병형(미스트·토너·에센스·세럼·앰플): 30mL≈10cm·3.3cm, 50mL≈13cm, 100mL≈16cm(사용자 제시). 35~40mL 줄은 사이값 보간 */
const BOTTLE_ROWS: readonly Row[] = [
  { maxMl: 15, heightCm: 7, diameterCm: 2.5 },
  { maxMl: 30, heightCm: 10, diameterCm: 3.3 },
  { maxMl: 40, heightCm: 11, diameterCm: 3.5 },
  { maxMl: 50, heightCm: 13, diameterCm: 4 },
  { maxMl: 100, heightCm: 16, diameterCm: 4.8 },
  { maxMl: 150, heightCm: 18, diameterCm: 5.5 },
  { maxMl: 200, heightCm: 20, diameterCm: 6 },
  { maxMl: 300, heightCm: 22, diameterCm: 6.5 },
  { maxMl: 9999, heightCm: 24, diameterCm: 7.5 },
];
/** 튜브형(핸드크림·선크림·클렌저) */
const TUBE_ROWS: readonly Row[] = [
  { maxMl: 30, heightCm: 10, diameterCm: 2.8 },
  { maxMl: 60, heightCm: 12, diameterCm: 3.2 },
  { maxMl: 100, heightCm: 15, diameterCm: 3.8 },
  { maxMl: 9999, heightCm: 18, diameterCm: 4.5 },
];
/** 자(크림) */
const JAR_ROWS: readonly Row[] = [
  { maxMl: 30, heightCm: 4, diameterCm: 5 },
  { maxMl: 60, heightCm: 5, diameterCm: 6 },
  { maxMl: 100, heightCm: 6, diameterCm: 7.5 },
  { maxMl: 9999, heightCm: 8, diameterCm: 9 },
];
/** 립·소형 스틱: 용량 무관 9~12cm 중간값 */
const LIP_ROW: Row = { maxMl: 9999, heightCm: 10, diameterCm: 1.8 };

export type SizeKind = "bottle" | "tube" | "jar" | "lip";
/** 상품명·제품 종류 텍스트에서 형태를 고른다. 못 고르면 null */
export function detectSizeKind(text: string | null | undefined): SizeKind | null {
  const t = text ?? "";
  if (/립|lip/i.test(t)) return "lip";
  if (/(핸드|선|클렌징|폼클렌저|클렌저|바디)?\s*(크림|젤|로션).*(튜브)|튜브|tube/i.test(t)) return "tube";
  if (/크림|밤|jar|패드/i.test(t) && !/미스트|토너|에센스|세럼|앰플|스킨|로션/i.test(t)) return "jar";
  if (/미스트|토너|에센스|세럼|앰플|스킨|로션|오일|mist|toner|essence|serum|ampoule/i.test(t)) return "bottle";
  return null;
}

function pickRow(rows: readonly Row[], ml: number): Row {
  return rows.find((r) => ml <= r.maxMl) ?? rows[rows.length - 1]!;
}

/** 사전 추정 — 종류와 용량을 둘 다 알 때만(립은 용량 불필요). 모르면 null */
export function estimateDimensions(kind: SizeKind | null, volumeMl: number | null | undefined): ProductDimensions | null {
  if (!kind) return null;
  if (kind === "lip") return { heightCm: LIP_ROW.heightCm, diameterCm: LIP_ROW.diameterCm, estimated: true };
  if (!volumeMl || !(volumeMl > 0)) return null;
  const rows = kind === "bottle" ? BOTTLE_ROWS : kind === "tube" ? TUBE_ROWS : JAR_ROWS;
  const r = pickRow(rows, volumeMl);
  return { heightCm: r.heightCm, diameterCm: r.diameterCm, volumeMl, estimated: true };
}

// ── 판매자 입력(productSizeHint) 파싱 ──
const toCm = (n: number, unit: string | undefined) => (unit && /^mm$/i.test(unit) ? n / 10 : n);
const SANE = (cm: number) => cm >= 1 && cm <= 60;

export function parseSizeHint(hint: string | null | undefined): { heightCm?: number; diameterCm?: number; volumeMl?: number } {
  const t = hint ?? "";
  const out: { heightCm?: number; diameterCm?: number; volumeMl?: number } = {};
  const vol = t.match(/(\d+(?:\.\d+)?)\s*(?:mL|ml|㎖|ML)/);
  if (vol) out.volumeMl = Number(vol[1]);
  const h = t.match(/(?:높이|키|길이|H|height)\s*[:=]?\s*(?:약\s*)?(\d+(?:\.\d+)?)\s*(cm|mm|센티)?/i);
  if (h) { const v = toCm(Number(h[1]), h[2]); if (SANE(v)) out.heightCm = v; }
  const d = t.match(/(?:지름|직경|폭|너비|Ø|φ|diameter|width)\s*[:=]?\s*(?:약\s*)?(\d+(?:\.\d+)?)\s*(cm|mm|센티)?/i);
  if (d) { const v = toCm(Number(d[1]), d[2]); if (SANE(v)) out.diameterCm = v; }
  return out;
}

/**
 * 최종 치수: 판매자가 높이를 적었으면 그 값(estimated=false), 아니면 사전 추정(estimated=true), 둘 다 안 되면 null.
 * kindText = 상품명·카테고리·제품 종류 텍스트(영어 제품 종류 말고 판매자 입력 원문에서 형태만 읽는다)
 */
export function resolveProductDimensions(input: { sizeHint?: string | null; kindText?: string | null; volumeMl?: number | null }): ProductDimensions | null {
  const p = parseSizeHint(input.sizeHint);
  const volumeMl = p.volumeMl ?? input.volumeMl ?? undefined;
  if (p.heightCm) return { heightCm: p.heightCm, ...(p.diameterCm ? { diameterCm: p.diameterCm } : {}), ...(volumeMl ? { volumeMl } : {}), estimated: false };
  const est = estimateDimensions(detectSizeKind(input.kindText), volumeMl);
  if (!est) return null;
  return { ...est, ...(p.diameterCm ? { diameterCm: p.diameterCm } : {}) };
}

// ── 프롬프트 문장 ──
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(1)));

/** "a small travel-size bottle about 10 cm tall and 3.3 cm wide" */
export function sizeSentence(d: ProductDimensions): string {
  const cls = d.heightCm <= 12 ? "a small travel-size" : d.heightCm <= 20 ? "a standard-size" : "a large full-size";
  const wide = d.diameterCm ? ` and ${fmt(d.diameterCm)} cm wide` : "";
  return `${cls} bottle about ${fmt(d.heightCm)} cm tall${wide}`;
}

/** 기준물 실제 길이(cm) — 크기 게이트와 비교 문장이 같은 값을 쓴다 */
export const REFERENCE_CM = { face: 20, hand: 18, notebook: 21, lipstick: 9, brushHandle: 16 } as const;
export type ReferenceKind = keyof typeof REFERENCE_CM | "bag";

const fraction = (r: number) => (r <= 0.38 ? "about a third of" : r <= 0.62 ? "about half" : r <= 0.8 ? "about two thirds of" : r <= 1.15 ? "about the same as" : "taller than");
/** "about half the height of her face…"처럼 문장 조각을 붙이기 쉽게 */
const frac = (r: number, what: string) => (r <= 0.62 && r > 0.38 ? `about half ${what}` : `${fraction(r)} ${what}`);

/** 장면 키별 비교 문장(제품 크기에서 계산). 키를 모르면 null */
export function comparisonSentence(slot: string, d: ProductDimensions): string | null {
  const h = d.heightCm;
  const small = h <= 12;
  switch (slot) {
    case "use-person":
      return small
        ? `${sizeSentence(d)}, ${frac(h / REFERENCE_CM.face, "the height of her face from chin to forehead")}, easily held in one hand with fingers wrapping most of the bottle, never larger than her hand`
        : `${sizeSentence(d)}, ${frac(h / REFERENCE_CM.face, "the height of her face from chin to forehead")}, held in one hand with a firm grip, roughly the length of her hand and wrist`;
    case "use-hand-mist":
      return `${sizeSentence(d)}, ${frac(h / REFERENCE_CM.hand, "the length of the hand holding it")}, the hand wraps around the bottle`;
    case "scene-desk":
      return small
        ? `${sizeSentence(d)}, ${frac(h / REFERENCE_CM.notebook, "the length of a standard A5 notebook")}, clearly smaller than the laptop keyboard width`
        : `${sizeSentence(d)}, ${frac(h / REFERENCE_CM.notebook, "the length of a standard A5 notebook")}, still shorter than the laptop screen`;
    case "scene-bag":
      return small
        ? `${sizeSentence(d)}, fits in a side pocket of a tote bag, a fraction of the bag's width`
        : `${sizeSentence(d)}, stands upright beside a tote bag, clearly shorter than the bag`;
    case "scene-vanity":
      return small
        ? `${sizeSentence(d)}, similar in height to a lipstick or makeup brush handle`
        : `${sizeSentence(d)}, about as tall as a makeup brush cup, not taller than the mirror`;
    default:
      return null;
  }
}

/** 슬롯 메타(세션 JSON sceneImages[slot].sizeMeta) — 추정값 사용 여부 기록 */
export type SceneSizeMeta = { heightCm: number; diameterCm?: number; estimated: boolean };
export const sizeMetaOf = (d: ProductDimensions | null | undefined): SceneSizeMeta | undefined =>
  d ? { heightCm: d.heightCm, ...(d.diameterCm ? { diameterCm: d.diameterCm } : {}), estimated: d.estimated } : undefined;

// ── 크기 게이트(순수 함수 — 호출은 421차) ──
export const SIZE_GATE_TOLERANCE = 0.35;

/** 장면 키별로 기준물이 되는 것 */
export const SLOT_REFERENCE: Record<string, Exclude<ReferenceKind, "bag">> = {
  "use-person": "face",
  "use-hand-mist": "hand",
  "scene-desk": "notebook",
  "scene-vanity": "brushHandle",
};

export type SizeGateInput = {
  slot: string;
  /** 병의 실제 높이(cm) */
  heightCm: number;
  /** 비전이 돌려준 병 높이·기준물 높이(길이) 픽셀 */
  bottlePx: number | null | undefined;
  referencePx: number | null | undefined;
  /** 기준물 종류. 생략하면 SLOT_REFERENCE[slot] */
  reference?: Exclude<ReferenceKind, "bag">;
  /** 지금까지의 생성 시도 수(1 = 첫 결과) */
  attempt: number;
  /** 허용 오차(기본 ±35%) */
  tolerance?: number;
};
export type SizeGateVerdict = {
  verdict: "pass" | "regenerate" | "fallback";
  reason: "ok" | "too-large" | "too-small" | "unmeasured" | "no-reference";
  /** 관측 비율 ÷ 기대 비율 − 1 (측정 못 하면 null) */
  deviation: number | null;
  expectedRatio: number | null;
  observedRatio: number | null;
};

/**
 * 판정 표
 *  | 측정 | 편차 | 시도 | 결과 |
 *  | 가능 | ±tol 이내 | 무관 | pass |
 *  | 가능 | 초과(너무 큼/작음) | 1 | regenerate(1회) |
 *  | 가능 | 초과 | 2 이상 | fallback(슬롯 비움 → 3-2 중립 제목 폴백) |
 *  | 불가(값 없음·0·NaN) | - | 무관 | fallback(크기를 확인 못 한 이미지는 쓰지 않는다) |
 *  | 기준물 없는 슬롯(scene-bag) | - | 무관 | pass(reason no-reference — 잴 기준이 없어 프롬프트 비교 문장에만 의존, 421차 실측 후 재검토) | */
export function judgeSceneSize(i: SizeGateInput): SizeGateVerdict {
  const tol = i.tolerance ?? SIZE_GATE_TOLERANCE;
  const ref = i.reference ?? SLOT_REFERENCE[i.slot];
  if (!ref) return { verdict: "pass", reason: "no-reference", deviation: null, expectedRatio: null, observedRatio: null };
  const ok = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
  if (!ok(i.bottlePx) || !ok(i.referencePx) || !ok(i.heightCm)) return { verdict: "fallback", reason: "unmeasured", deviation: null, expectedRatio: null, observedRatio: null };
  const expected = i.heightCm / REFERENCE_CM[ref];
  const observed = i.bottlePx / i.referencePx;
  const deviation = observed / expected - 1;
  if (Math.abs(deviation) <= tol + 1e-9) return { verdict: "pass", reason: "ok", deviation, expectedRatio: expected, observedRatio: observed };
  return {
    verdict: i.attempt <= 1 ? "regenerate" : "fallback",
    reason: deviation > 0 ? "too-large" : "too-small",
    deviation,
    expectedRatio: expected,
    observedRatio: observed,
  };
}
