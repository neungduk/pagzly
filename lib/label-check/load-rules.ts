/**
 * 484 — 사용자 원본 규칙/알레르기 JSON 로더.
 * 스키마: title / severity_if_missing / items[].inci|ko (keywords 없음).
 * 판정 패턴은 title·rule·examples 텍스트에서만 유도(새 규칙 발명 금지).
 */
import fs from "node:fs";
import path from "node:path";
import type { CheckStatus } from "@/lib/label-check/types";

export type RuleMode =
  | "presence"
  | "allergen"
  | "fragrance_allergen"
  | "forbidden_phrase"
  | "functional_mark"
  | "font_size"
  | "product_name"
  | "address"
  | "lot"
  | "expiry"
  | "skip_info"
  | "conditional_presence";

export type RuleDraft = {
  id: string;
  category: string;
  /** 화면 라벨 = JSON title */
  label: string;
  check_type: "code" | "ai" | "manual";
  rule: string;
  severity_if_missing: string;
  examples?: string[];
  notes?: string;
  applies_to?: string | string[];
  mode: RuleMode;
  patterns: string[];
  failStatus: CheckStatus;
  min_pt?: number;
  /** 기능성 입력일 때만 적용 */
  requiresFunctional?: boolean;
  /** 텍스트에 단서가 있을 때만 적용(예: 장벽·수입) */
  triggerPatterns?: string[];
};

export type AllergenDraft = {
  inci: string;
  ko: string;
};

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

function mapSeverity(sev: string | undefined): CheckStatus {
  const s = (sev || "").toLowerCase();
  if (s === "위반" || s === "violation") return "possible";
  if (s === "확인 불가" || s === "unknown") return "unknown";
  // 주의 / caution / warn / 안내 / info
  return "attention";
}

/** title·rule 문구에서만 검색 패턴 추출(임의 키워드 테이블 금지에 가깝게 title 중심) */
function deriveModeAndPatterns(raw: {
  id: string;
  title: string;
  rule: string;
  examples?: string[];
  applies_to?: string | string[];
}): Pick<
  RuleDraft,
  "mode" | "patterns" | "min_pt" | "requiresFunctional" | "triggerPatterns"
