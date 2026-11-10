/**
 * 504 — 주의사항 고시 별표1 기반 성분·유형 주의 판정.
 * 505 — v0.2 common_cautions(시행규칙 별표3 제1호) + KR-LBL-009 통합.
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeLabelText } from "@/lib/label-check/extract-pdf";
import { FOUND_CONFIRMED_488 } from "@/lib/label-check/format-found";
import type { CheckStatus, Finding, LabelCheckInput } from "@/lib/label-check/types";

export type IngredientCaution = {
  id: string;
  trigger_ingredients_ko: string[];
  required_text_ko: string;
  match_keys_ko: string[];
  concentration_dependent?: boolean;
  condition_note?: string;
  note?: string;
};

export type TypeCaution = IngredientCaution & {
  /** condition_note에 유형 키워드 */
};

export type CommonCautionItem505 = {
  id: string;
  required_text_ko: string;
  match_keys_ko: string[];
  /** 화면용 짧은 제목(새 카피 한정) */
  title_ko: string;
};

type CautionsFile = {
  ingredient_cautions?: IngredientCaution[];
  type_cautions?: TypeCaution[];
  common_cautions?: {
    items?: Array<{
      id: string;
      required_text_ko: string;
      match_keys_ko: string[];
    }>;
    severity_if_missing?: string;
  };
};

/** 공통사항 4개 — 데이터에 title이 없어 필수 문구에서 짧은 제목만 사용 */
const COMMON_CAUTION_TITLES_505: Record<string, string> = {
  "CAU-C01": "이상 증상·부작용 시 전문의 상담",
  "CAU-C02": "상처가 있는 부위 사용 자제",
  "CAU-C03": "어린이의 손이 닿지 않는 곳 보관",
  "CAU-C04": "직사광선을 피해서 보관",
};

/** 기능성(규칙 제2조제6·7호) 안내 — 새 카피 이 한 줄만 */
export const FUNCTIONAL_COMMON_CAUTION_LINE_505 =
  "기능성화장품(규칙 제2조제6·7호)은 공통사항을 외부 포장에 표기해야 합니다(별표4 8.).";

/** UI 유형 키 → type_cautions condition_note 매칭용 */
export const PRODUCT_TYPE_OPTIONS_504: Array<{ id: string; label: string; noteKey: string }> = [
  { id: "scrub", label: "스크럽", noteKey: "스크럽" },
  { id: "pack", label: "팩", noteKey: "팩" },
  { id: "shampoo", label: "샴푸", noteKey: "샴푸" },
  { id: "vulva", label: "외음부세정제", noteKey: "외음부" },
  { id: "softener", label: "손발연화", noteKey: "손·발" },
  { id: "deodorant", label: "체취방지", noteKey: "체취" },
  { id: "spray_sunscreen", label: "분무형 자외선차단", noteKey: "분무형 자외선" },
  { id: "aerosol", label: "에어로졸", noteKey: "에어로졸" },
  /** 506 — 광고 예외(색조 화장용 제품류) */
  { id: "color_makeup", label: "색조", noteKey: "색조" },
];

let cached: CautionsFile | null = null;

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

export function loadKrCautions504(): CautionsFile {
  if (cached) return cached;
  const raw = fs.readFileSync(dataPath("kr-cautions_draft_v0.2.json"), "utf8");
  cached = JSON.parse(raw) as CautionsFile;
  return cached;
}

export function loadCommonCautions505(): CommonCautionItem505[] {
  const file = loadKrCautions504();
  const items = file.common_cautions?.items || [];
  return items.map((it) => ({
    id: it.id,
    required_text_ko: it.required_text_ko,
    match_keys_ko: it.match_keys_ko || [],
    title_ko: COMMON_CAUTION_TITLES_505[it.id] || it.id,
  }));
}

function includesAnyPattern(text: string, patterns: string[]): boolean {
  const n = normalizeLabelText(text);
  for (const p of patterns) {
    const nk = normalizeLabelText(p);
    if (nk && n.includes(nk)) return true;
  }
  return false;
}

