/**
 * 506 — KR/US 성분표 보강 finding(데이터 범위).
 * 주의사항 성분 문구는 504 finding에 templates 보강(중복 finding 없음).
 */
import {
  countHangulChars506,
  extractIngredientsRegionText506,
  parseIngredientList506,
} from "@/lib/label-check/ingredients-parse";
import { normalizeLabelText } from "@/lib/label-check/extract-pdf";
import { loadKrCautions504 } from "@/lib/label-check/cautions-kr";
import type { Finding } from "@/lib/label-check/types";

export function scanKrIngredientsExtra506(text: string): {
  findings: Finding[];
  ingredientCount?: number;
} {
  const findings: Finding[] = [];
  const body = extractIngredientsRegionText506(text, "KR");
  if (body == null) return { findings };
  const parts = parseIngredientList506(body);
  const ingredientCount = parts.length || undefined;

  if (body.trim() && countHangulChars506(body) === 0) {
    findings.push({
      category: "성분",
      label: "표준 국문 성분명 확인",
      status: "attention",
      found: "전성분 구간에 한글 성분명 흔적이 없음",
      suggest: "표준 국문 성분명 표기를 확인하세요.",
      checkType: "code",
      checkKey: "lbl:표준 국문 성분명 확인",
    });
  }

  const regionNorm = normalizeLabelText(body);
  if (regionNorm.includes("기타성분") || /기타\s*성분/.test(body)) {
    findings.push({
      category: "성분",
      label: "기타 성분 표기",
      status: "attention",
      found: "「기타 성분」 표기 확인",
      suggest: "기타 성분 표기 방식을 확인하세요(별표4 관련 안내).",
      checkType: "code",
      checkKey: "lbl:기타 성분 표기",
    });
  }

  return { findings, ingredientCount };
}

/** 504 성분 주의사항 finding에 required_text_ko 템플릿 부착 */
export function attachCautionTemplates506(findings: Finding[]): Finding[] {
  const cau = loadKrCautions504();
  return findings.map((f) => {
    if (f.category !== "주의사항" || !/성분 주의사항/.test(f.label)) return f;
    if (f.fix?.templates?.length) return f;
    const m = f.label.match(/성분 주의사항\(([^)]+)\)/);
    const trig = m?.[1];
    if (!trig) return f;
    const row = (cau.ingredient_cautions || []).find((c) =>
      (c.trigger_ingredients_ko || []).some(
        (t) => normalizeLabelText(t) === normalizeLabelText(trig) || t === trig,
      ),
    );
    if (!row?.required_text_ko) return f;
    return {
      ...f,
      fix: {
        kind: "fill",
        headline: f.fixSuggestion || f.suggest || "주의사항 문구 예시",
        templates: [row.required_text_ko],
        note: f.exceptionNote,
      },
    };
  });
}

export function scanUsIngredientsExtra506(
  text: string,
  extractedHasSizes: boolean,
  sizesPt: number[] | null,
): {
  findings: Finding[];
  ingredientCount?: number;
} {
  const findings: Finding[] = [];
  const body = extractIngredientsRegionText506(text, "US");
  if (body == null) return { findings };

  const parts = parseIngredientList506(body);
  const ingredientCount = parts.length || undefined;

  if (!body.trim() || parts.length === 0) {
    findings.push({
      category: "US",
      label: "Ingredients list",
      status: "attention",
      found: "Ingredients 구간이 비어 있는 것으로 보임",
      suggest: "성분 목록을 확인하세요.",
      checkType: "code",
      checkKey: "US-006",
    });
  }

  if (countHangulChars506(body) > 0) {
    findings.push({
      category: "US",
      label: "Ingredients language",
      status: "attention",
      found: "Ingredients 구간에 한글이 포함됨",
      suggest: "영어 성분명 표기를 확인하세요.",
      checkType: "code",
      checkKey: "lbl:Ingredients language",
    });
  }

  if (/and other ingredients/i.test(body)) {
    findings.push({
      category: "US",
      label: "Trade secret ingredients",
      status: "attention",
      found: "and other ingredients",
      suggest: "영업비밀 면제 해당 여부를 확인하세요.",
      checkType: "code",
      checkKey: "lbl:Trade secret ingredients",
    });
  }

  if (extractedHasSizes && sizesPt && sizesPt.length) {
    const positive = sizesPt.filter((n) => n > 0);
    if (positive.length) {
      const min = Math.min(...positive);
      if (min < 2.25) {
        findings.push({
          category: "US",
          label: "Ingredients type size",
          status: "attention",
          found: `감지 크기 약 ${min}pt`,
          suggest: "성분 글자 높이(약 1/32인치≈2.25pt 이상)를 확인하세요.",
          checkType: "code",
          checkKey: "lbl:Ingredients type size",
        });
      }
    }
  }

  return { findings, ingredientCount };
}
