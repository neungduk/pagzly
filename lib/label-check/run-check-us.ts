/**
 * 494 — 미국 시장 코드 판정(데이터 look_for만 사용, 임의 규칙 신설 금지).
 */
import {
  extractLabelPdf,
  type ExtractedPdf,
} from "@/lib/label-check/extract-pdf";
import { formatFoundSnippet } from "@/lib/label-check/format-found";
import { loadUsLabelRules494, type UsRuleDraft } from "@/lib/label-check/load-rules-us";
import { includesUs, normalizeUsLabelText } from "@/lib/label-check/normalize-us";
import {
  DISCLAIMER_483,
  DISCLAIMER_US_EXTRA_494,
  MIN_HANGUL_CHARS_485,
  NOTICE_NO_HANGUL_485,
  NOTICE_OTC_US_494,
  NOTICE_OUTLINE_485,
  type Finding,
  type LabelCheckInput,
  type LabelCheckResult,
  type LabelCheckSummary,
} from "@/lib/label-check/types";
import { countHangulChars } from "@/lib/label-check/extract-pdf";

const EMPTY_SUMMARY: LabelCheckSummary = {
  possible: 0,
  attention: 0,
  unknown: 0,
  pass: 0,
  manual: 0,
};

function usDisclaimer(): string {
  return `${DISCLAIMER_483} ${DISCLAIMER_US_EXTRA_494}`;
}

function summarize(findings: Finding[], manualCount: number): LabelCheckSummary {
  const s: LabelCheckSummary = { possible: 0, attention: 0, unknown: 0, pass: 0, manual: manualCount };
  for (const f of findings) {
    if (f.status === "possible") s.possible += 1;
    else if (f.status === "attention") s.attention += 1;
    else if (f.status === "unknown") s.unknown += 1;
    else s.pass += 1;
  }
  return s;
}

function withFix(rule: UsRuleDraft, base: Finding): Finding {
  if (!rule.fixKo && !rule.fixExampleEn) return base;
  return {
    ...base,
    fixSuggestion: rule.fixKo || undefined,
    fixExample: rule.fixExampleEn || undefined,
    fixKind: rule.id === "US-013" ? "soften" : "fix",
  };
}

function hasIdentityWord(text: string, lookFor: string[]): string | null {
  for (const w of lookFor) {
    if (/pattern:/i.test(w)) continue;
    if (includesUs(text, w)) return w;
  }
  return null;
}

function hasNetQty(text: string): string | null {
  const t = normalizeUsLabelText(text);
  // 숫자 + 단위(fl oz / oz / mL / g)
  const m = t.match(
    /\b(?:net(?:\s+(?:wt|contents))?[:\s]*)?\d+(?:\.\d+)?\s*(?:fl\.?\s*oz\.?|oz\.?|ml|mL|g)\b/i,
  );
  if (m) return m[0];
  if (/\bnet\b/i.test(t) && /\d/.test(t) && /(fl\.?\s*oz|oz|ml|g)\b/i.test(t)) {
    return "NET + unit";
  }
  return null;
}

function hasBusinessAddress(text: string): string | null {
  const t = normalizeUsLabelText(text);
  const role = [
    "distributed by",
    "manufactured for",
    "manufactured by",
    "packed by",
    "made for",
    "marketed by",
  ].find((p) => t.includes(p));
  // 주 약어 + ZIP
  const zip = t.match(/\b[a-z]{2}\s+\d{5}(?:-\d{4})?\b/);
  if (role && zip) return `${role} … ${zip[0]}`;
  if (role) return role;
  if (zip) return zip[0];
  return null;
}

function hasIngredientsBlock(text: string): string | null {
  const t = normalizeUsLabelText(text);
  const idx = t.search(/\bingredients\b\s*:/);
  const idx2 = idx >= 0 ? idx : t.search(/\bingredients\b/);
  if (idx2 < 0) return null;
  const after = t.slice(idx2).slice(0, 280);
  // 콤마 구분 영어 성분 흔적
  if (/[a-z]{3,}\s*,\s*[a-z]{3,}/i.test(after)) return "Ingredients + list";
  return "Ingredients";
}

