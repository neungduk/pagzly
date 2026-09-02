"use client";

import { useRef, useState } from "react";
import { notFound } from "next/navigation";
import DetailActionBar, { type DetailToolTab } from "@/components/DetailActionBar";
import DetailSectionRenderer from "@/components/DetailSectionRenderer";
import BlogPostPanel from "@/components/BlogPostPanel";
import InstagramFeedPanel from "@/components/InstagramFeedPanel";
import ToastBanner from "@/components/ToastBanner";
import type { BlogBlockOverride, BlogPostGlobalOverride } from "@/lib/blog-post";
import type { InstagramSlideOverride } from "@/lib/instagram-feed";
import type { DetailSection } from "@/lib/types/generate";
import { validateImageFile } from "@/lib/image-upload";

const initialImageUrls = [
  "/iteration-fixtures/01.jpg",
  "/iteration-fixtures/02.jpg",
  "/iteration-fixtures/03.jpg",
  "/iteration-fixtures/04.jpg",
];

const initialSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "브랜드가 지키는 한 가지",
    body: "복잡한 루틴이 아니라, 매일 쓸 수 있는 수분 레이어를 목표로 만들었습니다.",
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "이 크림이 하는 일",
    items: ["가벼운 젤", "속당김 케어", "무향", "아침·저녁"],
  },
  {
    type: "target_persona",
    slot: "target_persona",
    heading: "이런 분께",
    personas: ["속건조가 고민인 분", "무향을 선호하는 분", "메이크업 전 케어"],
  },
  {
    type: "image_text",
    slot: "feature_callout",
    layout: "callout",
    callout: "수분 레이어",
    heading: "POINT",
    body: "메이크업 전에도 부담 없이 레이어링할 수 있는 가벼운 제형입니다.",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    heading: "수분을 붙잡는 히알루론산",
    body: "겉만 번들거리지 않습니다. 피부 결 사이에 수분을 남기는 가벼운 제형이에요.",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "highlight_box",
    slot: "highlight_box",
    heading: "3가지 강점",
    cards: [
      { title: "수분", body: "히알루론산으로 속당김 케어" },
      { title: "가벼움", body: "끈적임 없는 젤 제형" },
      { title: "무향", body: "향료 없이 데일리 사용" },
    ],
  },
  {
    type: "step_card",
    slot: "step_card",
    heading: "사용법",
    steps: [
      { title: "세안", body: "세안 후 피부결을 정리합니다.", imageIndex: 2 },
      { title: "도포", body: "볼·이마에 소량 올립니다.", imageIndex: 3 },
    ],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "실제 사용 장면",
    imageIndexes: [0, 1, 2, 3],
  },
  {
    type: "stat_infographic",
    slot: "stat_infographic",
    heading: "수치로 보는 핵심 포인트",
    metrics: [
      { label: "수분감", value: "가벼운 젤", style: "number" },
      { label: "무향", value: "100%", percent: 100, style: "bar", basis: "self_assessed" },
    ],
    barAccent: "emphasis",
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "용량", value: "50ml" },
      { label: "제형", value: "젤 크림" },
      { label: "향", value: "무향" },
      { label: "원산지", value: "국내" },
    ],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [
      {
        question: "민감성 피부도 사용 가능한가요?",
        answer: "개인차가 있으니 패치 테스트 후 사용해 주세요.",
      },
      {
        question: "메이크업 전에 쓸 수 있나요?",
        answer: "얇게 레이어링하면 메이크업 전 사용에 적합합니다.",
      },
    ],
  },
  {
    type: "caution",
    slot: "caution",
    heading: "사용 시 주의",
    body: "상처·염증 부위에는 사용하지 마세요. 이상 반응이 있으면 사용을 중단하세요.",
  },
  {
    type: "image_text",
    slot: "customer_scenario",
    heading: "아침 루틴",
    body: "출근 전 3분, 속당김 없이 메이크업을 시작하세요.",
    imageIndex: 3,
    imagePosition: "left",
  },
  {
    type: "spec_table",
    slot: "shipping_info",
    heading: "배송·교환 안내",
    rows: [
      { label: "배송비", value: "구매 금액·지역에 따라 달라질 수 있습니다" },
      { label: "배송기간", value: "판매자 확인 필요" },
    ],
  },
  {
    type: "ai_disclosure",
    slot: "ai_disclosure",
    heading: "AI 생성 고지",
    body: "이 상세페이지의 텍스트·이미지 일부는 AI가 생성·보정했습니다.",
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 32900,
    targetCustomer: "20~30대 여성",
    badges: ["무향", "당일발송", "KC 인증"],
  },
];

