"use client";

import { useRef, useState } from "react";
import DetailSectionRenderer from "@/components/DetailSectionRenderer";
import DetailActionBar from "@/components/DetailActionBar";
import ToastBanner from "@/components/ToastBanner";
import type { DetailSection } from "@/lib/types/generate";
import { validateImageFile } from "@/lib/image-upload";

const initialImageUrls = [
  "https://picsum.photos/seed/pagzly-hero/800/1000",
  "https://picsum.photos/seed/pagzly-a/800/800",
  "https://picsum.photos/seed/pagzly-b/800/800",
  "https://picsum.photos/seed/pagzly-c/800/1067",
];

const initialSections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "하루 종일 촉촉한 수분 장벽",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "이 크림이 하는 일",
    items: ["가벼운 젤 크림", "속건조 케어", "무향 포뮬러", "아침·저녁 사용"],
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    heading: "히알루론산이 수분을 붙잡습니다",
    body: "겉만 번들거리는 보습이 아니라, 피부 결 사이사이에 수분을 남기는 가벼운 제형입니다.",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "texture_feel",
    heading: "바른 뒤에도 답답하지 않은 결",
    body: "손가락 끝에서 녹듯 펴지고, 메이크업 전에 올려도 밀리지 않습니다.",
    imageIndex: 2,
    imagePosition: "right",
  },
  {
    type: "usage_steps",
    slot: "usage_steps",
    heading: "사용 순서",
    steps: ["세안 후 피부결을 정리합니다", "양 볼·이마에 소량씩 올립니다", "손바닥으로 가볍게 눌러 흡수시킵니다"],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "실제 사용 장면",
    imageIndexes: [0, 3],
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
    body: "상처나 염증 부위에는 사용하지 마세요. 이상 반응이 있으면 사용을 중단하세요.",
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 32900,
    targetCustomer: "20~30대 여성",
    badges: ["무향", "가벼운 제형"],
  },
];

export default function DetailPreviewPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sections, setSections] = useState(initialSections);
  const [imageUrls, setImageUrls] = useState(initialImageUrls);
  const [editMode, setEditMode] = useState(false);
  const [replaceImageIndex, setReplaceImageIndex] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "error" | "info" | "ok" } | null>(
    null,
  );

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
      <div className="mx-auto max-w-[430px] space-y-3 px-3 py-3">
        <p className="text-center text-xs text-ink/45">
          /dev/detail-preview — 레이아웃·버튼 확인용
        </p>
        <DetailActionBar
          editMode={editMode}
          onToggleEdit={() => setEditMode((v) => !v)}
          onSave={() => {
            setEditMode(false);
            setToast({ tone: "ok", message: "수정 내용이 저장되었습니다." });
          }}
          onUploadClick={() => fileInputRef.current?.click()}
          onAiClick={() => setAiOpen(true)}
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
        {aiOpen && (
          <div className="rounded-xl border border-line p-3">
            <textarea
              data-testid="ai-wholesale"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              rows={4}
              placeholder="원본 상품 정보를 붙여넣어 주세요."
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
            <button
              type="button"
              data-testid="ai-submit"
              onClick={handleAiGenerate}
              className="mt-2 h-10 rounded-lg bg-registration-red px-4 text-sm font-semibold text-paper"
            >
              생성 요청
            </button>
          </div>
        )}
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
