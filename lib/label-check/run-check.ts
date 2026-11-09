/**
 * 484 — 규칙표 check_type=code 검사.
 * 패턴은 load-rules가 title/rule/examples에서 유도. 내부 id는 응답에 넣지 않음.
 */
import {
  extractLabelPdf,
  normalizeLabelText,
  type ExtractedPdf,
} from "@/lib/label-check/extract-pdf";
import { FOUND_CONFIRMED_488, formatFoundSnippet } from "@/lib/label-check/format-found";
import { loadAllergens483, loadLabelRules483, type RuleDraft } from "@/lib/label-check/load-rules";
import {
  DISCLAIMER_483,
  MIN_HANGUL_CHARS_485,
  NOTICE_NO_HANGUL_485,
  NOTICE_OUTLINE_485,
  type CheckStatus,
  type Finding,
  type LabelCheckInput,
  type LabelCheckResult,
  type LabelCheckSummary,
} from "@/lib/label-check/types";

const EMPTY_SUMMARY: LabelCheckSummary = {
  possible: 0,
  attention: 0,
  unknown: 0,
  pass: 0,
  manual: 0,
};

function noticeOnlyResult(
  extracted: { charCount: number; hangulCount: number },
  notice: string,
): LabelCheckResult {
  return {
    disclaimer: DISCLAIMER_483,
    readable: false,
    charCount: extracted.charCount,
    hangulCount: extracted.hangulCount,
    notice,
    skipJudgment: true,
    summary: EMPTY_SUMMARY,
    findings: [],
    manualItems: [],
  };
}

function includesNormalized(text: string, word: string): boolean {
  if (!word) return false;
  const nText = normalizeLabelText(text);
  const nWord = normalizeLabelText(word);
  if (!nWord) return false;
  if (nText.includes(nWord)) return true;
  // 원문도 시도(영문 LOT 등)
  return text.includes(word) || text.toLowerCase().includes(word.toLowerCase());
}

function includesAny(text: string, words: string[]): string | null {
  for (const w of words) {
    if (includesNormalized(text, w)) return w;
  }
  return null;
}

/** 통과: 짧은 확인 문구. 그 외: 읽기 쉬운 조각(판정 불변, 표시만). */
function foundPass(): string {
  return FOUND_CONFIRMED_488;
}

function foundIssue(text: string, hit: string): string {
  return formatFoundSnippet(text, hit);
}

function applies(rule: RuleDraft, input: LabelCheckInput, text: string): boolean {
  if (rule.requiresFunctional && !input.functional) return false;
  if (rule.triggerPatterns?.length) {
    return Boolean(includesAny(text, rule.triggerPatterns));
  }
  return true;
}

function findAllergens(text: string): Array<{ name: string; hit: string; sizePt?: number }> {
  const { allergens } = loadAllergens483();
  const hits: Array<{ name: string; hit: string; sizePt?: number }> = [];
  for (const a of allergens) {
    const names = [a.ko, a.inci].filter(Boolean);
    for (const n of names) {
      if (includesNormalized(text, n)) {
        hits.push({ name: `${a.ko}(${a.inci})`, hit: n });
        break;
      }
    }
  }
  return hits;
}

/** 전성분 라벨 이후~다음 주요 항목 전까지의 글자 크기. 식별 실패 시 null */
export function ingredientRegionSizes(
  extracted: ExtractedPdf,
): { sizes: number[]; via: "items" | "fallback" } | null {
  const items = extracted.textItems;
  if (!items?.length) {
    // 아이템 없으면 전역 크기로 대체하지 않음(통과 금지 경로 = null)
    return null;
  }
  const joined = items.map((i) => i.text).join("");
  const normJoined = normalizeLabelText(joined);
  const startKeys = ["전성분", "ingredients"];
  let start = -1;
  let startKeyLen = 0;
  for (const k of startKeys) {
    const nk = normalizeLabelText(k);
    const idx = normJoined.indexOf(nk);
    if (idx >= 0 && (start < 0 || idx < start)) {
      start = idx;
      startKeyLen = nk.length;
    }
  }
  if (start < 0) return null;

  const endKeys = [
    "사용할때의주의사항",
    "주의사항",
    "내용량",
    "제조번호",
    "사용기한",
    "개봉후",
    "가격",
    "바코드",
    "화장품책임판매업자",
    "책임판매업자",
  ];
  let end = normJoined.length;
  for (const k of endKeys) {
    const nk = normalizeLabelText(k);
    const idx = normJoined.indexOf(nk, start + startKeyLen);
    if (idx >= 0 && idx < end) end = idx;
  }

  // norm 인덱스 → 원문 아이템 구간 근사: 누적 normalize 길이로 매핑
  const sizes: number[] = [];
  let normPos = 0;
  for (const it of items) {
    const n = normalizeLabelText(it.text);
    if (!n) continue;
    const a = normPos;
    const b = normPos + n.length;
    normPos = b;
    if (b <= start + startKeyLen) continue;
    if (a >= end) break;
    if (it.sizePt > 0) sizes.push(it.sizePt);
  }
  return { sizes, via: "items" };
}