/** 56차 캡처용 — 패션 + 55차 UI 3종(사이즈 다이어그램·퀵팩트·앵커) 검증 */
const capture56Sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "데일리에 맞는 오버핏 실루엣",
    subheadline: "에센셜 코튼 티셔츠",
    imageIndex: 0,
    badge: "면 100%",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "미니멀 라인의 기준",
    body: "불필요한 장식 없이 소재와 핏만으로 말하는 데일리웨어를 만듭니다.",
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "핏 포인트",
    items: ["20수 순면", "오버핏", "4색 컬러", "사계절"],
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "소재", value: "면 100%" },
      { label: "원산지", value: "국내" },
      { label: "색상", value: "3종" },
      { label: "제조사", value: "NEUTRAL LINE" },
    ],
  },
  {
    type: "gallery",
    slot: "model_multicut",
    heading: "착장 컷",
    imageIndexes: [0, 1, 2, 3],
  },
  {
    type: "step_card",
    slot: "step_card",
    heading: "코디 가이드",
    steps: [
      { title: "데님", body: "캐주얼 데일리룩.", imageIndex: 1 },
      { title: "슬랙스", body: "포멀한 오피스룩.", imageIndex: 2 },
    ],
  },
  {
    type: "spec_table",
    slot: "size_table",
    heading: "사이즈 안내",
    rows: [
      { label: "어깨너비", value: "48cm" },
      { label: "가슴단면", value: "52cm" },
      { label: "총장", value: "68cm" },
      { label: "소매길이", value: "62cm" },
      { label: "모델 착용", value: "판매자 확인 필요" },
    ],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [
      {
        question: "세탁 방법은 어떻게 되나요?",
        answer: "찬물 단독 세탁을 권장합니다.",
      },
      {
        question: "핏은 어떤가요?",
        answer: "오버핏이라 한 치수 크게 나옵니다.",
      },
    ],
  },
  {
    type: "spec_table",
    slot: "shipping_info",
    heading: "배송·교환 안내",
    rows: [
      { label: "배송비", value: "3,000원 (5만원 이상 무료)" },
      { label: "배송기간", value: "2~3영업일" },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 39000,
    targetCustomer: "20~40대 데일리룩",
    badges: ["면 100%", "당일발송"],
  },
];

const capture56Meta = {
  category: "의류/패션",
  brandName: "NEUTRAL LINE",
  productName: "에센셜 코튼 티셔츠",
};

/** 57차 B — 식품 크기비교 다이어그램 캡처용 */
const capture57FoodSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "집에서 즐기는 프리미엄 스테이크",
    subheadline: "와규 스테이크",
    imageIndex: 0,
    badge: "냉동",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "한 끼의 품격",
    body: "좋은 원육만으로 완성하는 홈쿡 스테이크 라인입니다.",
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "가로", value: "16.5cm" },
      { label: "세로", value: "6.5cm" },
      { label: "중량", value: "200g" },
      { label: "원산지", value: "국내" },
    ],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "구성",
    imageIndexes: [0, 1, 2],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [{ question: "해동 방법은?", answer: "냉장 해동 12시간을 권장합니다." }],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 18900,
    targetCustomer: "홈쿡족",
    badges: ["냉동배송"],
  },
];

const capture57FoodMeta = {
  category: "식품/건강기능식품",
  brandName: "한그릇 키친",
  productName: "와규 스테이크",
};

/** 57차 B — 전자제품 크기비교 다이어그램 캡처용 */
const capture57ElectronicsSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "작지만 강한 사운드",
    subheadline: "AURA ONE Pro",
    imageIndex: 0,
    badge: "ANC",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "사운드의 새 기준",
    body: "출퇴근과 운동을 위한 컴팩트한 오픈형 이어버드.",
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "가로", value: "5.8cm" },
      { label: "높이", value: "3.2cm" },
      { label: "지름", value: "4.1cm" },
      { label: "무게", value: "58g" },
    ],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "구성",
    imageIndexes: [0, 1, 2],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [{ question: "방수 등급은?", answer: "IPX5 생활방수를 지원합니다." }],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 189000,
    targetCustomer: "20~40대",
    badges: ["KC 인증"],
  },
];

const capture57ElectronicsMeta = {
  category: "전자제품",
  brandName: "NORA AUDIO",
  productName: "AURA ONE Pro",
};