function hasContact(text: string): string | null {
  const t = normalizeUsLabelText(text);
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) return "email";
  if (/\b1[-.\s]?800[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(t)) return "1-800";
  if (/\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/.test(t)) return "phone";
  if (/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(t)) return "phone";
  if (/\bwww\.[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) return "www";
  if (/\b(tel|phone|email)\b/i.test(t)) return "contact cue";
  return null;
}

function hasDrugClaim(text: string, lookFor: string[]): string | null {
  for (const w of lookFor) {
    if (includesUs(text, w)) return w;
  }
  return null;
}

function hangulOnlyLabel(text: string): boolean {
  const hangul = countHangulChars(text);
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  return hangul >= 10 && letters < 8;
}

function ingredientFontFinding(
  rule: UsRuleDraft,
  extracted: ExtractedPdf,
): Finding | null {
  // 1/16 inch ≈ 4.5pt (notes 근거). 폰트 아이템이 있을 때만 크기 판정.
  // 텍스트 마커 PDF 등 아이템 없음 → 크기 생략(null), 목록 존재 판정만.
  if (!extracted.textItems?.length) {
    return null;
  }
  const joined = extracted.textItems.map((i) => i.text).join("");
  const low = joined.toLowerCase();
  const start = low.search(/ingredients/);
  if (start < 0) return null;
  let normPos = 0;
  const sizes: number[] = [];
  for (const it of extracted.textItems) {
    const n = it.text.length;
    const a = normPos;
    const b = normPos + n;
    normPos = b;
    if (b <= start) continue;
    if (a > start + 400) break;
    if (it.sizePt > 0) sizes.push(it.sizePt);
  }
  if (!sizes.length) {
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: "unknown",
      found: "Ingredients 구간 크기 확인 불가",
      suggest: "글자 높이 1/16인치(약 4.5pt) 이상인지 확인하세요.",
      checkType: "code",
    });
  }
  const minPt = 4.5;
  const tooSmall = sizes.filter((s) => Math.round(s * 10) / 10 < minPt);
  if (tooSmall.length) {
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: "attention",
      found: `Ingredients 근처 크기(pt): ${[...new Set(sizes)].slice(0, 8).join(", ")} — 약 ${minPt}pt 미만 확인 필요`,
      suggest: "1/16인치(약 4.5pt) 이상인지 확인하세요.",
      checkType: "code",
    });
  }
  return null;
}

