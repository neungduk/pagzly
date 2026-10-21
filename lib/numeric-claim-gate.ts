/**
 * 424차 1-1 — 숫자 주장 코드 게이트(모든 카테고리). 프롬프트 규칙만으로는 비교 차트 수치(82/55)·"하루에 두 번"·"아침 3분" 같은 입력에 없는 수치가 계속 나왔다(417·418·422차).
 * 생성된 섹션 문구의 숫자·한글 수사를 **허용 집합**과 대조하는 순수 함수와 섹션 후처리다. 새 호출 없음, 새 문장을 지어내지 않는다.
 *
 * 허용 집합
 *  - 입력(폼 필드·붙여넣은 원문·후기 요약·기획서)에 나온 숫자 토큰(쉼표 제거). "5만원" → 5.
 *  - 입력에서 센 개수: 성분 개수·사이즈 라벨 종류 수, 그리고 같은 섹션의 항목 수("세 가지 …" 제목 아래 카드 3장).
 *  - 번호 접두(STEP 01·POINT 1·Q1·No.)와 두 자리 0 번호(01~09)는 숫자 주장이 아니다.
 *  - 한글 수사: 개수 단위(가지·개·종·단계)는 위 개수와 같을 때, "한 가지/한 개"는 항상, 빈도·시간 단위(번·회·시간·주·배)는 입력에 같은 표현이 있을 때만 허용.
 * 위반 처리
 *  ① 비교 차트의 수치(0·100 이외 값이 입력에 없음) → 유무 ✓/✗ 형태(checklist)로 바꾼다("자체 평가 기준" 표기 로직은 그대로).
 *  ② 문장 속 수치 → 그 문장만 삭제. 제목은 고정 사전 제목으로 대체(히어로는 입력 상품명). 라벨만 남은 항목("단추 여밈:")은 항목 삭제.
 *  ③ 항목이 모두 사라진 섹션은 제거. 제거한 원본 섹션 번호는 keptIndexes에서 빠진다(표시 번호 매핑용).
 * 건드리지 않는 섹션: 상품 정보 표·배송 표·주의·가격 CTA·AI 고지·증빙(입력·법정 문구가 그대로 담기는 곳).
 */
import type { DetailSection } from "@/lib/types/generate";

/** 기본 켬. 운영 중 오탐이 보이면 NEXT_PUBLIC_NUMERIC_GATE=off로 서버를 시작해 끈다(출력이 게이트 도입 전과 같아진다) */
export const NUMERIC_GATE_ENABLED = process.env.NEXT_PUBLIC_NUMERIC_GATE !== "off";

export type ClaimFacts = {
  /** 입력에 나온 숫자 토큰(쉼표 제거) */
  numbers: Set<string>;
  /** 입력의 한글 수사 표현(공백 제거, 예: "하루에두번" 아님 — "두번") */
  hangul: Set<string>;
  /** 입력에서 센 개수(성분 수·사이즈 라벨 수 등) */
  counts: Set<number>;
  /** 히어로 제목 대체용(입력 상품명) */
  productName: string;
};

export type ClaimInput = {
  productName?: string | null;
  brandName?: string | null;
  price?: number | string | null;
  targetCustomer?: string | null;
  keyFeatures?: string | null;
  productSizeHint?: string | null;
  ingredients?: string | null;
  certifications?: string | null;
  /** 판매자가 붙여넣은 원본 상품 페이지 텍스트(사이즈표·배송 문구가 들어 있음) */
  wholesaleUrl?: string | null;
  reviewInsights?: unknown;
  planningDocText?: string | null;
};

export type ClaimViolation = {
  /** 입력(게이트 전) 섹션 번호 */
  index: number;
  type: string;
  path: string;
  text: string;
  tokens: string[];
  action: "sentence_removed" | "heading_replaced" | "item_removed" | "chart_to_checklist" | "metric_removed" | "annotation_removed" | "field_cleared" | "section_removed";
};