/** 60차 — compact image_text 2개 이상 (square/circle 교차) */
const capture60Sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "image_text",
    slot: "feature_callout",
    layout: "compact",
    heading: "무향 케어",
    body: "향료 없이 데일리로 쓰기 좋은 가벼운 제형입니다.",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    layout: "compact",
    heading: "3중 레이어",
    body: "히알루론산 레이어가 속당김을 케어합니다.",
    imageIndex: 2,
    imagePosition: "right",
  },
  {
    type: "image_text",
    slot: "texture_detail",
    layout: "compact",
    heading: "젤 크림 제형",
    body: "끈적임 없이 흡수되는 워터리 텍스처.",
    imageIndex: 3,
    imagePosition: "left",
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 32900,
    targetCustomer: "20~30대 여성",
    badges: ["무향", "당일발송"],
  },
];

const capture60Meta = {
  category: "화장품/뷰티",
  brandName: "AURA LAB",
  productName: "히알루론 수분 크림",
};

/** 59차 — 전자제품 annotated 주석 mock */
const capture59Sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "작지만 강한 사운드",
    subheadline: "AURA ONE Pro",
    imageIndex: 0,
    badge: "ANC",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "사운드의 새 기준",
    body: "출퇴근과 운동을 위한 컴팩트한 오픈형 이어버드.",
  },
  {
    type: "image_text",
    slot: "feature_detail",
    layout: "annotated",
    heading: "듀얼 드라이버 구조",
    body: "저음과 고음을 분리 재생해 밸런스 있는 사운드를 제공합니다.",
    imageIndex: 1,
    imagePosition: "left",
    annotations: [
      { label: "ANC 드라이버", xPct: 32, yPct: 38 },
      { label: "이어팁", xPct: 72, yPct: 58 },
      { label: "터치 센서", xPct: 48, yPct: 24 },
    ],
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "무게", value: "58g" },
      { label: "배터리", value: "최대 8시간" },
      { label: "방수", value: "IPX5" },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 189000,
    targetCustomer: "20~40대",
    badges: ["KC 인증"],
  },
];

const capture59Meta = {
  category: "전자제품",
  brandName: "NORA AUDIO",
  productName: "AURA ONE Pro",
};

/** 65차 — circle-pair (성분 2개 mock) */
const capture65Sections: DetailSection[] = (() => {
  const specIdx = initialSections.findIndex((s) => s.type === "spec_table" && s.slot === "spec_table");
  const circlePair: DetailSection = {
    type: "image_text",
    slot: "ingredient_circle_pair",
    layout: "circle-pair",
    heading: "",
    body: "",
    imageIndex: 1,
    imagePosition: "left",
    circlePair: [
      { imageUrl: "/iteration-fixtures/02.jpg", label: "히알루론산" },
      { imageUrl: "/iteration-fixtures/03.jpg", label: "판테놀" },
    ],
  };
  if (specIdx < 0) return [...initialSections, circlePair];
  return [
    ...initialSections.slice(0, specIdx),
    circlePair,
    ...initialSections.slice(specIdx),
  ];
})();

const capture65Meta = {
  category: "화장품/뷰티",
  brandName: "AURA LAB",
  productName: "히알루론 수분 크림",
};

/** 69차 — circle-solo (성분 1개 mock) */
const capture69SoloSections: DetailSection[] = (() => {
  const specIdx = initialSections.findIndex((s) => s.type === "spec_table" && s.slot === "spec_table");
  const circleSolo: DetailSection = {
    type: "image_text",
    slot: "ingredient_circle_solo",
    layout: "circle-solo",
    heading: "",
    body: "",
    imageIndex: 1,
    imagePosition: "left",
    circleSolo: { imageUrl: "/iteration-fixtures/02.jpg", label: "히알루론산" },
  };
  if (specIdx < 0) return [...initialSections, circleSolo];
  return [
    ...initialSections.slice(0, specIdx),
    circleSolo,
    ...initialSections.slice(specIdx),
  ];
})();

const capture69SoloMeta = capture65Meta;

/** 69차 — spec_table 3장 썸네일 + 배경 틴트 */
const capture69SpecMultiSections: DetailSection[] = initialSections.map((section) =>
  section.type === "spec_table" && section.slot === "spec_table"
    ? { ...section, imageIndexes: [1, 2, 3] }
    : section,
);

const capture69SpecMultiMeta = capture65Meta;

type CapturePreset = {
  sections: DetailSection[];
  category: string;
  brandName: string;
  productName: string;
};

