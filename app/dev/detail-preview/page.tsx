"use client";

import { useRef, useState } from "react";
import { notFound } from "next/navigation";
import DetailSectionRenderer from "@/components/DetailSectionRenderer";
import DetailActionBar, { type DetailToolTab } from "@/components/DetailActionBar";
import ToastBanner from "@/components/ToastBanner";
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
    type: "checklist",
    slot: "checklist",
    heading: "이 크림이 하는 일",
    items: ["가벼운 젤", "속당김 케어", "무향", "아침·저녁"],
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    heading: "수분을 붙잡는 히알루론산",
    body: "겉만 번들거리지 않습니다. 피부 결 사이에 수분을 남기는 가벼운 제형이에요. 메이크업 전에도 부담 없이 레이어링할 수 있습니다.",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "texture_feel",
    heading: "답답함 없이 스며드는 결",
    body: "손끝에서 녹듯 펴집니다. 두껍게 올리지 않아도 충분한 촉촉함. 끈적임이 남지 않아 일상에 맞추기 좋습니다.",
    imageIndex: 2,
    imagePosition: "right",
  },
  {
    type: "illustration_banner",
    slot: "illustration_banner",
    heading: "수분 레이어의 리듬",
    body: "겹겹이 쌓인 수분감이 피부 결 사이로 스며듭니다. 아침과 저녁, 같은 리듬으로 케어하세요.",
    illustrationUrl: "/iteration-fixtures/04.jpg",
  },
  {
    type: "usage_steps",
    slot: "usage_steps",
    heading: "사용 순서",
    steps: [
      "세안 후 피부결을 정리합니다",
      "볼·이마에 소량씩 올립니다",
      "손바닥으로 가볍게 눌러 흡수시킵니다",
    ],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "실제 사용 장면",
    imageIndexes: [0, 3],
  },
  {
    type: "stat_infographic",
    slot: "stat_infographic",
    heading: "수치로 보는 핵심 포인트",
    metrics: [
      { label: "수분 개선", value: "87%", percent: 87, style: "number" },
      { label: "피부 장벽", value: "72%", percent: 72, style: "number" },
      { label: "만족도", value: "94%", percent: 94, style: "number" },
    ],
  },
  {
    type: "review_highlight",
    slot: "review_highlight",
    heading: "실제 구매자들이 자주 남긴 이야기",
    praises: [
      "촉촉함이 하루 종일 지속된다",
      "흡수가 빠르다",
      "무향이라 자극이 없다",
    ],
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
    type: "caution",
    slot: "caution",
    heading: "사용 시 주의",
    body: "상처·염증 부위에는 사용하지 마세요. 이상 반응이 있으면 사용을 중단하고 전문가와 상담하세요.",
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 32900,
    targetCustomer: "20~30대 여성",
    badges: ["무향", "50ml", "데일리 보습"],
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
  const [toast, setToast] = useState<{ message: string; tone: "error" | "info" | "ok" } | null>(
    null,
  );

  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  function handleTabChange(next: DetailToolTab) {
    setToolTab(next);
    if (next === "edit") setEditMode(true);
  }

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
      <div className="mx-auto max-w-[430px] overflow-hidden border-x border-line bg-paper shadow-sm">
        <DetailSectionRenderer
          sections={sections}
          imageUrls={imageUrls}
          category="화장품/뷰티"
          edit={{
            enabled: editMode,
            onChange: (index, section) => {
              setSections((prev) => prev.map((item, i) => (i === index ? section : item)));
            },
            onReplaceImage: (imageIndex) => {
              setReplaceImageIndex(imageIndex);
              setToolTab("upload");
              fileInputRef.current?.click();
            },
          }}
        />
      </div>
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
