/**
 * 169차 — 카테고리 네이티브 섹션 트리 (뷰티 클론 대체).
 * /api/generate 없이 section-templates 슬롯 + 정적 카피로 구성.
 */
import { getSlotTemplate, type SlotDefinition } from "../lib/section-templates";
import type { DetailSection } from "../lib/types/generate";

export type NativeFixtureProduct = {
  /** 폼/템플릿 resolve용 카테고리 키 (예: 의류/패션, 식품/건강기능식품, 생활용품) */
  formCategory: string;
  productName: string;
  brandName: string;
  keyFeatures: string;
  ingredients: string;
  certifications: string;
  targetCustomer: string;
  imageCount?: number;
};

const NUMERIC_HINT =
  /\d+\s*(%|％|dB|ml|mL|L|g|kg|cm|mm|W|h|℃)|단백질|함량|용량|신축|수축|나트륨|내열|하중/i;
const TRADEOFF_HINT = /추천|이런 분|확인 후 구매|참고|유의/i;

function img(i: number, n: number) {
  return Math.max(0, Math.min(n - 1, i));
}

function headingFromSlot(slot: string): string {
  const map: Record<string, string> = {
    quick_points: "한눈에 포인트",
    feature_callout: "핵심 포인트",
    detail_zoom: "디테일",
    material_feature: "소재·기능",
    material_detail: "소재 디테일",
    usage_scenario: "사용 장면",
    usage_scenario_extra: "사용 장면",
    ingredient_highlight: "원재료",
    texture_closeup: "질감 클로즈업",
    packaging_design: "패키지",
    care_tip: "관리 팁",
    coordination: "코디 제안",
    fabric_composition: "원단 구성",
    package_contents: "구성품",
    shipping_info: "배송 안내",
    feature_detail: "기능 상세",
    connectivity: "연결·호환",
    install_scenario: "설치·사용",
  };
  return map[slot] ?? slot.replace(/_/g, " ").slice(0, 12);
}

function parseRecommendConsider(kf: string): { recommendFor: string[]; considerIf: string[] } {
  const recommendFor: string[] = [];
  const considerIf: string[] = [];
  const rec = kf.match(/이런 분께 추천\s*[:：]?\s*([^.]*)/);
  const con = kf.match(/이런 점은 확인 후 구매\s*[:：]?\s*([^.]*)/);
  if (rec?.[1]) {
    recommendFor.push(
      ...rec[1]
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4),
    );
  }
  if (con?.[1]) {
    considerIf.push(
      ...con[1]
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4),
    );
  }
  if (recommendFor.length === 0 && TRADEOFF_HINT.test(kf)) {
    recommendFor.push(kf.split(/[.。]/)[0]?.trim() || "입력된 추천 대상");
  }
  return { recommendFor, considerIf };
}

function metricsFromFeatures(kf: string, ing: string): {
  label: string;
  value: string;
  style: "bar" | "number" | "ring";
  percent?: number;
  basis: "measured" | "self_assessed";
}[] {
  const blob = `${kf} ${ing}`;
  const metrics: {
    label: string;
    value: string;
    style: "bar" | "number" | "ring";
    percent?: number;
    basis: "measured" | "self_assessed";
  }[] = [];
  const pct = [...blob.matchAll(/([가-힣A-Za-z0-9]+)\s*([0-9]+(?:\.[0-9]+)?)\s*%/g)];
  for (const m of pct.slice(0, 3)) {
    const n = Number(m[2]);
    metrics.push({
      label: m[1]!,
      value: `${m[2]}%`,
      style: "bar",
      percent: Math.min(100, Math.max(0, n)),
      basis: "measured",
    });
  }
  const abs = [...blob.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(g|kg|mL|ml|℃|cm|dB|시간|mg)/gi)];
  for (const m of abs.slice(0, 3)) {
    if (metrics.length >= 5) break;
    metrics.push({
      label: m[2]!.toLowerCase() === "g" || m[2] === "mg" ? "함량" : m[2]!,
      value: `${m[1]}${m[2]}`,
      style: "number",
      basis: "measured",
    });
  }
  if (metrics.length === 0 && NUMERIC_HINT.test(blob)) {
    metrics.push({
      label: "핵심 스펙",
      value: blob.match(/\d+[^\s,]*/)?.[0] ?? "입력값",
      style: "number",
      basis: "measured",
    });
  }
  // chart/stat 모두 최소 2지표 — 1개만 파싱되면 입력 blob의 다음 수치로 보강
  if (metrics.length === 1 && NUMERIC_HINT.test(blob)) {
    const extras = [...blob.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(%|％|g|kg|mL|ml|℃|dB|시간|mg|kcal)?/gi)];
    for (const m of extras) {
      const val = `${m[1]}${m[2] ?? ""}`;
      if (metrics.some((x) => x.value === val || x.value === `${m[1]}%`)) continue;
      metrics.push({
        label: m[2] ? String(m[2]) : "스펙",
        value: val,
        style: m[2] === "%" || m[2] === "％" ? "bar" : "number",
        percent: m[2] === "%" || m[2] === "％" ? Math.min(100, Number(m[1])) : undefined,
        basis: "measured",
      });
      break;
    }
  }
  return metrics.slice(0, 5);
}