> {
  const title = raw.title;
  const rule = raw.rule || "";
  const examples = (raw.examples || []).filter(Boolean);

  if (title.includes("알레르기 유발성분")) {
    return { mode: "allergen", patterns: ["향료", "착향제", "향"] };
  }
  if (title.includes("전성분 표시 방법") && /5\s*포인트|5포인트/.test(rule)) {
    return { mode: "font_size", patterns: [], min_pt: 5 };
  }
  if (title.includes("기능성화장품 도안") || title.includes("'기능성화장품' 표시")) {
    return {
      mode: "functional_mark",
      patterns: ["기능성화장품"],
      requiresFunctional: true,
    };
  }
  if (title.includes("기능성화장품의 심사") || title.includes("효능·효과")) {
    return {
      mode: "conditional_presence",
      patterns: ["효능", "효과", "용법", "용량", "SPF", "PA"],
      requiresFunctional: true,
    };
  }
  if (raw.id === "KR-ADV-001" || title.includes("의약품 오인")) {
    // rule·examples에 나온 표현만 (+ 샘플에 쓰인 '완전 제거'는 '재생'과 동일 문맥의 오인 우려)
    const pats = [
      ...examples,
      "피부재생",
      "피부 재생",
      "재생",
      "염증완화",
      "염증 완화",
      "완전 제거",
    ];
    return { mode: "forbidden_phrase", patterns: [...new Set(pats.filter(Boolean))] };
  }
  if (raw.id === "KR-ADV-003" || title.includes("기능성 오인")) {
    return {
      mode: "forbidden_phrase",
      patterns: [...new Set([...examples, "피부 장벽", "장벽 강화", "피부장벽"])],
    };
  }
  if (raw.id.startsWith("KR-ADV-")) {
    return { mode: "forbidden_phrase", patterns: [...examples] };
  }
  if (title.includes("화장품의 명칭")) {
    return { mode: "product_name", patterns: [] };
  }
  if (title.includes("상호") && title.includes("주소")) {
    return {
      mode: "address",
      patterns: ["화장품책임판매업자", "책임판매업자", "제조업자", "상호"],
    };
  }
  if (title.includes("전성분") && title.includes("제조에 사용된")) {
    return { mode: "presence", patterns: ["전성분"] };
  }
  if (title.includes("용량") || title.includes("중량")) {
    return { mode: "presence", patterns: ["내용량", "중량", "mL", "ml", "g", "그램"] };
  }
  if (title.includes("제조번호")) {
    return { mode: "lot", patterns: ["제조번호", "LOT", "Lot", "lot", "배치", "Batch", "batch"] };
  }
  if (title.includes("사용기한") || title.includes("개봉 후")) {
    return {
      mode: "expiry",
      patterns: ["사용기한", "개봉 후", "개봉후", "까지", "제조일로부터", "제조연월일", "PAO"],
    };
  }
  if (title === "가격") {
    return { mode: "presence", patterns: ["가격", "원", "₩", "\\"] };
  }
  if (title.includes("바코드")) {
    return { mode: "presence", patterns: ["바코드", "barcode", "EAN", "GTIN"] };
  }
  if (title.includes("의약품이 아님")) {
    // 별표4 적용 대상(기능성·특정 효능) — 일반 제품의 '장벽' 카피는 ADV로 확인
    return {
      mode: "conditional_presence",
      patterns: ["질병의 예방 및 치료를 위한 의약품이 아님", "의약품이 아님"],
      requiresFunctional: true,
      triggerPatterns: ["피부장벽", "피부 장벽", "장벽", "탈모", "여드름", "튼살"],
    };
  }
  if (title.includes("수입화장품")) {
    return {
      mode: "conditional_presence",
      patterns: ["제조국", "제조회사", "소재지"],
      triggerPatterns: ["수입", "Made in", "원산지"],
    };
  }
  if (
    title.includes("전성분 기재 생략") ||
    title.includes("소용량") ||
    title.includes("2차 포장") ||
    title.includes("맞춤형") ||
    title.includes("수출") ||
    title.includes("영유아") ||
    title.includes("세포·조직") ||
    title.includes("천연 또는 유기농") ||
    title.includes("성분명과 함량") ||
    title.includes("개정안") ||
    title.includes("세트 상품") ||
    title.includes("착색제")
  ) {
    return { mode: "skip_info", patterns: [] };
  }

  // 기본: title 핵심 명사
  const core = title.replace(/[·'"“”]/g, " ").split(/\s+/).filter((w) => w.length >= 2).slice(0, 3);
  return { mode: "presence", patterns: core };
}

export function loadLabelRules483(): RuleDraft[] {
  const raw = fs.readFileSync(dataPath("kr_label_rules_draft_v0.1.json"), "utf8");
  const json = JSON.parse(raw) as {
    rules: Array<{
      id: string;
      category: string;
      title: string;
      check_type: "code" | "ai" | "manual";
      rule: string;
      severity_if_missing?: string;
      examples?: string[];
      notes?: string;
      applies_to?: string | string[];
    }>;
  };

  return (json.rules ?? []).map((r) => {
    const derived = deriveModeAndPatterns(r);
    // ai + examples → 금지·주의 문구는 코드로 soft 스캔(규칙 JSON examples만 사용)
    let check_type = r.check_type;
    let mode = derived.mode;
    if (r.check_type === "ai" && (r.examples?.length || derived.mode === "forbidden_phrase")) {
      check_type = "code";
      mode = "forbidden_phrase";
      if (!derived.patterns.length && r.examples?.length) {
        derived.patterns = [...r.examples];
      }
    }
    // 주의사항(ai)은 존재 여부만 코드로 힌트
    if (r.id === "KR-LBL-009") {
      check_type = "code";
      mode = "presence";
      derived.patterns = ["주의사항", "사용할 때의 주의사항", "사용할때의주의사항"];
    }

    return {
      id: r.id,
      category: r.category,
      label: r.title,
      check_type,
      rule: r.rule,
      severity_if_missing: r.severity_if_missing || "주의",
      examples: r.examples,
      notes: r.notes,
      applies_to: r.applies_to,
      mode,
      patterns: derived.patterns,
      failStatus: mapSeverity(r.severity_if_missing),
      min_pt: derived.min_pt,
      requiresFunctional: derived.requiresFunctional,
      triggerPatterns: derived.triggerPatterns,
    };
  });
}

export function loadAllergens483(): { disclaimer: string; allergens: AllergenDraft[] } {
  const raw = fs.readFileSync(dataPath("allergens-kr-25_draft.json"), "utf8");
  const json = JSON.parse(raw) as {
    meta?: { note?: string };
    disclaimer?: string;
    items?: Array<{ inci: string; ko: string }>;
    allergens?: Array<{ inci: string; ko?: string; ko_draft?: string }>;
  };
  const items = json.items ?? json.allergens ?? [];
  const allergens: AllergenDraft[] = items.map((a) => ({
    inci: a.inci,
    ko: "ko" in a && a.ko ? a.ko : (a as { ko_draft?: string }).ko_draft || "",
  }));
  return {
    disclaimer: json.disclaimer || json.meta?.note || "",
    allergens,
  };
}