/** 58차 — 6카테고리 baseNeutral 캡처용 */
const CAPTURE58_PRESETS: Record<string, CapturePreset> = {
  "58-fashion": { sections: capture56Sections, ...capture56Meta },
  "58-cosmetics": {
    sections: initialSections,
    category: "화장품/뷰티",
    brandName: "AURA LAB",
    productName: "히알루론 수분 크림",
  },
  "58-food": { sections: capture57FoodSections, ...capture57FoodMeta },
  "58-electronics": { sections: capture57ElectronicsSections, ...capture57ElectronicsMeta },
  "58-living": {
    sections: initialSections,
    category: "생활용품",
    brandName: "PLAIN HOME",
    productName: "세라믹 식기 세트",
  },
  "58-pet": {
    sections: initialSections,
    category: "반려동물",
    brandName: "PAW FRIEND",
    productName: "저알러지 사료",
  },
};

function resolveCapturePreset(): CapturePreset | null {
  if (typeof window === "undefined") return null;
  const capture = new URLSearchParams(window.location.search).get("capture");
  if (capture === "1") return { sections: capture56Sections, ...capture56Meta };
  if (capture === "57-food") return { sections: capture57FoodSections, ...capture57FoodMeta };
  if (capture === "57-electronics") {
    return { sections: capture57ElectronicsSections, ...capture57ElectronicsMeta };
  }
  if (capture && CAPTURE58_PRESETS[capture]) return CAPTURE58_PRESETS[capture]!;
  if (capture === "60-compact-shapes") return { sections: capture60Sections, ...capture60Meta };
  if (capture === "59-electronics") return { sections: capture59Sections, ...capture59Meta };
  if (capture === "65-circle-pair") return { sections: capture65Sections, ...capture65Meta };
  if (capture === "65-no-ingredients") return { sections: initialSections, ...capture65Meta };
  if (capture === "69-circle-solo") return { sections: capture69SoloSections, ...capture69SoloMeta };
  if (capture === "69-spec-multi") {
    return { sections: capture69SpecMultiSections, ...capture69SpecMultiMeta };
  }
  return null;
}

function readCaptureMode(): boolean {
  return resolveCapturePreset() !== null;
}