/**
 * KR-LBL-009 존재 여부 + common_cautions 통합 판정(중복 finding 없음).
 */
export function evaluateCommonCautionsForLbl009_505(
  text: string,
  input: LabelCheckInput,
  opts: {
    category: string;
    label: string;
    failStatus: CheckStatus;
    sectionPatterns: string[];
  },
): Finding {
  const sectionHit = includesAnyPattern(text, opts.sectionPatterns);
  const cautionRegion = extractCautionRegion504(text);
  const haystack = cautionRegion ?? normalizeLabelText(text);
  const commons = loadCommonCautions505();
  const missing: string[] = [];
  for (const c of commons) {
    if (!c.match_keys_ko.length || !allKeysPresent(haystack, c.match_keys_ko)) {
      missing.push(c.title_ko);
    }
  }

  const functionalNote = input.functional ? FUNCTIONAL_COMMON_CAUTION_LINE_505 : undefined;

  if (!sectionHit) {
    return {
      category: opts.category,
      label: opts.label,
      status: opts.failStatus,
      found: "관련 표기를 찾지 못함",
      suggest: [
        "공통 주의사항 문구 누락 가능(확인 필요)",
        functionalNote,
      ]
        .filter(Boolean)
        .join(" "),
      checkType: "code",
    };
  }

  if (missing.length === 0) {
    return {
      category: opts.category,
      label: opts.label,
      status: "pass",
      found: FOUND_CONFIRMED_488,
      suggest: [
        "공통 주의사항 핵심 문구가 확인되었습니다. 개별사항·형식을 한 번 더 확인하세요.",
        functionalNote,
      ]
        .filter(Boolean)
        .join(" "),
      checkType: "code",
    };
  }

  if (missing.length === commons.length) {
    return {
      category: opts.category,
      label: opts.label,
      status: "attention",
      found: "공통 주의사항 문구 누락 가능(확인 필요)",
      suggest: [functionalNote || "시행규칙 별표3 제1호 공통사항 문구를 확인하세요."]
        .filter(Boolean)
        .join(" "),
      checkType: "code",
    };
  }

  return {
    category: opts.category,
    label: opts.label,
    status: "attention",
    found: `공통 주의사항 일부 확인 필요: ${missing.join(", ")}`,
    suggest: [functionalNote || "누락된 공통사항 문구를 확인하세요."].filter(Boolean).join(" "),
    checkType: "code",
  };
}

export function resetKrCautionsCache504(): void {
  cached = null;
}

/** 전성분 구간. 실패 시 null */
export function extractIngredientsRegion504(text: string): string | null {
  const norm = normalizeLabelText(text);
  const startKeys = ["전성분", "ingredients"];
  let start = -1;
  let keyLen = 0;
  for (const k of startKeys) {
    const nk = normalizeLabelText(k);
    const idx = norm.indexOf(nk);
    if (idx >= 0 && (start < 0 || idx < start)) {
      start = idx;
      keyLen = nk.length;
    }
  }
  if (start < 0) return null;
  const endKeys = [
    "사용할때의주의사항",
    "주의사항",
    "내용량",
    "제조번호",
    "사용기한",
    "가격",
    "바코드",
    "화장품책임판매업자",
  ];
  let end = norm.length;
  for (const k of endKeys) {
    const nk = normalizeLabelText(k);
    const idx = norm.indexOf(nk, start + keyLen);
    if (idx >= 0 && idx < end) end = idx;
  }
  return norm.slice(start, end);
}

/** 주의사항 구간. 실패 시 null(폴백은 호출측) */
export function extractCautionRegion504(text: string): string | null {
  const norm = normalizeLabelText(text);
  const startKeys = ["사용할때의주의사항", "주의사항"];
  let start = -1;
  let keyLen = 0;
  for (const k of startKeys) {
    const nk = normalizeLabelText(k);
    const idx = norm.indexOf(nk);
    if (idx >= 0 && (start < 0 || idx < start)) {
      start = idx;
      keyLen = nk.length;
    }
  }
  if (start < 0) return null;
  const endKeys = ["전성분", "ingredients", "내용량", "제조번호", "사용기한", "가격", "바코드"];
  let end = norm.length;
  for (const k of endKeys) {
    const nk = normalizeLabelText(k);
    const idx = norm.indexOf(nk, start + keyLen);
    if (idx >= 0 && idx < end) end = idx;
  }
  return norm.slice(start, end);
}

