/**
 * 483 — 규칙표 check_type=code 검사. 키워드는 규칙표·알레르기 JSON에서만.
 */
import { extractLabelPdf, type ExtractedPdf } from "@/lib/label-check/extract-pdf";
import { loadAllergens483, loadLabelRules483, type RuleDraft } from "@/lib/label-check/load-rules";
import {
  DISCLAIMER_483,
  type CheckStatus,
  type Finding,
  type LabelCheckInput,
  type LabelCheckResult,
  type LabelCheckSummary,
} from "@/lib/label-check/types";

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function includesAny(text: string, words: string[]): string | null {
  const lower = text.toLowerCase();
  for (const w of words) {
    if (!w) continue;
    if (text.includes(w) || lower.includes(w.toLowerCase())) return w;
  }
  return null;
}

function snippetAround(text: string, hit: string, radius = 40): string {
  const i = text.indexOf(hit);
  if (i < 0) return hit;
  const a = Math.max(0, i - radius);
  const b = Math.min(text.length, i + hit.length + radius);
  return norm(text.slice(a, b));
}

function applies(rule: RuleDraft, input: LabelCheckInput): boolean {
  const w = rule.applies_when ?? {};
  if (typeof w.functional === "boolean" && w.functional !== input.functional) return false;
  if (typeof w.rinse_off === "boolean" && w.rinse_off !== input.rinseOff) return false;
  return true;
}

function statusOf(rule: RuleDraft, ok: boolean): CheckStatus {
  if (ok) return "pass";
  return rule.keywords_fail_status ?? "possible";
}

function findAllergens(text: string): Array<{ name: string; hit: string }> {
  const { allergens } = loadAllergens483();
  const hits: Array<{ name: string; hit: string }> = [];
  const lower = text.toLowerCase();
  for (const a of allergens) {
    const names = [a.ko_draft, a.inci].filter(Boolean);
    for (const n of names) {
      if (text.includes(n) || lower.includes(n.toLowerCase())) {
        hits.push({ name: `${a.ko_draft}(${a.inci})`, hit: n });
        break;
      }
    }
  }
  return hits;
}