function allergenSizes(
  extracted: ExtractedPdf,
  hits: Array<{ hit: string }>,
): number[] {
  if (!extracted.textItems?.length) return [];
  const sizes: number[] = [];
  for (const h of hits) {
    const needle = normalizeLabelText(h.hit);
    // 글자 단위 아이템을 이어 붙여 검색
    let buf = "";
    let bufSizes: number[] = [];
    for (const it of extracted.textItems) {
      buf += it.text;
      bufSizes.push(it.sizePt);
      const normBuf = normalizeLabelText(buf);
      if (normBuf.includes(needle)) {
        // 최근 needle 길이만큼의 사이즈
        const approx = bufSizes.slice(-Math.max(needle.length, 1));
        sizes.push(...approx);
        buf = "";
        bufSizes = [];
      }
      if (buf.length > 80) {
        buf = buf.slice(-40);
        bufSizes = bufSizes.slice(-40);
      }
    }
  }
  return sizes;
}

function runCodeRule(
  rule: RuleDraft,
  text: string,
  extracted: ExtractedPdf,
  input: LabelCheckInput,
): Finding | null {
  if (!applies(rule, input, text) && rule.mode !== "skip_info") {
    // trigger 없는 conditional → 해당 없음으로 통과 취급하지 않고 스킵
    if (rule.triggerPatterns?.length || rule.requiresFunctional) return null;
  }
  if (rule.requiresFunctional && !input.functional) return null;
  if (rule.triggerPatterns?.length && !includesAny(text, rule.triggerPatterns)) return null;

  const suggestDefault = "해당 항목을 확인하세요.";

  if (rule.mode === "skip_info") {
    return null; // 자동 판정 대상 아님 → manual로 이미 빠지거나 생략
  }

  if (rule.mode === "allergen") {
    const hits = findAllergens(text);
    if (!hits.length) {
      const frag = includesAny(text, rule.patterns);
      if (frag) {
        return {
          category: rule.category,
          label: rule.label,
          status: "attention",
          found: `향료 관련(“${frag}”) — 알레르기 개별 성분 표기 여부 확인 필요`,
          suggest: "함량 기준·표시 의무는 제품 유형에 따라 다를 수 있습니다.",
          checkType: "code",
        };
      }
      return {
        category: rule.category,
        label: rule.label,
        status: "pass",
        found: "알레르기 초안 목록과 일치하는 표기 없음",
        suggest: "함량 기준·표시 의무는 제품 유형에 따라 다를 수 있습니다.",
        checkType: "code",
      };
    }
    const sizes = allergenSizes(extracted, hits);
    const minPt = 5;
    const small = sizes.filter((s) => s > 0 && s < minPt);
    const sizeNote = sizes.length
      ? small.length
        ? ` / 글자 크기 약 ${[...new Set(sizes)].join(",")}pt — ${minPt}pt 미만 확인 필요`
        : ` / 글자 크기 약 ${[...new Set(sizes)].join(",")}pt`
      : extracted.fontSizesPt
        ? ""
        : " / 글자 크기 확인 불가";
    return {
      category: rule.category,
      label: rule.label,
      status: "attention",
      found: hits.map((h) => h.name).join(", ") + sizeNote,
      suggest: "함량·표시 의무와 글자 크기(5포인트 이상)를 확인하세요.",
      checkType: "code",
    };
  }

  if (rule.mode === "forbidden_phrase") {
    const hit = includesAny(text, rule.patterns);
    if (!hit) {
      return {
        category: rule.category,
        label: rule.label,
        status: "pass",
        found: "해당 주의 문구 키워드 없음",
        suggest: "광고·표시 문구를 주기적으로 재확인하세요.",
        checkType: "code",
      };
    }
    return {
      category: rule.category,
      label: rule.label,
      status: "attention",
      found: foundIssue(text, hit),
      suggest: "오인 우려 표현인지 확인하세요.",
      checkType: "code",
    };
  }

  if (rule.mode === "functional_mark") {
    const hit = includesAny(text, rule.patterns);
    if (hit) {
      return {
        category: rule.category,
        label: rule.label,
        status: "pass",
        found: foundPass(),
        suggest: "기능성 도안·효능 문구도 함께 확인하세요.",
        checkType: "code",
      };
    }
    return {
      category: rule.category,
      label: rule.label,
      status: rule.failStatus,
      found: "‘기능성화장품’ 표기를 찾지 못함",
      suggest: suggestDefault,
      checkType: "code",
    };
  }

  if (rule.mode === "font_size") {
    // 492 — 전성분 영역 글자만 측정. 영역 식별 불가 → 확인 불가(통과 금지)
    const region = ingredientRegionSizes(extracted);
    if (!region) {
      return {
        category: rule.category,
        label: rule.label,
        status: "unknown",
        found: "전성분 영역 글자 크기를 구분할 수 없음",
        suggest: "글자 크기를 확인할 수 없어 확인 불가합니다. 통과로 보지 마세요.",
        checkType: "code",
      };
    }
    const sizes = region.sizes;
    if (!sizes.length) {
      return {
        category: rule.category,
        label: rule.label,
        status: "unknown",
        found: "전성분 영역에서 크기를 읽지 못함",
        suggest: "글자 크기를 확인할 수 없어 확인 불가합니다. 통과로 보지 마세요.",
        checkType: "code",
      };
    }
    const minPt = rule.min_pt ?? 5;
    // Chromium 등에서 5pt가 4.99로 나오는 오차 → 소수 1자리 반올림 후 비교(4.9 실패·5.0 통과)
    const tooSmall = sizes.filter((s) => Math.round(s * 10) / 10 < minPt);
    if (tooSmall.length) {
      return {
        category: rule.category,
        label: rule.label,
        status: "possible",
        found: `전성분 영역 크기(pt): ${[...new Set(sizes)].slice(0, 10).join(", ")} — ${minPt}pt 미만 ${tooSmall.length}건`,
        suggest: `${minPt}pt 이상인지 확인하세요.`,
        checkType: "code",
      };
    }
    return {
      category: rule.category,
      label: rule.label,
      status: "pass",
      found: `전성분 영역 크기(pt): ${[...new Set(sizes)].slice(0, 10).join(", ")}`,
      suggest: "추출된 크기이며 인쇄물과 다를 수 있습니다.",
      checkType: "code",
    };
  }

  if (rule.mode === "product_name") {
    // 한글 2자 이상 또는 영문 제품명 흔적
    const hasName = /[가-힣]{2,}/.test(text) || /[A-Za-z]{3,}/.test(text);
    return {
      category: rule.category,
      label: rule.label,
      status: hasName ? "pass" : rule.failStatus,
      found: hasName ? foundPass() : "제품 명칭으로 보이는 표기를 찾지 못함",
      suggest: "다른 제품과 구별되는 명칭인지 확인하세요.",
      checkType: "code",
    };
  }

  if (rule.mode === "address") {
    const org = includesAny(text, rule.patterns);
    // 행정구역·도로명 단서(단순 '시'/'로' 한글자·숫자만으로는 오탐)
    const hasStreet =
      includesNormalized(text, "특별시") ||
      includesNormalized(text, "광역시") ||
      includesNormalized(text, "특별자치") ||
      /[가-힣]+(시|군|구)[가-힣]*(로|길)/.test(text) ||
      /[가-힣]+(시|군|구)/.test(text);
    if (org && hasStreet) {
      return {
        category: rule.category,
        label: rule.label,
        status: "pass",
        found: foundPass(),
        suggest: "등록 소재지·반품 교환지와 일치하는지 확인하세요.",
        checkType: "code",
      };
    }
    if (org) {
      return {
        category: rule.category,
        label: rule.label,
        status: "attention",
        found: `${foundIssue(text, org)} — 주소 표기 확인 필요`,
        suggest: "상호와 주소를 구분해 표시했는지 확인하세요.",
        checkType: "code",
      };
    }
    return {
      category: rule.category,
      label: rule.label,
      status: rule.failStatus,
      found: "관련 표기를 찾지 못함",
      suggest: suggestDefault,
      checkType: "code",
    };
  }

  if (rule.mode === "lot") {
    const hit = includesAny(text, rule.patterns);
    // LOT2411A · L/N:A123 형태
    const lotCode =
      hit ||
      text.match(/\bLOT[.\s\-:]?[A-Za-z0-9]+\b/i)?.[0] ||
      text.match(/\bL\s*\/\s*N\s*[:\-]?\s*[A-Za-z0-9]+/i)?.[0] ||
      null;
    if (lotCode) {
      return {
        category: rule.category,
        label: rule.label,
        status: "pass",
        found: foundPass(),
        suggest: "사용기한과 구별되는지 확인하세요.",
        checkType: "code",
      };
    }
    return {
      category: rule.category,
      label: rule.label,
      status: rule.failStatus,
      found: "관련 표기를 찾지 못함",
      suggest: suggestDefault,
      checkType: "code",
    };
  }

  if (rule.mode === "expiry") {
    const hit = includesAny(text, rule.patterns);
    // 규칙 문구: 연월일·개월·개봉 후 기간(+심벌 M)·EXP 등
    const dateLike =
      /\d{4}\s*[.\-/년]\s*\d{1,2}/.test(text) ||
      /\d+\s*개월/.test(text) ||
      /개봉\s*후\s*\d+\s*(개월|월|M)/i.test(text) ||
      /\b\d{1,2}\s*M\b/i.test(text) ||
      /EXP\.?\s*\d{4}/i.test(text) ||
      includesNormalized(text, "제조일로부터");
    if (hit || dateLike) {
      return {
        category: rule.category,
        label: rule.label,
        status: "pass",
        found: foundPass(),
        suggest: "사용기한/개봉 후 사용기간 형식을 확인하세요.",
        checkType: "code",
      };
    }
    return {
      category: rule.category,
      label: rule.label,
      status: rule.failStatus,
      found: "관련 표기를 찾지 못함",
      suggest: suggestDefault,
      checkType: "code",
    };
  }

  // presence / conditional_presence
  const keys = rule.patterns ?? [];
  let hit = includesAny(text, keys);
  // 용량·중량: 숫자+단위(규칙 문구의 용량/중량 표시). 단독 'g'/'ml' 영문 오탐 방지
  if (!hit && (rule.label.includes("용량") || rule.label.includes("중량"))) {
    const unit = text.match(/\d+(?:\.\d+)?\s*(?:mL|ml|㎖|g|그램|fl\.?\s*oz\.?)\b/i);
    if (unit) hit = unit[0];
  }
  if (hit) {
    return {
      category: rule.category,
      label: rule.label,
      status: "pass",
      found: foundPass(),
      suggest: "표기 형식·누락 여부를 한 번 더 확인하세요.",
      checkType: "code",
    };
  }
  return {
    category: rule.category,
    label: rule.label,
    status: rule.failStatus,
    found: "관련 표기를 찾지 못함",
    suggest: suggestDefault,
    checkType: "code",
  };
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

export async function runLabelCheck483(
  buffer: Buffer,
  input: LabelCheckInput,
): Promise<LabelCheckResult> {
  const extracted = await extractLabelPdf(buffer);

  // 0자·극소 한글: 아웃라인/스캔 가능 → 판정 없이 안내만(위반 가능 폭탄 방지)
  if (extracted.charCount === 0 || extracted.hangulCount < MIN_HANGUL_CHARS_485) {
    // 영문만 충분히 읽힌 경우: 한글 미검출 안내 + 판정 보류
    if (extracted.charCount >= 40 && extracted.hangulCount < MIN_HANGUL_CHARS_485) {
      return noticeOnlyResult(extracted, NOTICE_NO_HANGUL_485);
    }
    return noticeOnlyResult(extracted, NOTICE_OUTLINE_485);
  }

  if (!extracted.readable) {
    return noticeOnlyResult(extracted, NOTICE_OUTLINE_485);
  }

  const rules = loadLabelRules483();
  const findings: Finding[] = [];
  const manualItems: LabelCheckResult["manualItems"] = [];

  for (const rule of rules) {
    if (rule.check_type === "code") {
      const f = runCodeRule(rule, extracted.text, extracted, input);
      if (f) findings.push(f);
    } else {
      manualItems.push({
        category: rule.category,
        label: rule.label,
        suggest: "수동 확인이 필요합니다.",
      });
    }
  }

  // 면책·단정 금지: status에 '위반' 문자열 없음(possible=위반 가능)
  return {
    disclaimer: DISCLAIMER_483,
    readable: true,
    charCount: extracted.charCount,
    hangulCount: extracted.hangulCount,
    skipJudgment: false,
    summary: summarize(findings, manualItems.length),
    findings,
    manualItems,
  };
}

/** 회귀·로컬: 텍스트만으로 검사(레거시 마커 PDF와 동일 형식) */
export async function runLabelCheckText483(
  text: string,
  input: LabelCheckInput,
): Promise<LabelCheckResult> {
  const buf = Buffer.from(
    `%PDF-1.4\n%%EOF\n%LABELCHECK_TEXT_BEGIN%\n${text}\n%LABELCHECK_TEXT_END%\n`,
    "utf8",
  );
  return runLabelCheck483(buf, input);
}

export type { CheckStatus };
