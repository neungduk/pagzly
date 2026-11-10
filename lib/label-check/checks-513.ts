/**
 * 513 — 해당 시 코드 판정(긍정 증거 있을 때만 pass).
 * 규칙 JSON·외부 AI 미사용. 근거 문자열 없으면 pass 금지.
 */
import type { ExtractedPdf } from "@/lib/label-check/extract-pdf";
import { formatFoundSnippet } from "@/lib/label-check/format-found";
import {
  extractIngredientsRegionText506,
  parseIngredientList506,
} from "@/lib/label-check/ingredients-parse";
import { includesUs } from "@/lib/label-check/normalize-us";
import type { Finding, LabelCheckInput } from "@/lib/label-check/types";

const COLORANT_RE =
  /\bCI\s*\d{5}\b|적색\s*\d+\s*호|황색\s*\d+\s*호|청색\s*\d+\s*호|녹색\s*\d+\s*호|오렌지\s*\d+\s*호|자색\s*\d+\s*호/i;
const PLUS_MINUS_RE = /±|\+\/\-|\+\s*\/\s*\-|（±）|\(\s*±\s*\)/;

const NEUTRALIZER_RE =
  /수산화나트륨|수산화칼륨|트리에탄올아민|아르기닌|소듐하이드록사이드|potassium\s+hydroxide|sodium\s+hydroxide|triethanolamine/i;
const SOAP_CUE_RE = /비누|지방산염|비누화/;

const SET_CUE_RE = /세트|SET\b|set\b|구성품|증정|기획/;