export default function DetailPreviewPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturePreset] = useState(resolveCapturePreset);
  const captureMode = capturePreset !== null;
  const [sections, setSections] = useState(() =>
    capturePreset ? capturePreset.sections : initialSections,
  );
  const [imageUrls, setImageUrls] = useState(initialImageUrls);
  const [editMode, setEditMode] = useState(false);
  const [toolTab, setToolTab] = useState<DetailToolTab>("edit");
  const [replaceImageIndex, setReplaceImageIndex] = useState(0);
  const [aiText, setAiText] = useState("");
  const [patchIndex, setPatchIndex] = useState(0);
  const [patchInstruction, setPatchInstruction] = useState("");
  const [hiddenIndexes, setHiddenIndexes] = useState<number[]>([]);
  const [feedOverrides, setFeedOverrides] = useState<Record<string, InstagramSlideOverride>>({});
  const [blogBlockOverrides, setBlogBlockOverrides] = useState<Record<string, BlogBlockOverride>>(
    {},
  );
  const [blogGlobalOverrides, setBlogGlobalOverrides] = useState<BlogPostGlobalOverride>({});
  const [toast, setToast] = useState<{ message: string; tone: "error" | "info" | "ok" } | null>(
    null,
  );

  const previewCategory = capturePreset?.category ?? "화장품/뷰티";
  const previewBrandName = capturePreset?.brandName ?? "테스트 브랜드";
  const previewProductName = capturePreset?.productName ?? "히알루론 수분 크림";

  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  function handleTabChange(next: DetailToolTab) {
    setToolTab(next);
    if (next === "edit" || next === "patch") setEditMode(true);
    if (next === "instagram" || next === "blog") setEditMode(false);
  }

  function handleReorder(from: number, to: number) {
    if (to < 0 || to >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  }

  function handleToggleHidden(index: number) {
    setHiddenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }

  const visibleOriginalIndexes = sections
    .map((_, i) => i)
    .filter((i) => !hiddenIndexes.includes(i));
  const visibleSections = visibleOriginalIndexes.map((i) => sections[i]!);

  function handleAiGenerate() {
    const trimmed = aiText.trim();
    if (!trimmed) {
      setToast({
        tone: "info",
        message:
          "1688/도매꾹 원본 상품명·스펙·설명을 붙여넣은 뒤 다시 시도해 주세요. 빈 상태에서는 AI를 호출하지 않습니다.",
      });
      return;
    }
    setToast({
      tone: "info",
      message: "프리뷰에서는 과금 API를 호출하지 않습니다. 결과 페이지에서 생성 요청을 사용하세요.",
    });
  }

  return (
    <div className="min-h-full bg-paper pb-24">
      <div
        data-preview-chrome
        className="sticky top-0 z-30 mx-auto max-w-[430px] space-y-3 bg-paper/95 px-3 py-3 backdrop-blur-md"
        style={captureMode ? { display: "none" } : undefined}
      >
        <p className="text-center text-xs text-ink/45">
          /dev/detail-preview — 레이아웃·버튼 확인용
        </p>
        <DetailActionBar
          tab={toolTab}
          onTabChange={handleTabChange}
          editMode={editMode}
          onToggleEdit={() => setEditMode((v) => !v)}
          onSave={() => {
            setEditMode(false);
            setToast({ tone: "ok", message: "수정 내용이 저장되었습니다." });
          }}
          onUploadClick={() => fileInputRef.current?.click()}
          replaceImageIndex={replaceImageIndex}
          imageCount={imageUrls.length}
          onReplaceIndexChange={setReplaceImageIndex}
          aiText={aiText}
          onAiTextChange={setAiText}
          onAiSubmit={handleAiGenerate}
          patchIndex={patchIndex}
          onPatchIndexChange={setPatchIndex}
          patchInstruction={patchInstruction}
          onPatchInstructionChange={setPatchInstruction}
          onPatchSubmit={() =>
            setToast({
              tone: "info",
              message: "프리뷰에서는 섹션 AI API를 호출하지 않습니다. 결과 페이지에서 사용하세요.",
            })
          }
          sections={sections}
          hiddenIndexes={hiddenIndexes}
          onReorder={handleReorder}
          onToggleHidden={handleToggleHidden}
          category={previewCategory}
          feedProductName={previewProductName}
          feedImageUrls={imageUrls}
          blogProductName={previewProductName}
          blogCategory={previewCategory}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const error = validateImageFile(file);
            if (error) {
              setToast({ tone: "error", message: error });
              return;
            }
            const url = URL.createObjectURL(file);
            setImageUrls((prev) => {
              const next = [...prev];
              const target = Math.min(replaceImageIndex, next.length - 1);
              next[target] = url;
              return next;
            });
            setToast({ tone: "ok", message: "미리보기에 반영했습니다." });
          }}
        />
      </div>
      {toolTab === "instagram" ? (
        <div className="mx-auto max-w-[430px] border-x border-line bg-paper p-3 shadow-sm">
          <InstagramFeedPanel
            variant="workspace"
            productName={previewProductName}
            brandName={previewBrandName}
            sections={visibleSections}
            imageUrls={imageUrls}
            overrides={feedOverrides}
            onOverridesChange={setFeedOverrides}
          />
        </div>
      ) : toolTab === "blog" ? (
        <div className="mx-auto max-w-[430px] border-x border-line bg-paper p-3 shadow-sm">
          <BlogPostPanel
            variant="workspace"
            productName={previewProductName}
            brandName={previewBrandName}
            category={previewCategory}
            sections={visibleSections}
            imageUrls={imageUrls}
            description="속건조를 잡아주는 고보습 수분 크림입니다."
            features={["히알루론산 고함량", "무향·저자극", "끈적임 없는 마무리"]}
            howToUse="세안 후 토너 다음 단계에서 적당량을 펴 발라 주세요."
            caution="눈 주위를 피하고, 이상 반응 시 사용을 중단하세요."
            price={32900}
            blockOverrides={blogBlockOverrides}
            onBlockOverridesChange={setBlogBlockOverrides}
            globalOverrides={blogGlobalOverrides}
            onGlobalOverridesChange={setBlogGlobalOverrides}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-[430px] overflow-x-hidden border-x border-line bg-paper shadow-sm" data-pagzly-preview>
          <DetailSectionRenderer
            sections={visibleSections}
            imageUrls={imageUrls}
            category={previewCategory}
            brandName={previewBrandName}
            productName={previewProductName}
            edit={{
              enabled: editMode,
              onChange: (displayIndex, section) => {
                const originalIndex = visibleOriginalIndexes[displayIndex];
                if (originalIndex === undefined) return;
                setSections((prev) =>
                  prev.map((item, i) => (i === originalIndex ? section : item)),
                );
              },
              onReplaceImage: (imageIndex) => {
                setReplaceImageIndex(imageIndex);
                setToolTab("upload");
                fileInputRef.current?.click();
              },
              onRequestAiPatch: (index) => {
                setPatchIndex(index);
                setEditMode(true);
                setToolTab("patch");
              },
            }}
          />
        </div>
      )}
      {toast && (
        <ToastBanner
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