function runCodeRule(
  rule: RuleDraft,
  text: string,
  extracted: ExtractedPdf,
  input: LabelCheckInput,
): Finding | null {
  if (!applies(rule, input)) return null;
  const mode = rule.keywords_mode ?? "presence";
  const suggest = rule.keywords_suggest ?? "해당 항목을 확인하세요.";

  if (mode === "allergen") {
    const hits = findAllergens(text);
    if (!hits.length) {
      return {
        category: rule.category,
        label: `${rule.label} (초안)`,
        status: "pass",
        found: "알레르기 초안 목록과 일치하는 표기 없음",
        suggest: "함량 기준·표시 의무는 제품 유형에 따라 다를 수 있습니다.",
        checkType: "code",
      };
    }
    return {
      category: rule.category,
      label: `${rule.label} (초안)`,
      status: "attention",
      found: hits.map((h) => h.name).join(", "),
      suggest,
      checkType: "code",
    };
  }

  if (mode === "fragrance_allergen") {
    const frag = includesAny(text, rule.keywords ?? []);
    if (!frag) {
      return {
        category: rule.category,
        label: rule.label,
        status: "pass",
        found: "향료·착향제 표기 없음",
        suggest: "향료가 없으면 해당 없음으로 볼 수 있습니다.",
        checkType: "code",
      };
    }
    const allergens = findAllergens(text);
    return {
      category: rule.category,
      label: rule.label,
      status: "attention",
      found: allergens.length
        ? `향료 관련(“${frag}”) + 알레르기 초안: ${allergens.map((a) => a.name).join(", ")}`
        : `향료 관련(“${frag}”) — 알레르기 개별 성분 표기 여부 확인 필요`,
      suggest,
      checkType: "code",
    };
  }

  if (mode === "forbidden_phrase") {
    const hit = includesAny(text, rule.keywords ?? []);
    if (!hit) {
      return {
        category: rule.category,
        label: rule.label,
        status: "pass",
        found: "해당 키워드 없음",
        suggest: "광고·표시 문구를 주기적으로 재확인하세요.",
        checkType: "code",
      };
    }
    return {
      category: rule.category,
      label: rule.label,
      status: "attention",
      found: snippetAround(text, hit),
      suggest,
      checkType: "code",
    };
  }

  if (mode === "functional_mark") {
    const hit = includesAny(text, rule.keywords ?? []);
    if (hit) {
      return {
        category: rule.category,
        label: rule.label,
        status: "pass",
        found: snippetAround(text, hit),
        suggest: "기능성 도안·효능 문구도 함께 확인하세요.",
        checkType: "code",
      };
    }
    return {
      category: rule.category,
      label: rule.label,
      status: "attention",
      found: "‘기능성화장품’ 표기를 찾지 못함",
      suggest,
      checkType: "code",
    };
  }

  if (mode === "font_size") {
    const sizes = extracted.fontSizesPt;
    if (!sizes || !sizes.length) {
      return {
        category: rule.category,
        label: rule.label,
        status: "unknown",
        found: "폰트 크기 정보를 읽을 수 없음",
        suggest: suggest,
        checkType: "code",
      };
    }
    const minPt = rule.min_pt ?? 5;
    const tooSmall = sizes.filter((s) => s < minPt);
    if (tooSmall.length) {
      return {
        category: rule.category,
        label: rule.label,
        status: "possible",
        found: `감지된 크기(pt): ${[...new Set(sizes)].slice(0, 8).join(", ")} — ${minPt}pt 미만 ${tooSmall.length}건`,
        suggest: `${minPt}pt 이상인지 확인하세요.`,
        checkType: "code",
      };
    }
    return {
      category: rule.category,
      label: rule.label,
      status: "pass",
      found: `감지된 크기(pt): ${[...new Set(sizes)].slice(0, 8).join(", ")}`,
      suggest: "추출된 크기이며 인쇄물과 다를 수 있습니다.",
      checkType: "code",
    };
  }

  // presence
  const keys = rule.keywords ?? [];
  const hit = includesAny(text, keys);
  let ok = Boolean(hit);
  if (ok && rule.keywords_value_hint) {
    try {
      const re = new RegExp(rule.keywords_value_hint, "i");
      ok = re.test(text);
    } catch {
      /* keep keyword hit */
    }
  }
  if (ok && rule.keywords_near?.length) {
    const near = includesAny(text, rule.keywords_near);
    if (!near && rule.category === "필수표시") {
      // soft: keep ok if primary keyword found
    }
  }
  if (ok && hit) {
    return {
      category: rule.category,
      label: rule.label,
      status: "pass",
      found: snippetAround(text, hit),
      suggest: "표기 형식·누락 여부를 한 번 더 확인하세요.",
      checkType: "code",
    };
  }
  return {
    category: rule.category,
    label: rule.label,
    status: statusOf(rule, false),
    found: "관련 표기를 찾지 못함",
    suggest,
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
  if (!extracted.readable) {
    return {
      disclaimer: DISCLAIMER_483,
      readable: false,
      charCount: extracted.charCount,
      summary: { possible: 0, attention: 0, unknown: 1, pass: 0, manual: 0 },
      findings: [
        {
          category: "추출",
          label: "텍스트 추출",
          status: "unknown",
          found: `유효 글자 수 ${extracted.charCount}`,
          suggest: "텍스트를 읽을 수 없어 확인 불가합니다. (이미지 스캔본은 OCR이 다음 차수에서 지원됩니다.)",
          checkType: "code",
        },
      ],
      manualItems: [],
    };
  }

  const rules = loadLabelRules483();
  const findings: Finding[] = [];
  const manualItems: LabelCheckResult["manualItems"] = [];

  for (const rule of rules) {
    if (!applies(rule, input)) continue;
    if (rule.check_type === "code") {
      const f = runCodeRule(rule, extracted.text, extracted, input);
      if (f) findings.push(f);
    } else {
      manualItems.push({
        category: rule.category,
        label: rule.label,
        suggest: rule.keywords_suggest ?? "수동 확인이 필요합니다.",
      });
    }
  }

  return {
    disclaimer: DISCLAIMER_483,
    readable: true,
    charCount: extracted.charCount,
    summary: summarize(findings, manualItems.length),
    findings,
    manualItems,
  };
}

/** 회귀·로컬: 텍스트만으로 검사(샘플 PDF 마커와 동일 형식) */
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
