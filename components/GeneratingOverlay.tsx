"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { getSlotTemplate } from "@/lib/section-templates";

export type GeneratingStage = "uploading" | "backdrop" | "enhancing" | "generating";

const STAGE_MESSAGES: Record<GeneratingStage, string> = {
  uploading: "사진 업로드 중",
  backdrop: "배경 디자인 생성 중",
  enhancing: "사진 보정 중",
  generating: "AI 상세페이지 생성 중",
};

/** 슬롯명 → 카드에 표시할 짧은 한글 라벨 */
const SLOT_LABELS: Record<string, string> = {
  hero: "히어로",
  brand_story: "브랜드 스토리",
  checklist: "핵심 포인트",
  quick_points: "미니 포인트",
  target_persona: "추천 대상",
  ingredient_highlight: "성분/기능",
  texture_feel: "질감/사용감",
  texture_closeup: "텍스처 클로즈업",
  illustration_banner: "일러스트 배너",
  usage_steps: "사용법",
  cooking_steps: "조리법",
  gallery: "갤러리",
  model_multicut: "모델 멀티컷",
  detail_zoom: "디테일 확대",
  color_variation: "컬러 베리에이션",
  coordination: "코디 제안",
  size_table: "사이즈표",
  care_info: "세탁/보관",
  packaging: "패키징",
  nutrition_table: "영양 정보",
  feature_detail: "기능 상세",
  comparison_table: "비교표",
  usage_scenario: "사용 장면",
  material_feature: "소재 특징",
  package_contents: "구성품",
  warranty_caution: "보증/주의",
  stat_infographic: "수치 인포그래픽",
  spec_table: "상품 정보",
  faq: "FAQ",
  caution: "주의사항",
  shipping_info: "배송/교환",
  cta_price: "가격/구매",
};

/** note에서 괄호·마침표 앞 짧은 라벨 추출 */
export function slotDisplayLabel(slot: string, note: string): string {
  if (SLOT_LABELS[slot]) return SLOT_LABELS[slot];
  const cut = note.split(/[(.]/)[0]?.trim();
  return cut && cut.length > 0 ? cut.slice(0, 16) : slot;
}

/** 연출용 예상 총 소요(ms). 실제 API 시간과 무관 — snapComplete로 조기 종료 */
const ESTIMATED_TOTAL_MS = 48_000;
const SNAP_HOLD_MS = 350;

type CardStatus = "pending" | "active" | "done";

type GeneratingOverlayProps = {
  stage: GeneratingStage;
  category: string;
  productName: string;
  /** API가 먼저 끝나면 true → 남은 카드 즉시 완료 */
  snapComplete?: boolean;
};

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ShimmerBar({ active }: { active: boolean }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line/60">
      <div
        className={`h-full rounded-full ${
          active ? "bg-registration-red/70" : "w-0 bg-transparent"
        }`}
        style={
          active
            ? {
                width: "66%",
                backgroundImage:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
                backgroundSize: "200% 100%",
                animation: "pagzly-overlay-shimmer 1.2s ease-in-out infinite",
              }
            : undefined
        }
      />
    </div>
  );
}

export default function GeneratingOverlay({
  stage,
  category,
  productName,
  snapComplete = false,
}: GeneratingOverlayProps) {
  const slots = useMemo(() => getSlotTemplate(category), [category]);
  const [completedCount, setCompletedCount] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const perSlotMs = Math.max(900, Math.floor(ESTIMATED_TOTAL_MS / Math.max(slots.length, 1)));

  useEffect(() => {
    if (snapComplete) return;
    if (slots.length === 0) return;

    intervalRef.current = setInterval(() => {
      setCompletedCount((prev) => {
        if (prev >= slots.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, perSlotMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slots.length, perSlotMs, snapComplete]);

  useEffect(() => {
    if (!snapComplete) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCompletedCount(slots.length);
  }, [snapComplete, slots.length]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const cards = list.querySelectorAll("[data-overlay-card]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }
    gsap.fromTo(
      cards,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: "power2.out" },
    );
  }, [slots]);

  function statusFor(index: number): CardStatus {
    if (index < completedCount) return "done";
    if (index === completedCount && completedCount < slots.length) return "active";
    return "pending";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-paper"
      role="status"
      aria-live="polite"
      aria-busy={!snapComplete}
      data-testid="generating-overlay"
      data-snap={snapComplete ? "true" : "false"}
      data-completed={completedCount}
    >
      <style>{`
        @keyframes pagzly-overlay-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="border-b border-line bg-paper/95 px-5 py-4 backdrop-blur-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-registration-red">
          입력 내용
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-heading text-lg font-bold text-ink">{productName || "상품"}</h2>
          <span className="rounded-md bg-line/50 px-2 py-0.5 text-xs font-medium text-ink/70">
            {category || "카테고리"}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink/55">{STAGE_MESSAGES[stage]}…</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <ul ref={listRef} className="mx-auto flex max-w-lg flex-col gap-2.5">
          {slots.map((def, index) => {
            const status = statusFor(index);
            const label = slotDisplayLabel(def.slot, def.note);
            return (
              <li
                key={`${def.slot}-${index}`}
                data-overlay-card
                data-slot={def.slot}
                data-status={status}
                className={`rounded-xl border px-4 py-3 transition-colors ${
                  status === "done"
                    ? "border-registration-red/25 bg-registration-red/5"
                    : status === "active"
                      ? "border-registration-red/40 bg-paper shadow-sm"
                      : "border-line bg-paper/80"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{label}</p>
                    <p className="mt-0.5 text-xs text-ink/45">
                      {status === "done"
                        ? "완료"
                        : status === "active"
                          ? "생성 중…"
                          : "대기"}
                    </p>
                  </div>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      status === "done"
                        ? "bg-registration-red text-paper"
                        : status === "active"
                          ? "border border-registration-red/40 text-registration-red"
                          : "border border-line text-ink/25"
                    }`}
                  >
                    {status === "done" ? (
                      <CheckIcon />
                    ) : status === "active" ? (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-registration-red" />
                    ) : (
                      <span className="text-[10px] font-mono">{index + 1}</span>
                    )}
                  </div>
                </div>
                {status === "active" && <ShimmerBar active />}
                {status === "done" && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-registration-red/20">
                    <div className="h-full w-full rounded-full bg-registration-red/70" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="border-t border-line px-5 py-3 text-center text-xs text-ink/45">
        잠시만 기다려 주세요. 섹션이 순서대로 채워집니다.
      </p>
    </div>
  );
}

/** CreateProductForm에서 API 완료 후 스냅 연출을 잠깐 보여 줄 때 */
export { SNAP_HOLD_MS };