function runUsCodeRule(
  rule: UsRuleDraft,
  text: string,
  extracted: ExtractedPdf,
  input: LabelCheckInput,
): Finding | null {
  if (rule.needsImported && !input.imported) return null;
  if (rule.needsProfessional && !input.professionalUse) return null;
  if (rule.needsHazardous && !input.hazardous) return null;

  if (rule.id === "US-002") {
    const hit = hasIdentityWord(text, rule.lookFor);
    if (hit) {
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: "pass",
        found: formatFoundSnippet(text, hit),
        suggest: "용도 명칭이 주 표시면에 있는지도 확인하세요.",
        checkType: "code",
      });
    }
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: rule.failStatus,
      found: "identity 단어를 찾지 못함",
      suggest: rule.fixKo || "용도를 알 수 있는 명칭을 확인하세요.",
      checkType: "code",
    });
  }

  if (rule.id === "US-003") {
    const hit = hasNetQty(text);
    if (hit) {
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: "pass",
        found: formatFoundSnippet(text, hit),
        suggest: "주 표시면 하단 위치·글자 크기도 확인하세요.",
        checkType: "code",
      });
    }
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: rule.failStatus,
      found: "내용량(숫자+단위)을 찾지 못함",
      suggest: rule.fixKo || "NET + fl oz/oz/mL/g 표기를 확인하세요.",
      checkType: "code",
    });
  }

  if (rule.id === "US-004") {
    const hit = hasBusinessAddress(text);
    if (hit && /distributed by|manufactured|packed by|made for|marketed by/i.test(hit) && /\d{5}/.test(hit)) {
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: "pass",
        found: formatFoundSnippet(text, hit.split("…")[0].trim() || hit),
        suggest: "도로명·도시 표기를 함께 확인하세요.",
        checkType: "code",
      });
    }
    if (hit) {
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: "attention",
        found: formatFoundSnippet(text, hit),
        suggest: "상호 수식어와 주·ZIP이 모두 있는지 확인하세요.",
        checkType: "code",
      });
    }
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: rule.failStatus,
      found: "Distributed by 등·주 ZIP을 찾지 못함",
      suggest: rule.fixKo || "제조·판매자 주소 표기를 확인하세요.",
      checkType: "code",
    });
  }

  if (rule.id === "US-005") {
    const hit =
      ["Made in", "Product of", "Country of Origin"].find((p) => includesUs(text, p)) || null;
    if (hit) {
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: "pass",
        found: formatFoundSnippet(text, hit),
        suggest: "영어 국가명이 명확한지 확인하세요.",
        checkType: "code",
      });
    }
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: rule.failStatus,
      found: "원산지 표기를 찾지 못함",
      suggest: rule.fixKo || "Made in … 표기를 확인하세요.",
      checkType: "code",
    });
  }

  if (rule.id === "US-006") {
    const hit = hasIngredientsBlock(text);
    if (!hit) {
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: rule.failStatus,
        found: "Ingredients 표기를 찾지 못함",
        suggest: rule.fixKo || "Ingredients: 목록을 확인하세요.",
        checkType: "code",
      });
    }
    const fontIssue = ingredientFontFinding(rule, extracted);
    if (fontIssue && fontIssue.status !== "pass") {
      // 목록은 있으나 크기 이슈 → 크기 finding으로 대체하지 않고 통과 + 별도 attention은 fontIssue
      // 단일 규칙이므로 크기 이슈를 우선 보고(목록 존재는 found에 포함)
      return {
        ...fontIssue,
        found: `${hit} / ${fontIssue.found}`,
      };
    }
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: "pass",
      found: hit,
      suggest: "함량 순·INCI 명칭을 확인하세요.",
      checkType: "code",
    });
  }

  if (rule.id === "US-007") {
    if (hangulOnlyLabel(text)) {
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: rule.failStatus,
        found: "한글 위주 라벨로 보이며 영어 필수 문구가 부족할 수 있음",
        suggest: rule.fixKo || "필수 문구를 영어로 표기하세요.",
        checkType: "code",
      });
    }
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: "pass",
      found: "영어 문자 흔적 있음",
      suggest: "필수 문구가 영어로 읽히는지 확인하세요.",
      checkType: "code",
    });
  }

  if (rule.id === "US-010") {
    const hit = hasContact(text);
    if (hit) {
      const snippetSrc =
        text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ||
        text.match(/\b1[-.\s]?800[-.\s]?\d{3}[-.\s]?\d{4}\b/)?.[0] ||
        text.match(/\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/)?.[0] ||
        text.match(/\bwww\.[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ||
        hit;
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: "pass",
        found: formatFoundSnippet(text, snippetSrc),
        suggest: "책임자 국내 연락처인지 확인하세요.",
        checkType: "code",
      });
    }
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: rule.failStatus,
      found: "전화·이메일 등 연락처를 찾지 못함",
      suggest: rule.fixKo || "부작용 신고 연락처를 확인하세요.",
      checkType: "code",
    });
  }

  if (rule.id === "US-011" && input.professionalUse) {
    const hit = rule.lookFor.find((p) => includesUs(text, p));
    if (hit) {
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: "pass",
        found: formatFoundSnippet(text, hit),
        suggest: "전문가용 표기 위치를 확인하세요.",
        checkType: "code",
      });
    }
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: "attention",
      found: "For Professional Use Only 문구를 찾지 못함",
      suggest: rule.fixKo || "전문가용 표기를 확인하세요.",
      checkType: "code",
      fixKind: "fix",
    });
  }

  if (rule.id === "US-009" && input.hazardous) {
    const hit = rule.lookFor.find((p) => includesUs(text, p));
    if (hit) {
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: "pass",
        found: formatFoundSnippet(text, hit),
        suggest: "제품 유형에 맞는 경고인지 확인하세요.",
        checkType: "code",
      });
    }
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: "attention",
      found: "위험 제품 경고 단서를 찾지 못함",
      suggest: rule.fixKo || "Warning/Caution 표기를 확인하세요.",
      checkType: "code",
    });
  }

  if (rule.id === "US-013") {
    const hit = hasDrugClaim(text, rule.lookFor);
    if (hit) {
      return withFix(rule, {
        category: "US",
        label: rule.title,
        status: "attention",
        found: formatFoundSnippet(text, hit),
        suggest: "의약품 주장으로 오인될 수 있는지 확인하세요.",
        checkType: "code",
        fixKind: "soften",
      });
    }
    return withFix(rule, {
      category: "US",
      label: rule.title,
      status: "pass",
      found: "해당 주의 문구 키워드 없음",
      suggest: "광고 문구를 주기적으로 재확인하세요.",
      checkType: "code",
    });
  }

  return null;
}

