/**
 * 504 — 주의사항 고시 별표1 기반 성분·유형 주의 판정.
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeLabelText } from "@/lib/label-check/extract-pdf";
import type { Finding, LabelCheckInput } from "@/lib/label-check/types";

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

type CautionsFile = {
  ingredient_cautions?: IngredientCaution[];
  type_cautions?: TypeCaution[];
};

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
];

let cached: CautionsFile | null = null;

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

export function loadKrCautions504(): CautionsFile {
  if (cached) return cached;
  const raw = fs.readFileSync(dataPath("kr-cautions_draft_v0.1.json"), "utf8");
  cached = JSON.parse(raw) as CautionsFile;
  return cached;
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
