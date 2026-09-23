import type { DetailSection, ImageTextSection } from "@/lib/types/generate";
import { parseIngredientLabels } from "@/lib/ingredient-labels";

const CIRCLE_PAIR_SLOT = "ingredient_circle_pair";
const CIRCLE_SOLO_SLOT = "ingredient_circle_solo";

function hasCircleVisual(sections: DetailSection[]): boolean {
  return sections.some(
    (s) =>
      s.type === "image_text" &&
      (s.layout === "circle-pair" || s.layout === "circle-solo"),
  );
}

function specTableIndex(sections: DetailSection[]): number {
  return sections.findIndex((s) => s.type === "spec_table" && s.slot === "spec_table");
}

/** 129차 — comparison_chart가 있으면 그 앞에 삽입해 128차 병합이 발동하도록 */
function comparisonChartIndex(sections: DetailSection[]): number {
  return sections.findIndex(
    (s) =>
      s.type === "comparison_chart" && Array.isArray(s.metrics) && s.metrics.length > 0,
  );
}

/** circle 삽입 위치: chart 우선, 없으면 spec_table (기존 폴백) */
function circleInsertIndex(sections: DetailSection[]): number {
  const chartIdx = comparisonChartIndex(sections);
  if (chartIdx >= 0) return chartIdx;
  return specTableIndex(sections);
}

/** ingredient_highlight와 다른 인덱스를 고른다 (104차 A-2). */
function pickAlternateIndex(
  sections: DetailSection[],
  avoid: number,
  imageCount: number,
): number {
  const tex = sections.find(
    (s): s is ImageTextSection => s.type === "image_text" && s.slot === "texture_feel",
  );
  if (
    tex &&
    Number.isInteger(tex.imageIndex) &&
    tex.imageIndex !== avoid &&
    tex.imageIndex >= 0 &&
    tex.imageIndex < imageCount
  ) {
    return tex.imageIndex;
  }
  for (let i = 0; i < imageCount; i += 1) {
    if (i !== avoid) return i;
  }
  return avoid;
}

/** 69차 — 성분 1개=circle-solo, 2개+=circle-pair; 129차 — chart 앞 우선, 없으면 spec_table 앞 */
export function applyIngredientCircleVisual(
  sections: DetailSection[],
  imageUrls: string[],
  ingredients: string | null | undefined,
): { sections: DetailSection[]; applied: boolean } {
  if (hasCircleVisual(sections)) {
    return { sections, applied: false };
  }

  const labels = parseIngredientLabels(ingredients);
  if (!labels) {
    return { sections, applied: false };
  }

  const insertIdx = circleInsertIndex(sections);
  if (insertIdx < 0) {
    return { sections, applied: false };
  }
  const insertBefore =
    comparisonChartIndex(sections) >= 0 ? "comparison_chart" : "spec_table";

  const ingSection = sections.find(
    (s): s is ImageTextSection =>
      s.type === "image_text" && s.slot === "ingredient_highlight",
  );
  if (!ingSection) {
    return { sections, applied: false };
  }

  const ingUrl = imageUrls[ingSection.imageIndex];
  if (!ingUrl) {
    return { sections, applied: false };
  }

  if (labels.length === 1) {
    const soloIndex = pickAlternateIndex(
      sections,
      ingSection.imageIndex,
      imageUrls.length,
    );
    const soloUrl = imageUrls[soloIndex] ?? ingUrl;
    const circleSection: ImageTextSection = {
      type: "image_text",
      slot: CIRCLE_SOLO_SLOT,
      layout: "circle-solo",
      heading: "",
      body: "",
      imageIndex: soloIndex,
      imagePosition: "left",
      circleSolo: { imageUrl: soloUrl, label: labels[0]! },
    };
    const next = [
      ...sections.slice(0, insertIdx),
      circleSection,
      ...sections.slice(insertIdx),
    ];
    console.log(
      `[circle-solo] ${insertBefore} 직전 삽입 — "${labels[0]}" (img ${soloIndex}, avoid ingredient ${ingSection.imageIndex})`,
    );
    return { sections: next, applied: true };
  }

  // 207차 — texture_feel은 선택 슬롯이라 자주 생략됨(section-templates.ts:69
  // required:false). 예전엔 texture_feel이 없으면 circle-pair 전체를 스킵했는데,
  // circle-solo(위 93~119번 줄)가 이미 쓰고 있는 `pickAlternateIndex`(34~56번 줄, texture_feel
  // 이미지를 우선 시도하고 없으면 ingredient와 다른 첫 번째 이미지로 폴백하는 기존 함수)를
  // 그대로 재사용하면 됨 — 신규 로직 없음. circlePair 렌더링은 라벨링된 원형 크롭일 뿐
  // texture 전용 크롭이어야 한다는 전제가 없어서(DetailSectionRenderer.tsx/
  // export-detail-html.ts 코드 확인 완료) 동일 폴백이 시각적으로 안전 — 148차부터
  // 미해결이던 "성분 2개 이상인데도 원형 비주얼이 조용히 스킵되는" 후커블 격차를 여기서
  // 해소.
  const pairImageIndex = pickAlternateIndex(
    sections,
    ingSection.imageIndex,
    imageUrls.length,
  );
  const pairUrl = imageUrls[pairImageIndex];
  if (!pairUrl || pairImageIndex === ingSection.imageIndex) {
    return { sections, applied: false };
  }

  const circleSection: ImageTextSection = {
    type: "image_text",
    slot: CIRCLE_PAIR_SLOT,
    layout: "circle-pair",
    heading: "",
    body: "",
    // pair는 두 URL을 circlePair에 담고, imageIndex는 pickAlternateIndex가 고른 이미지를
    // 쓴다(texture_feel이 있으면 그쪽 우선, 없으면 다른 상품 사진으로 폴백)
    imageIndex: pairImageIndex,
    imagePosition: "left",
    circlePair: [
      { imageUrl: ingUrl, label: labels[0]! },
      { imageUrl: pairUrl, label: labels[1]! },
    ],
  };

  const next = [
    ...sections.slice(0, insertIdx),
    circleSection,
    ...sections.slice(insertIdx),
  ];
  console.log(
    `[circle-pair] ${insertBefore} 직전 삽입 — "${labels[0]}" / "${labels[1]}" (img ${ingSection.imageIndex}, ${pairImageIndex})`,
  );
  return { sections: next, applied: true };
}