function comparisonFromFeatures(kf: string, brand: string): {
  label: string;
  ourValue: number;
  baselineValue: number;
}[] {
  const metrics: { label: string; ourValue: number; baselineValue: number }[] = [];
  const pct = [...kf.matchAll(/([가-힣A-Za-z]+)\s*([0-9]+(?:\.[0-9]+)?)\s*%/g)];
  for (const m of pct.slice(0, 3)) {
    const our = Math.min(85, Math.max(30, Number(m[2])));
    metrics.push({
      label: m[1]!,
      ourValue: our,
      baselineValue: Math.max(25, Math.round(our / 1.4)),
    });
  }
  // 전자: ANC dB 등 — 막대 비교용 0~100 스케일로 정규화(절대 dB 날조 금지, 상대 표시)
  const db = [...kf.matchAll(/(ANC|감쇠|소음)?\s*([0-9]+(?:\.[0-9]+)?)\s*dB/gi)];
  for (const m of db.slice(0, 2)) {
    if (metrics.length >= 4) break;
    const raw = Number(m[2]);
    const our = Math.min(85, Math.max(30, Math.round(raw * 1.5)));
    metrics.push({
      label: (m[1] || "ANC").toString().trim() || "ANC",
      ourValue: our,
      baselineValue: Math.max(25, Math.round(our / 1.35)),
    });
  }
  // 배터리 시간 등 두 번째 축 — chart는 최소 2 metrics 필요
  const hours = [...kf.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*시간/g)];
  if (metrics.length < 2 && hours[0]) {
    const h = Number(hours[0][1]);
    const our = Math.min(85, Math.max(30, Math.round(h * 6)));
    metrics.push({
      label: "배터리",
      ourValue: our,
      baselineValue: Math.max(25, Math.round(our / 1.4)),
    });
  }
  if (metrics.length < 2 && NUMERIC_HINT.test(kf)) {
    if (metrics.length === 0) {
      metrics.push({ label: "핵심 지표", ourValue: 72, baselineValue: 48 });
    }
    if (metrics.length === 1) {
      metrics.push({ label: "종합", ourValue: 68, baselineValue: 45 });
    }
  }
  void brand;
  return metrics.slice(0, 4);
}