/** 영문 INCI만(한글 없음) + 오타 의심 */
const EN_ONLY_INCI_RE = /^[A-Za-z][A-Za-z0-9\s\-\/().]+$/;
const TYPO_SUSPECT_RE = /[0-9]{3,}|[!@#$%^&*_]{2,}/;

export function hasProductType513(input: LabelCheckInput, id: string): boolean {
  return (input.productTypes || []).includes(id);
}

export function detectSetProduct513(text: string, input: LabelCheckInput): boolean {
  return hasProductType513(input, "set_product") || SET_CUE_RE.test(text);
}

export function detectColorMakeup513(text: string, input: LabelCheckInput): boolean {
  if (hasProductType513(input, "color_makeup")) return true;
  const body = extractIngredientsRegionText506(text, "KR") || text;
  return COLORANT_RE.test(body);
}

export function detectNeutralizerOrSoap513(text: string, input: LabelCheckInput): boolean {
  if (hasProductType513(input, "soap")) return true;
  const body = extractIngredientsRegionText506(text, "KR") || text;
  return NEUTRALIZER_RE.test(body) || SOAP_CUE_RE.test(body);
}

export function detectFunctionalPhrase513(text: string, input: LabelCheckInput): boolean {
  return Boolean(input.functional) || /기능성화장품/.test(text);
}

export function detectOtherIngredientPhrase513(text: string): boolean {
  const body = extractIngredientsRegionText506(text, "KR") || text;
  return /기타\s*성분|기타성분/.test(body);
}

export function detectHazardousUs513(text: string, input: LabelCheckInput): boolean {
  if (input.hazardous || hasProductType513(input, "hazardous") || hasProductType513(input, "aerosol")) {
    return true;
  }
  return /\baerosol\b|\bpressurized\b|\bflammable\b|\bspray\b/i.test(text);
}

export function detectProfessionalUs513(text: string, input: LabelCheckInput): boolean {
  if (input.professionalUse || hasProductType513(input, "professional")) return true;
  return /\bprofessional\b/i.test(text);
}

/** 세트 상품 제조번호·사용기한 */
export function checkSetProduct513(text: string): Finding {
  const hasLot = /제조번호|\bLOT\b|\bLot\b|L\/N/i.test(text);
  const hasExpiry = /사용기한|개봉\s*후|EXP|PAO|제조일로부터/i.test(text);
  const hasSeparateNote = /제품에\s*별도\s*표시|별도\s*표시/.test(text);
  if (hasLot && hasExpiry) {
    return {
      category: "세트상품",
      label: "세트 상품 제조번호·사용기한 표기",
      status: "pass",
      found: formatFoundSnippet(text, hasSeparateNote ? "별도 표시" : "제조번호") || "제조번호·사용기한 단서 확인",
      suggest: "세트 외부에 가장 빠른 사용기한과 구성품별/통합 제조번호가 맞는지 한 번 더 보세요.",
      checkType: "code",
      checkKey: "lbl:세트 상품 제조번호·사용기한 표기",
    };
  }
  if (hasLot || hasExpiry || hasSeparateNote) {
    return {
      category: "세트상품",
      label: "세트 상품 제조번호·사용기한 표기",
      status: "attention",
      found: hasLot
        ? "제조번호 단서만 확인"
        : hasExpiry
          ? "사용기한 단서만 확인"
          : "별도 표시 안내만 확인",
      suggest: "세트면 제조번호(각각 또는 통합)와 가장 빠른 사용기한을 함께 확인하세요.",
      checkType: "code",
      checkKey: "lbl:세트 상품 제조번호·사용기한 표기",
      fixSuggestion: "사용기한: 제품에 별도 표시",
      fixKind: "fix",
    };
  }
  return {
    category: "세트상품",
    label: "세트 상품 제조번호·사용기한 표기",
    status: "attention",
    found: "세트 단서는 있으나 제조번호·사용기한을 찾지 못함",
    suggest: "세트 외부에 제조번호와 가장 빠른 사용기한을 표시했는지 확인하세요.",
    checkType: "code",
    checkKey: "lbl:세트 상품 제조번호·사용기한 표기",
    fixSuggestion: "사용기한: 제품에 별도 표시",
    fixKind: "fix",
  };
}

/** 색조 착색제 ± */
export function checkColorantPlusMinus513(text: string): Finding {
  const body = extractIngredientsRegionText506(text, "KR") || text;
  const colorHit = body.match(COLORANT_RE)?.[0] || null;
  const hasPm = PLUS_MINUS_RE.test(body);
  if (colorHit && hasPm) {
    return {
      category: "성분",
      label: "색조 제품 착색제 ± 표기",
      status: "pass",
      found: formatFoundSnippet(body, colorHit) || colorHit,
      suggest: "호수별 착색제 목록이 ± 뒤에 모두 있는지 확인하세요.",
      checkType: "code",
      checkKey: "lbl:색조 제품 착색제 ± 표기",
    };
  }
  if (colorHit && !hasPm) {
    return {
      category: "성분",
      label: "색조 제품 착색제 ± 표기",
      status: "possible",
      found: formatFoundSnippet(body, colorHit) || colorHit,
      suggest: "호수별 착색제가 다르면 ± 또는 +/- 뒤에 사용된 착색제를 함께 적으세요.",
      checkType: "code",
      checkKey: "lbl:색조 제품 착색제 ± 표기",
      fixSuggestion: "± 뒤에 사용된 모든 착색제를 나열하세요.",
      fixExample: `± ${colorHit}`,
      fixKind: "fix",
    };
  }
  // 옵션만으로 해당: 착색제 미검출 → 확인 못 함(통과 금지)
  return {
    category: "성분",
    label: "색조 제품 착색제 ± 표기",
    status: "unknown",
    found: "착색제 단서를 라벨 텍스트에서 찾지 못함",
    suggest: "색조 제품이면 착색제와 ± 표기를 인쇄본에서 확인하세요.",
    checkType: "code",
    checkKey: "lbl:색조 제품 착색제 ± 표기",
  };
}

/** 제조번호와 사용기한 구별(항상) */
export function checkLotExpiryDistinct513(text: string): Finding {
  const merged =
    /LOT\s*[\/·]\s*EXP|제조번호\s*[\/·]\s*사용기한|사용기한\s*[\/·]\s*제조번호|Lot\s*\/\s*Exp/i.test(
      text,
    );
  const hasLotName = /제조번호|\bLOT\b|\bLot\b|L\/N/i.test(text);
  const hasExpName = /사용기한|개봉\s*후|\bEXP\b|\bPAO\b/i.test(text);
  if (merged) {
    return {
      category: "표시사항",
      label: "제조번호와 사용기한 구별 표시",
      status: "attention",
      found: "제조번호·사용기한이 한 항목처럼 붙은 표기 확인",
      suggest: "제조번호와 사용기한을 서로 다른 항목 이름으로 구분해 표시했는지 확인하세요.",
      checkType: "code",
      checkKey: "lbl:제조번호와 사용기한 구별 표시",
    };
  }
  if (hasLotName && hasExpName) {
    return {
      category: "표시사항",
      label: "제조번호와 사용기한 구별 표시",
      status: "pass",
      found: "제조번호·사용기한 항목 이름 각각 확인",
      suggest: "값까지 구별돼 있는지 한 번 더 확인하세요.",
      checkType: "code",
      checkKey: "lbl:제조번호와 사용기한 구별 표시",
    };
  }
  return {
    category: "표시사항",
    label: "제조번호와 사용기한 구별 표시",
    status: "attention",
    found: "제조번호·사용기한 항목 이름을 모두 찾지 못함",
    suggest: "두 항목이 서로 다른 이름으로 표시됐는지 확인하세요.",
    checkType: "code",
    checkKey: "lbl:제조번호와 사용기한 구별 표시",
  };
}

export function checkNeutralizerGuide513(text: string): Finding {
  const body = extractIngredientsRegionText506(text, "KR") || text;
  const hit =
    body.match(NEUTRALIZER_RE)?.[0] || body.match(SOAP_CUE_RE)?.[0] || "중화·비누화 단서";
  return {
    category: "성분",
    label: "중화·비누화 생성물 표기",
    status: "attention",
    found: formatFoundSnippet(body, hit) || hit,
    suggest:
      "pH 조절·비누화 성분은 중화 반응 생성물·비누화 생성물로 표시할 수 있어요. 표기 방식을 확인하세요.",
    checkType: "code",
    checkKey: "lbl:중화·비누화 생성물 표기",
  };
}

export function checkOtherIngredient513(text: string): Finding {
  return {
    category: "성분",
    label: "기타 성분 표기",
    status: "attention",
    found: "「기타 성분」 표기 확인",
    suggest: "식약처 인정을 받은 경우에만 쓸 수 있어요. 인정 없이 쓰지 마세요.",
    checkType: "code",
    checkKey: "lbl:기타 성분 표기",
    fixSuggestion: "식약처 인정 없이 '기타 성분'을 쓰지 마세요.",
    fixKind: "soften",
  };
}

/** 기능성화장품 문구 크기(위치는 좌표 없어 별도 manual) */
export function checkFunctionalSize513(
  text: string,
  extracted: ExtractedPdf,
): Finding {
  if (extracted.ocrSizeUnknown || !extracted.textItems?.length) {
    return {
      category: "기능성",
      label: "기능성화장품 문구 위치·크기",
      status: "unknown",
      found: "글자 크기 정보를 쓸 수 없음",
      suggest: "인쇄본에서 '기능성화장품'과 바로 아래 문구 크기가 같거나 더 큰지 확인하세요.",
      checkType: "code",
      checkKey: "lbl:기능성화장품 문구 위치·크기",
    };
  }
  const items = extracted.textItems;
  let funcIdx = -1;
  for (let i = 0; i < items.length; i++) {
    if (items[i].text.includes("기능성화장품")) {
      funcIdx = i;
      break;
    }
  }
  if (funcIdx < 0) {
    // 옵션만 해당
    return {
      category: "기능성",
      label: "기능성화장품 문구 위치·크기",
      status: "unknown",
      found: "기능성화장품 문구를 텍스트에서 찾지 못함",
      suggest: "기능성이면 문구와 바로 아래 안내 문구 크기를 확인하세요.",
      checkType: "code",
      checkKey: "lbl:기능성화장품 문구 위치·크기",
    };
  }
  const funcSize = items[funcIdx].sizePt;
  // 바로 다음 비어 있지 않은 아이템을 "아래 문구" 후보로
  let belowSize: number | null = null;
  for (let j = funcIdx + 1; j < Math.min(items.length, funcIdx + 8); j++) {
    if (items[j].text.trim() && items[j].sizePt > 0) {
      belowSize = items[j].sizePt;
      break;
    }
  }
  if (!(funcSize > 0) || belowSize == null) {
    return {
      category: "기능성",
      label: "기능성화장품 문구 위치·크기",
      status: "unknown",
      found: "기능성화장품 근처 글자 크기 비교 불가",
      suggest: "바로 아래 문구가 같은 크기 이상인지 인쇄본에서 확인하세요.",
      checkType: "code",
      checkKey: "lbl:기능성화장품 문구 위치·크기",
    };
  }
  if (belowSize + 0.05 >= funcSize) {
    return {
      category: "기능성",
      label: "기능성화장품 문구 위치·크기",
      status: "pass",
      found: `기능성화장품 ${funcSize}pt / 아래 후보 ${belowSize}pt`,
      suggest: "바로 아래인지(위치)는 좌표가 없어 따로 확인하세요.",
      checkType: "code",
      checkKey: "lbl:기능성화장품 문구 위치·크기",
    };
  }
  return {
    category: "기능성",
    label: "기능성화장품 문구 위치·크기",
    status: "possible",
    found: `기능성화장품 ${funcSize}pt / 아래 후보 ${belowSize}pt — 아래가 더 작음`,
    suggest: "기능성화장품 글자 바로 아래 문구를 같은 크기 이상으로 키우세요.",
    checkType: "code",
    checkKey: "lbl:기능성화장품 문구 위치·크기",
    fixKind: "fix",
  };
}

export function checkStandardKoreanInci513(text: string): {
  finding: Finding | null;
  englishOnlyCount: number;
} {
  const body = extractIngredientsRegionText506(text, "KR");
  if (!body) {
    return { finding: null, englishOnlyCount: 0 };
  }
  const parts = parseIngredientList506(body);
  const enOnly = parts.filter((p) => {
    const t = p.trim();
    if (!t || /[가-힣]/.test(t)) return false;
    return EN_ONLY_INCI_RE.test(t) || TYPO_SUSPECT_RE.test(t);
  });
  if (!enOnly.length) {
    return { finding: null, englishOnlyCount: 0 };
  }
  const sample = enOnly[0];
  return {
    englishOnlyCount: enOnly.length,
    finding: {
      category: "성분",
      label: "표준 국문 성분명 사용",
      status: "attention",
      found: formatFoundSnippet(body, sample) || sample,
      suggest: `표준 국문명으로 바꿔 보세요: 영문 ${enOnly.length}개`,
      checkType: "code",
      checkKey: "lbl:표준 국문 성분명 사용",
      fixSuggestion: "영문만 있는 성분은 표준 국문명으로 바꿔 보세요.",
      fixKind: "soften",
    },
  };
}

/** US-001 제품명 후보(가장 큰 글자) */
export function checkUsProductName513(extracted: ExtractedPdf): Finding {
  if (extracted.ocrSizeUnknown || !extracted.textItems?.length) {
    return {
      category: "US",
      label: "제품명(주 표시면)",
      status: "unknown",
      found: "글자 크기 정보가 없어 제품명 후보를 고를 수 없음",
      suggest: "주 표시면에서 가장 큰 영문 제품명을 직접 확인하세요.",
      checkType: "code",
      checkKey: "US-001",
    };
  }
  let best = extracted.textItems[0];
  for (const it of extracted.textItems) {
    if (it.sizePt > best.sizePt && it.text.trim().length >= 2) best = it;
  }
  if (!(best.sizePt > 0) || !best.text.trim()) {
    return {
      category: "US",
      label: "제품명(주 표시면)",
      status: "unknown",
      found: "유효한 최대 글자 줄을 찾지 못함",
      suggest: "주 표시면 제품명을 직접 확인하세요.",
      checkType: "code",
      checkKey: "US-001",
    };
  }
  const candidate = best.text.trim().slice(0, 80);
  const isEn = /[A-Za-z]{2,}/.test(candidate);
  return {
    category: "US",
    label: "제품명(주 표시면)",
    status: "attention",
    found: `제품명 후보(${best.sizePt}pt): ${candidate}`,
    suggest: isEn
      ? "이 후보가 주 표시면 제품명인지 확인하세요."
      : "영문 제품명 후보가 약합니다. 주 표시면 영문명을 확인하세요.",
    checkType: "code",
    checkKey: "US-001",
  };
}

/** US-007 강화: 한글 위주 + 필수 영문 단서 */
export function checkUsEnglish513(text: string, failStatus: Finding["status"]): Finding {
  const hangul = (text.match(/[가-힣]/g) || []).length;
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const hangulHeavy = hangul >= 10 && letters < 8;
  const hasNet = /\bnet\b|\d+(?:\.\d+)?\s*(?:fl\.?\s*oz\.?|oz\.?|mL|ml|g)\b/i.test(text);
  const hasIng = /\bingredients\b/i.test(text);
  const hasBiz =
    /\bdistributed by\b|\bmanufactured (?:by|for)\b|\bpacked by\b/i.test(text);
  if (hangulHeavy) {
    return {
      category: "US",
      label: "영어 표기",
      status: failStatus,
      found: "한글 위주 라벨로 보이며 영어 필수 문구가 부족할 수 있음",
      suggest: "내용량·성분·상호 등 필수 문구를 영어로 표기하세요.",
      checkType: "code",
      checkKey: "US-007",
    };
  }
  const missing: string[] = [];
  if (!hasNet) missing.push("내용량(Net)");
  if (!hasIng) missing.push("Ingredients");
  if (!hasBiz) missing.push("상호(Distributed/Manufactured)");
  if (missing.length) {
    return {
      category: "US",
      label: "영어 표기",
      status: "attention",
      found: `영문 필수 단서 부족: ${missing.join(", ")}`,
      suggest: "필수 문구가 영어로 읽히는지 확인하세요.",
      checkType: "code",
      checkKey: "US-007",
    };
  }
  // 긍정 증거: 세 단서 모두
  return {
    category: "US",
    label: "영어 표기",
    status: "pass",
    found: "Net·Ingredients·상호 영문 단서 확인",
    suggest: "주 표시면·정보면에 영어가 읽히는지 한 번 더 확인하세요.",
    checkType: "code",
    checkKey: "US-007",
  };
}

export function checkUsSafetyWarning513(text: string): Finding | "manual" {
  const phrase = "The safety of this product has not been determined";
  if (includesUs(text, phrase) || /safety of this product has not been determined/i.test(text)) {
    return {
      category: "US",
      label: "안전성 미입증 경고",
      status: "pass",
      found: formatFoundSnippet(text, "safety of this product") || phrase,
      suggest: "경고 문구 위치를 확인하세요.",
      checkType: "code",
      checkKey: "US-008",
    };
  }
  return "manual";
}

export function checkUsHazardWarning513(text: string, lookFor: string[]): Finding {
  const hit = lookFor.find((p) => includesUs(text, p)) ||
    (/\bkeep out of reach of children\b/i.test(text) ? "Keep out of reach of children" : null) ||
    (/\bwarning\b|\bcaution\b/i.test(text) ? "Warning/Caution" : null);
  if (hit) {
    return {
      category: "US",
      label: "위험 제품 경고(에어로졸 등)",
      status: "pass",
      found: formatFoundSnippet(text, hit) || hit,
      suggest: "제품 유형에 맞는 경고인지 확인하세요.",
      checkType: "code",
      checkKey: "US-009",
    };
  }
  return {
    category: "US",
    label: "위험 제품 경고(에어로졸 등)",
    status: "attention",
    found: "위험 제품 경고 단서를 찾지 못함",
    suggest: "Warning/Caution 및 Keep out of reach of children 표기를 확인하세요.",
    checkType: "code",
    checkKey: "US-009",
  };
}

export function checkUsProfessional513(text: string, lookFor: string[]): Finding {
  const hit =
    lookFor.find((p) => includesUs(text, p)) ||
    (/\bfor professional use only\b/i.test(text) ? "For Professional Use Only" : null);
  if (hit) {
    return {
      category: "US",
      label: "전문가용 제품 표기(MoCRA)",
      status: "pass",
      found: formatFoundSnippet(text, hit) || hit,
      suggest: "전문가용 표기 위치를 확인하세요.",
      checkType: "code",
      checkKey: "US-011",
    };
  }
  return {
    category: "US",
    label: "전문가용 제품 표기(MoCRA)",
    status: "attention",
    found: "For Professional Use Only 문구를 찾지 못함",
    suggest: "전문가용 표기를 확인하세요.",
    checkType: "code",
    checkKey: "US-011",
  };
}