const KO_NUM: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10 };
const KO_RE = /(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s?(번|회|시간|주|배|가지|개|종|단계)/g;
const COUNT_UNITS = new Set(["가지", "개", "종", "단계"]);
const NUM_RE = /\d[\d,]*(?:\.\d+)?/g;
const norm = (n: string) => n.replace(/,/g, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

const SIZE_LABEL_RE = /(?<![A-Za-z0-9])(XXS|XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL|FREE|F)(?![A-Za-z0-9])/g;

export function buildClaimFacts(input: ClaimInput): ClaimFacts {
  const price = input.price != null && input.price !== "" ? String(input.price) : "";
  // 성분 목록의 번호("1. 동백 2. 히알루론산")는 수치가 아니다
  const ingredientsText = (input.ingredients ?? "").replace(/(^|[\s,])\d+\s*[.)]\s*(?=\S)/g, "$1");
  const parts = [input.productName, input.brandName, price, price ? Number(price).toLocaleString("en-US") : "", input.targetCustomer, input.keyFeatures, input.productSizeHint, ingredientsText, input.certifications, input.wholesaleUrl, input.planningDocText, input.reviewInsights ? JSON.stringify(input.reviewInsights) : ""];
  const corpus = parts.filter((p): p is string => typeof p === "string" && p.length > 0).join("\n");
  const numbers = new Set<string>();
  for (const m of corpus.matchAll(NUM_RE)) numbers.add(norm(m[0]));
  const hangul = new Set<string>();
  for (const m of corpus.matchAll(KO_RE)) hangul.add(`${m[1]}${m[2]}`);
  const counts = new Set<number>();
  // 성분 개수: 쉼표·가운데점·줄바꿈·번호("1. 2.")로 나눈 항목 수
  if (input.ingredients) {
    const items = input.ingredients.split(/[,，、·\n]|\d+\s*[.)]\s*/).map((s) => s.trim()).filter((s) => s.length > 0);
    if (items.length > 0) counts.add(items.length);
  }
  // 사이즈 라벨 종류 수(S·M·L·XL·2XL·FREE…)
  const labels = new Set<string>();
  for (const m of corpus.matchAll(SIZE_LABEL_RE)) labels.add(m[1]!);
  if (labels.size > 0) counts.add(labels.size);
  // "S~2XL" 범위가 있으면 그 사이 사이즈 수도 허용
  const order = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  for (const m of corpus.matchAll(/(XXS|XS|S|M|L|XL|2XL|3XL|4XL)\s*[~\-–부터]\s*(XS|S|M|L|XL|2XL|3XL|4XL|5XL)/g)) {
    const a = order.indexOf(m[1]!), b = order.indexOf(m[2]!);
    if (a >= 0 && b > a) counts.add(b - a + 1);
  }
  return { numbers, hangul, counts, productName: (input.productName ?? "").trim() };
}