function stubFromSlot(
  def: SlotDefinition,
  p: NativeFixtureProduct,
  n: number,
): DetailSection | null {
  const hasNumeric = NUMERIC_HINT.test(`${p.keyFeatures} ${p.ingredients} ${p.certifications}`);
  const hasTradeoff = TRADEOFF_HINT.test(p.keyFeatures);

  switch (def.type) {
    case "hero":
      return {
        type: "hero",
        slot: def.slot,
        headline: p.productName.slice(0, 18),
        subheadline: p.keyFeatures.split(/[,，]/)[0]?.trim() ?? p.brandName,
        imageIndex: 0,
      };
    case "brand_story":
      return {
        type: "brand_story",
        slot: def.slot,
        heading: p.brandName,
        body: `${p.brandName} — ${p.targetCustomer}을 위한 ${p.productName}.`,
      };
    case "checklist":
      return {
        type: "checklist",
        slot: def.slot,
        heading: "핵심 포인트",
        items: p.keyFeatures
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 4),
      };
    case "image_text": {
      // 157차 optional: 기획/세트 언급 없으면 package_contents 생략
      if (
        def.slot === "package_contents" &&
        !/기획|더블기획|1\s*\+\s*1|2\s*\+\s*1|증정|사은품|세트/.test(p.keyFeatures)
      ) {
        return null;
      }
      return {
        type: "image_text",
        slot: def.slot,
        heading: headingFromSlot(def.slot),
        body: p.keyFeatures.split(/[.。]/)[0]?.trim() ?? p.keyFeatures.slice(0, 80),
        imageIndex: img(1, n),
        imagePosition: "left",
        layout: def.slot.includes("quick")
          ? "compact"
          : def.slot.includes("callout")
            ? "callout"
            : "full",
        callout: def.slot.includes("callout") ? p.keyFeatures.slice(0, 16) : undefined,
      };
    }
    case "target_persona":
      return {
        type: "target_persona",
        slot: def.slot,
        heading: "이런 분께",
        personas: p.targetCustomer
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3),
      };
    case "highlight_box":
      return {
        type: "highlight_box",
        slot: def.slot,
        heading: "하이라이트",
        cards: p.keyFeatures
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3)
          .map((title) => ({ title: title.slice(0, 8), body: title })),
      };
    case "illustration_banner":
      return {
        type: "illustration_banner",
        slot: def.slot,
        heading: "한눈에",
        body: p.keyFeatures.slice(0, 60),
        illustrationUrl: "",
      };
    case "gallery":
      return {
        type: "gallery",
        slot: def.slot,
        heading: "갤러리",
        imageIndexes: [0, 1, 2, 3].map((i) => img(i, n)).slice(0, Math.min(4, n)),
      };
    case "step_card":
      return {
        type: "step_card",
        slot: def.slot,
        heading: "사용 순서",
        steps: [0, 1, 2].map((i) => ({
          title: `단계 ${i + 1}`,
          body: p.keyFeatures.split(/[,，]/)[i]?.trim() ?? "입력 기준 안내",
          imageIndex: img(i, n),
        })),
      };
    case "stat_infographic": {
      if (!hasNumeric) return null;
      const metrics = metricsFromFeatures(p.keyFeatures, p.ingredients);
      if (metrics.length < 2) return null;
      return {
        type: "stat_infographic",
        slot: def.slot,
        heading: "한눈에 보는 스펙",
        metrics,
      };
    }
    case "comparison_chart": {
      if (!hasNumeric) return null;
      const metrics = comparisonFromFeatures(p.keyFeatures, p.brandName);
      if (metrics.length < 2) return null;
      return {
        type: "comparison_chart",
        slot: def.slot,
        heading: "일반 제품 대비",
        ourLabel: p.brandName || "우리 제품",
        baselineLabel: "일반 제품",
        unit: "%",
        presentationStyle: "bar",
        metrics,
        basis: "self_assessed",
      };
    }
    case "tradeoff_card": {
      if (!hasTradeoff) return null;
      const { recommendFor, considerIf } = parseRecommendConsider(p.keyFeatures);
      if (recommendFor.length === 0) return null;
      return {
        type: "tradeoff_card",
        slot: def.slot,
        heading: "구매 전 확인",
        recommendFor,
        considerIf:
          considerIf.length > 0
            ? considerIf
            : ["입력된 사용 조건을 확인한 뒤 구매를 권장합니다."],
      };
    }
    case "spec_table":
      return {
        type: "spec_table",
        slot: def.slot,
        heading: def.slot === "size_table" ? "사이즈" : def.slot === "nutrition_table" ? "영양" : "상세 스펙",
        rows: [
          { label: "상품명", value: p.productName },
          { label: "소재/성분", value: p.ingredients || "판매자 확인 필요" },
          { label: "인증", value: p.certifications || "판매자 확인 필요" },
          { label: "특징", value: p.keyFeatures.slice(0, 80) },
        ],
      };
    case "faq":
      return {
        type: "faq",
        slot: def.slot,
        heading: "자주 묻는 질문",
        items: [
          { question: "주요 특징은?", answer: p.keyFeatures.split(/[,，]/)[0] ?? p.keyFeatures },
          { question: "소재/성분은?", answer: p.ingredients || "판매자에게 문의해주세요" },
          { question: "인증이 있나요?", answer: p.certifications || "판매자에게 문의해주세요" },
        ],
      };
    case "caution":
      return {
        type: "caution",
        slot: def.slot,
        heading: "주의사항",
        body: "개인차가 있을 수 있습니다. 판매자 안내를 확인해 주세요.",
      };
    case "color_variation":
      return {
        type: "color_variation",
        slot: def.slot,
        heading: "컬러 옵션",
        options: [
          { label: "아이보리", colorHex: "#F5F0E6", imageIndex: img(0, n) },
          { label: "차콜", colorHex: "#3A3A3A", imageIndex: img(1, n) },
          { label: "세이지", colorHex: "#8FA68A", imageIndex: img(2, n) },
        ],
      };
    case "comparison_table":
      return {
        type: "comparison_table",
        slot: def.slot,
        heading: "스펙 비교",
        columns: ["항목", "이 제품"] as [string, string],
        rows: [
          {
            label: "인증",
            values: ["인증", p.certifications || "확인 필요"] as [string, string],
          },
          {
            label: "특징",
            values: ["특징", p.keyFeatures.slice(0, 40)] as [string, string],
          },
        ],
      };
    case "ai_disclosure":
      return {
        type: "ai_disclosure",
        slot: def.slot,
        heading: "AI 생성 안내",
        body: "본 상세페이지의 일부 문구·이미지는 AI로 생성되었습니다.",
      };
    case "cta_price":
      return {
        type: "cta_price",
        slot: def.slot,
        price: 24000,
        targetCustomer: p.targetCustomer,
        badges: p.certifications
          ? [p.certifications.split(/[,，]/)[0]!.trim()]
          : undefined,
      };
    case "usage_steps":
      return {
        type: "usage_steps",
        slot: def.slot,
        heading: "사용법",
        steps: [
          "제품을 준비합니다.",
          p.keyFeatures.split(/[,，]/)[0]?.trim() ?? "안내에 따라 사용합니다.",
          "서늘한 곳에 보관합니다.",
        ],
      };
    default:
      return null;
  }
}

/** 템플릿 슬롯 순서로 카테고리 네이티브 섹션 배열 생성. optional은 입력 근거 있을 때만. */
export function buildNativeFixtureSections(product: NativeFixtureProduct): DetailSection[] {
  const n = Math.max(4, product.imageCount ?? 4);
  const slots = getSlotTemplate(product.formCategory, "long");
  const sections: DetailSection[] = [];
  for (const def of slots) {
    const section = stubFromSlot(def, product, n);
    if (section) sections.push(section);
  }
  return sections;
}
