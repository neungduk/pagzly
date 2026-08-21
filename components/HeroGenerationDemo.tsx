"use client";

import { useEffect, useMemo, useState } from "react";
import { getSlotTemplate } from "@/lib/section-templates";
import { slotDisplayLabel } from "@/components/GeneratingOverlay";

const DEMO_CATEGORY = "화장품/뷰티";
const DEMO_SLOTS = 6;
const STEP_MS = 700;
const HOLD_MS = 1200;

/**
 * 히어로용 생성 시뮬레이션 — 실제 카테고리 슬롯 라벨만 순차 완료 (무한 루프).
 * 가짜 숫자·후기 없음. prefers-reduced-motion 시 전부 완료 상태로 고정.
 */
export default function HeroGenerationDemo({
  length = "long",
}: {
  length?: "short" | "long";
}) {
  const slots = useMemo(() => {
    const template = getSlotTemplate(DEMO_CATEGORY, length);
    const cap = length === "short" ? template.length : DEMO_SLOTS;
    return template.slice(0, cap).map((def) => ({
      slot: def.slot,
      label: slotDisplayLabel(def.slot, def.note),
    }));
  }, [length]);

  const [completedCount, setCompletedCount] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) {
      setCompletedCount(slots.length);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    function tick(next: number) {
      if (cancelled) return;
      if (next > slots.length) {
        timer = setTimeout(() => {
          setCompletedCount(0);
          timer = setTimeout(() => tick(1), STEP_MS);
        }, HOLD_MS);
        return;
      }
      setCompletedCount(next);
      timer = setTimeout(() => tick(next + 1), STEP_MS);
    }

    timer = setTimeout(() => tick(1), 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slots.length]);

  return (
    <div
      className="mt-5 border border-line bg-white p-3 shadow-[4px_4px_0_0_#DAD5C9]"
      role="status"
      aria-live="polite"
      aria-label="상세페이지 생성 시뮬레이션"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-registration-red">
        Live · 생성 시뮬레이션
      </p>
      <p className="mt-1 text-xs text-ink/50">화장품/뷰티 슬롯이 순서대로 채워집니다</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {slots.map((item, index) => {
          const done = index < completedCount;
          const active = !reduced && index === completedCount && completedCount < slots.length;
          return (
            <li
              key={item.slot}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                done
                  ? "border-registration-red/25 bg-registration-red/5"
                  : active
                    ? "border-registration-red/40 bg-paper"
                    : "border-line bg-paper/80"
              }`}
            >
              <span className="text-xs font-semibold text-ink">{item.label}</span>
              <span
                className={`font-mono text-[10px] ${
                  done
                    ? "text-registration-red"
                    : active
                      ? "text-registration-red/80"
                      : "text-ink/30"
                }`}
              >
                {done ? "완료" : active ? "생성 중…" : "대기"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