export async function runLabelCheckUs494(
  buffer: Buffer,
  input: LabelCheckInput,
): Promise<LabelCheckResult> {
  if (input.otcDrugLike) {
    return {
      disclaimer: usDisclaimer(),
      readable: true,
      charCount: 0,
      hangulCount: 0,
      notice: NOTICE_OTC_US_494,
      skipJudgment: true,
      summary: EMPTY_SUMMARY,
      findings: [],
      manualItems: [],
      market: "US",
    };
  }

  const extracted = await extractLabelPdf(buffer);

  if (extracted.charCount === 0) {
    return {
      disclaimer: usDisclaimer(),
      readable: false,
      charCount: 0,
      hangulCount: 0,
      notice: NOTICE_OUTLINE_485,
      skipJudgment: true,
      summary: EMPTY_SUMMARY,
      findings: [],
      manualItems: [],
      market: "US",
    };
  }

  // 미국 모드는 영어 본문 기준. 한글만 극소+영문 없으면 안내는 US-007에서.
  if (!extracted.readable && extracted.charCount < 40) {
    return {
      disclaimer: usDisclaimer(),
      readable: false,
      charCount: extracted.charCount,
      hangulCount: extracted.hangulCount,
      notice: NOTICE_OUTLINE_485,
      skipJudgment: true,
      summary: EMPTY_SUMMARY,
      findings: [],
      manualItems: [],
      market: "US",
    };
  }

  const rules = loadUsLabelRules494();
  const findings: Finding[] = [];
  const manualItems: LabelCheckResult["manualItems"] = [];

  for (const rule of rules) {
    if (rule.checkType === "code") {
      const f = runUsCodeRule(rule, extracted.text, extracted, input);
      if (f) findings.push(f);
    } else {
      // 조건부 manual
      if (rule.needsImported && !input.imported) continue;
      if (rule.needsProfessional && !input.professionalUse) continue;
      if (rule.needsHazardous && !input.hazardous) continue;
      manualItems.push({
        category: "US",
        label: rule.title,
        suggest: "확인 필요 질문: " + (rule.requirement || "해당 항목을 확인하세요."),
        fixSuggestion: rule.fixKo || undefined,
        fixExample: rule.fixExampleEn || undefined,
      });
    }
  }

  // 한글만 PDF에서 영문 안내가 겹치면 NOTICE 보조(판정은 US-007)
  void NOTICE_NO_HANGUL_485;
  void MIN_HANGUL_CHARS_485;

  return {
    disclaimer: usDisclaimer(),
    readable: true,
    charCount: extracted.charCount,
    hangulCount: extracted.hangulCount,
    skipJudgment: false,
    summary: summarize(findings, manualItems.length),
    findings,
    manualItems,
    market: "US",
  };
}

export async function runLabelCheckUsText494(
  text: string,
  input: LabelCheckInput,
): Promise<LabelCheckResult> {
  const buf = Buffer.from(
    `%PDF-1.4\n%%EOF\n%LABELCHECK_TEXT_BEGIN%\n${text}\n%LABELCHECK_TEXT_END%\n`,
    "utf8",
  );
  return runLabelCheckUs494(buf, input);
}