// ── 텍스트 검사 ──
/** 번호 접두·두 자리 0 번호는 숫자 주장이 아니다 */
function isLabelNumber(text: string, start: number, token: string): boolean {
  if (/^0\d$/.test(token)) return true;
  const before = text.slice(Math.max(0, start - 8), start);
  return /(STEP|Step|step|POINT|Point|point|Q|A|NO\.?|No\.?|#)\s*$/.test(before);
}

export type TextVerdict = { tokens: string[]; bad: boolean };
/** sectionCounts: 같은 섹션의 항목 수(카드·단계·성분 등) */
export function checkText(text: string, facts: ClaimFacts, sectionCounts: ReadonlySet<number> = new Set()): TextVerdict {
  const tokens: string[] = [];
  for (const m of text.matchAll(NUM_RE)) {
    const raw = m[0];
    const tok = norm(raw);
    const start = m.index ?? 0;
    if (isLabelNumber(text, start, raw)) continue;
    if (facts.numbers.has(tok)) continue;
    const after = text.slice(start + raw.length, start + raw.length + 4);
    const n = Number(tok);
    if (/^\s?(가지|개|단계|종|사이즈|가지만)/.test(after) && (facts.counts.has(n) || sectionCounts.has(n))) continue;
    // 사이즈 "5종"·"S~2XL 5사이즈"는 위 개수와 같으면 허용(이미 처리), 그 밖의 숫자는 위반
    tokens.push(raw);
  }
  for (const m of text.matchAll(KO_RE)) {
    const n = KO_NUM[m[1]!]!;
    const unit = m[2]!;
    const key = `${m[1]}${unit}`;
    if (facts.hangul.has(key)) continue;
    if (COUNT_UNITS.has(unit)) {
      if (n === 1) continue; // "한 가지"
      if (facts.counts.has(n) || sectionCounts.has(n)) continue;
    }
    tokens.push(m[0]);
  }
  return { tokens, bad: tokens.length > 0 };
}

const SENT_SPLIT = /(?<=[.!?。…])\s+/;
/** 위반 문장만 지운다. 문단(\n) 구조는 유지, 모두 지워지면 빈 문자열 */
export function stripViolatingSentences(text: string, facts: ClaimFacts, sectionCounts: ReadonlySet<number>): { text: string; removed: string[] } {
  const removed: string[] = [];
  const paras = text.split(/(\n+)/);
  const out = paras.map((p) => {
    if (/^\n+$/.test(p)) return p;
    const kept = p.split(SENT_SPLIT).filter((s) => {
      const v = checkText(s, facts, sectionCounts);
      if (v.bad) { removed.push(s); return false; }
      return true;
    });
    return kept.join(" ");
  });
  return { text: out.join("").replace(/^\n+|\n+$/g, "").replace(/\n{3,}/g, "\n\n"), removed };
}

// ── 섹션 처리 ──
/** 이 섹션 유형은 입력·법정 문구가 그대로 담기므로 건드리지 않는다 */
const SKIP_TYPES = new Set(["spec_table", "caution", "cta_price", "ai_disclosure", "certificate_evidence", "scene_image", "gallery", "custom_gif", "canvas", "before_after", "review_highlight", "color_variation", "comparison_table"]);
/** 값이 문장이 아닌 구조·식별 필드 */
const SKIP_KEYS = new Set(["type", "slot", "url", "imageUrl", "imageUrls", "imageIndex", "imageIndexes", "layout", "imagePosition", "presentationStyle", "style", "basis", "basisNote", "unit", "ourLabel", "baselineLabel", "sceneSlot", "xPct", "yPct", "evidenceQuotes", "icon", "iconKey", "level", "tone", "variant"]);
const HEADING_KEYS = new Set(["heading", "headline"]);
const COUNT_KEYS = new Set(["heading", "headline", "subheadline", "title", "emphasis", "callout", "label"]);
const NO_COUNTS: ReadonlySet<number> = new Set();
/** 고정 사전 제목(주장 없음) */
const SAFE_HEADING: Record<string, string> = {
  usage_steps: "사용 방법",
  step_card: "사용 방법",
  highlight_box: "핵심 포인트",
  checklist: "체크포인트",
  stat_infographic: "제품 정보",
  target_persona: "이런 분께",
  tradeoff_card: "이런 분께 잘 맞아요",
  faq: "자주 묻는 질문",
  image_text: "제품 특징",
  brand_story: "브랜드 소개",
  comparison_chart: "비교",
  illustration_banner: "제품 특징",
};

type AnyObj = Record<string, unknown>;
const isObj = (v: unknown): v is AnyObj => !!v && typeof v === "object" && !Array.isArray(v);

/** 섹션 안의 항목 수 집합(카드·단계·성분·지표 등) — "세 가지" 제목 검사용 */
function sectionCountsOf(s: AnyObj): Set<number> {
  const out = new Set<number>();
  for (const k of ["cards", "steps", "items", "personas", "recommendFor", "considerIf", "metrics", "badges", "features", "annotations"]) {
    const v = s[k];
    if (Array.isArray(v) && v.length > 0) out.add(v.length);
  }
  return out;
}

/** 라벨만 남은 항목("단추 여밈:")은 내용 없음으로 본다 */
const labelOnly = (t: string) => /[:：]\s*$/.test(t.trim()) || t.trim().length < 2;

type Ctx = { facts: ClaimFacts; index: number; type: string; counts: Set<number>; violations: ClaimViolation[] };
const record = (c: Ctx, path: string, text: string, tokens: string[], action: ClaimViolation["action"]) => c.violations.push({ index: c.index, type: c.type, path, text: text.slice(0, 120), tokens, action });

/** 문자열 하나: 위반 없으면 그대로, 있으면 문장 삭제(제목은 사전 대체) */
function cleanString(c: Ctx, key: string, path: string, text: string): string {
  // "세 가지 …"처럼 섹션 항목 수를 말하는 건 제목·강조 문구뿐이다. 본문·단계 문장의 "두 개"는 항목 수가 아니다
  const counts = COUNT_KEYS.has(key) ? c.counts : NO_COUNTS;
  const v = checkText(text, c.facts, counts);
  if (!v.bad) return text;
  if (HEADING_KEYS.has(key)) {
    const fallback = c.type === "hero" ? c.facts.productName || "" : SAFE_HEADING[c.type] ?? "";
    record(c, path, text, v.tokens, "heading_replaced");
    return fallback;
  }
  const r = stripViolatingSentences(text, c.facts, counts);
  record(c, path, text, v.tokens, r.text ? "sentence_removed" : "field_cleared");
  return r.text;
}

/** 값(문자열·배열·객체)을 재귀 처리. 배열에서 비게 된 항목은 제거 */
function cleanValue(c: Ctx, key: string, path: string, val: unknown): unknown {
  if (typeof val === "string") return cleanString(c, key, path, val);
  if (Array.isArray(val)) {
    const out: unknown[] = [];
    val.forEach((item, i) => {
      const p = `${path}[${i}]`;
      if (typeof item === "string") {
        const t = cleanString(c, key, p, item);
        if (t && !labelOnly(t)) out.push(t);
        else if (t !== item || !t) { if (t !== item) record(c, p, item, [], "item_removed"); }
        else out.push(t);
      } else if (isObj(item)) {
        const cleaned = cleanObject(c, p, item);
        if (cleaned) out.push(cleaned); else record(c, p, JSON.stringify(item).slice(0, 80), [], key === "annotations" ? "annotation_removed" : key === "metrics" ? "metric_removed" : "item_removed");
      } else out.push(item);
    });
    return out;
  }
  if (isObj(val)) return cleanObject(c, path, val) ?? val;
  return val;
}

/** 객체(카드·FAQ 항목·지표 등): 글 필드를 처리하고 핵심 글이 모두 비면 null(삭제) */
function cleanObject(c: Ctx, path: string, o: AnyObj): AnyObj | null {
  const out: AnyObj = { ...o };
  let before = 0, after = 0;
  for (const [k, v] of Object.entries(o)) {
    if (SKIP_KEYS.has(k)) continue;
    if (typeof v === "string") {
      before += v.trim() ? 1 : 0;
      const t = cleanString(c, k, `${path}.${k}`, v);
      out[k] = t;
      after += t.trim() ? 1 : 0;
    } else if (Array.isArray(v) || isObj(v)) out[k] = cleanValue(c, k, `${path}.${k}`, v);
  }
  // 질문만 남고 답이 지워진 FAQ, 라벨만 남은 지표 등 → 항목 삭제
  if (before > 0 && after === 0) return null;
  if ("question" in o && !String(out.answer ?? "").trim()) return null;
  if ("answer" in o && !String(out.question ?? "").trim()) return null;
  if ("label" in o && "value" in o && (!String(out.label ?? "").trim() || !String(out.value ?? "").trim())) return null;
  if ("xPct" in o && !String(out.label ?? "").trim()) return null;
  return out;
}

/** 비교 차트: 값이 입력에 없는 수치면 ✓/✗(checklist)로 바꾼다. 라벨 문구는 일반 규칙 */
function cleanChart(c: Ctx, s: AnyObj): AnyObj | null {
  const out: AnyObj = { ...s };
  const metrics = Array.isArray(s.metrics) ? (s.metrics as Array<{ label: string; ourValue: number; baselineValue: number }>) : [];
  const allowedVal = (n: number) => n === 0 || n === 100 || c.facts.numbers.has(norm(String(n)));
  const needChecklist = metrics.some((m) => !allowedVal(m.ourValue) || !allowedVal(m.baselineValue));
  const cleaned: typeof metrics = [];
  for (const [i, m] of metrics.entries()) {
    const label = cleanString(c, "label", `metrics[${i}].label`, String(m.label ?? ""));
    if (!label.trim()) { record(c, `metrics[${i}]`, String(m.label ?? ""), [], "metric_removed"); continue; }
    cleaned.push(needChecklist ? { ...m, label, ourValue: 100, baselineValue: 0 } : { ...m, label });
  }
  if (needChecklist) record(c, "presentationStyle", JSON.stringify(metrics.map((m) => [m.ourValue, m.baselineValue])), [], "chart_to_checklist");
  if (typeof s.heading === "string") out.heading = cleanString(c, "heading", "heading", s.heading);
  out.metrics = cleaned;
  if (needChecklist) out.presentationStyle = "checklist";
  return cleaned.length >= 2 ? out : null;
}

/** 처리 후 섹션이 비었는지(핵심 항목이 없는지) */
function isEmptySection(type: string, s: AnyObj): boolean {
  const len = (k: string) => (Array.isArray(s[k]) ? (s[k] as unknown[]).length : 0);
  const has = (k: string) => typeof s[k] === "string" && (s[k] as string).trim().length > 0;
  switch (type) {
    case "checklist": return len("items") === 0;
    case "usage_steps": return len("steps") === 0;
    case "step_card": return len("steps") === 0;
    case "highlight_box": return len("cards") === 0;
    case "target_persona": return len("personas") === 0;
    case "tradeoff_card": return len("recommendFor") === 0 && len("considerIf") === 0;
    case "faq": return len("items") === 0;
    case "stat_infographic": return len("metrics") < 2;
    case "comparison_chart": return len("metrics") < 2;
    case "brand_story": return !has("body");
    case "image_text": return !has("body") && !has("heading");
    case "illustration_banner": return !has("body") && !has("heading");
    case "hero": return !has("headline") && !has("heading");
    default: return false;
  }
}

export type NumericGateResult = {
  sections: DetailSection[];
  /** 남은 섹션이 입력 섹션 배열의 몇 번째였는지 */
  keptIndexes: number[];
  violations: ClaimViolation[];
};

export function numericClaimGate(sections: DetailSection[], facts: ClaimFacts): NumericGateResult {
  const out: DetailSection[] = [];
  const keptIndexes: number[] = [];
  const violations: ClaimViolation[] = [];
  sections.forEach((section, index) => {
    const s = section as unknown as AnyObj;
    const type = String(s.type);
    if (SKIP_TYPES.has(type)) { out.push(section); keptIndexes.push(index); return; }
    const ctx: Ctx = { facts, index, type, counts: sectionCountsOf(s), violations };
    let cleaned: AnyObj | null;
    if (type === "comparison_chart") cleaned = cleanChart(ctx, s);
    else cleaned = cleanObject(ctx, "", s) ?? { ...s };
    // 문장 일부가 지워져 본문과 강조 문구가 어긋나면 강조를 뺀다
    if (cleaned && typeof cleaned.body === "string") {
      for (const k of ["emphasis", "callout"]) {
        const v = cleaned[k];
        if (typeof v === "string" && v && !String(cleaned.body).includes(v) && !(s.body && String(s.body) === cleaned.body)) cleaned[k] = "";
      }
    }
    if (!cleaned || isEmptySection(type, cleaned)) {
      violations.push({ index, type, path: "", text: String(s.heading ?? s.headline ?? "").slice(0, 80), tokens: [], action: "section_removed" });
      return;
    }
    out.push((violationsTouched(violations, index) ? cleaned : section) as unknown as DetailSection);
    keptIndexes.push(index);
  });
  return { sections: out, keptIndexes, violations };
}

/** 이 섹션에서 위반이 기록됐는가(없으면 원본 객체를 그대로 돌려줘 동일성 유지) */
const violationsTouched = (v: ClaimViolation[], index: number) => v.some((x) => x.index === index);

/** 세션·폼의 입력 필드 → 게이트가 보는 사실. 같은 객체는 한 번만 계산한다(렌더마다 다시 만들지 않게) */
const factsCache = new WeakMap<object, ClaimFacts>();
export function claimFactsOf(d: ClaimInput | null | undefined): ClaimFacts | undefined {
  if (!d) return undefined;
  const hit = factsCache.get(d);
  if (hit) return hit;
  const facts = buildClaimFacts(d);
  factsCache.set(d, facts);
  return facts;
}
