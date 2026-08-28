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

export default function DetailPreviewPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sections, setSections] = useState(initialSections);
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
          category="화장품/뷰티"
          feedProductName="히알루론 수분 크림"
          feedImageUrls={imageUrls}
          blogProductName="히알루론 수분 크림"
          blogCategory="화장품/뷰티"
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
            productName="히알루론 수분 크림"
            brandName="테스트 브랜드"
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
            productName="히알루론 수분 크림"
            brandName="테스트 브랜드"
            category="화장품/뷰티"
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
            category="화장품/뷰티"
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