function allKeysPresent(haystackNorm: string, keys: string[]): boolean {
  return keys.every((k) => {
    const nk = normalizeLabelText(k);
    return nk.length > 0 && haystackNorm.includes(nk);
  });
}

function anyTriggerIn(regionNorm: string, triggers: string[]): string | null {
  for (const t of triggers) {
    const nt = normalizeLabelText(t);
    if (nt && regionNorm.includes(nt)) return t;
  }
  return null;
}

function benzophenoneNote504(c: IngredientCaution): string | undefined {
  if (!c.trigger_ingredients_ko.some((t) => /벤조페논-3|옥시벤존/.test(t))) return undefined;
  return "시행 2026-09-02 · 경과조치 2027-03-02까지(개정 전 표시 용기·포장)";
}

function cautionFinding(
  title: string,
  found: string,
  suggest: string,
  exceptionNote?: string,
): Finding {
  return {
    category: "주의사항",
    label: title,
    status: "attention",
    found,
    suggest,
    checkType: "code",
    exceptionNote,
  };
}

export function scanIngredientCautions504(text: string): Finding[] {
  const file = loadKrCautions504();
  const findings: Finding[] = [];
  const ingRegion = extractIngredientsRegion504(text);
  const cautionRegion = extractCautionRegion504(text);
  const fullNorm = normalizeLabelText(text);
  const ingNorm = ingRegion ?? fullNorm;
  // 구간 식별 실패 시 전체 텍스트 폴백(한계 notes)
  const cautionNorm = cautionRegion ?? fullNorm;

  for (const c of file.ingredient_cautions || []) {
    const triggers = c.trigger_ingredients_ko || [];
    if (!triggers.length) continue;
    const hit = anyTriggerIn(ingNorm, triggers);
    if (!hit) continue;

    const keys = c.match_keys_ko || [];
    const ok = keys.length === 0 || allKeysPresent(cautionNorm, keys);
    if (ok) continue;

    const schedule = benzophenoneNote504(c);
    if (c.concentration_dependent) {
      findings.push(
        cautionFinding(
          `성분 주의사항(${hit})`,
          `전성분에서 「${hit}」 확인. 주의 문구: 없음 또는 불완전`,
          `함량 조건에 해당하면 필요: ${c.required_text_ko}`,
          [c.condition_note, schedule].filter(Boolean).join(" · ") || undefined,
        ),
      );
    } else {
      findings.push(
        cautionFinding(
          `성분 주의사항(${hit})`,
          `전성분에서 「${hit}」 확인. 주의 문구 누락 가능`,
          `확인 필요(해당 성분 주의사항 문구 누락 가능): ${c.required_text_ko}`,
          [c.condition_note, schedule].filter(Boolean).join(" · ") || undefined,
        ),
      );
    }
  }
  return findings;
}

export function scanTypeCautions504(text: string, input: LabelCheckInput): Finding[] {
  const types = input.productTypes || [];
  if (!types.length) return [];
  const file = loadKrCautions504();
  const cautionRegion = extractCautionRegion504(text);
  const cautionNorm = cautionRegion ?? normalizeLabelText(text);
  const findings: Finding[] = [];

  const selectedNotes = PRODUCT_TYPE_OPTIONS_504.filter((o) => types.includes(o.id)).map(
    (o) => o.noteKey,
  );

  for (const c of file.type_cautions || []) {
    const note = c.condition_note || "";
    const matched = selectedNotes.some((k) => note.includes(k));
    if (!matched) continue;
    const keys = c.match_keys_ko || [];
    if (keys.length && allKeysPresent(cautionNorm, keys)) continue;
    findings.push(
      cautionFinding(
        `유형 주의사항`,
        note || c.id,
        `확인 필요: ${c.required_text_ko}`,
        c.condition_note,
      ),
    );
  }
  return findings;
}
