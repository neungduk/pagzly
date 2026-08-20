"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import CropMarks from "@/components/CropMarks";

type PipelineCardProps = {
  compact?: boolean;
  className?: string;
};

/**
 * 히어로 우측 파이프라인 카드.
 * 3단계를 GSAP 타임라인으로 순차 하이라이트 (3.5s 간격, 무한).
 * pagzly-pipeline-float 유지. prefers-reduced-motion 시 하이라이트만 고정.
 */
export default function PipelineCard({ compact = false, className = "" }: PipelineCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const steps = root.querySelectorAll<HTMLElement>("[data-pipeline-step]");
    if (steps.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      steps[steps.length - 1]?.classList.add("pipeline-step-active");
      return;
    }

    const tl = gsap.timeline({ repeat: -1 });
    const hold = 3.5;

    steps.forEach((step, i) => {
      tl.call(
        () => {
          steps.forEach((s) => s.classList.remove("pipeline-step-active"));
          step.classList.add("pipeline-step-active");
        },
        undefined,
        i === 0 ? 0 : `+=${hold}`,
      );
    });
    tl.to({}, { duration: hold });

    return () => {
      tl.kill();
      steps.forEach((s) => s.classList.remove("pipeline-step-active"));
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`pagzly-pipeline-float relative border border-line bg-white shadow-[6px_6px_0_0_#DAD5C9] ${
        compact ? "p-3" : "rotate-1 p-5 sm:p-6"
      } ${className}`}
    >
      <CropMarks />

      <div
        data-pipeline-step
        className="pipeline-step -m-1 rounded-sm border border-transparent p-1 transition-[border-color,box-shadow,background-color] duration-500"
      >
        <p
          className={`font-mono uppercase tracking-[0.2em] text-ink/40 ${
            compact ? "text-[8px]" : "text-[10px]"
          }`}
        >
          01 · Raw Input
        </p>
        <div
          className={`mt-1.5 flex items-center justify-center border border-line bg-[repeating-linear-gradient(135deg,theme(colors.line/40%),theme(colors.line/40%)_1px,transparent_1px,transparent_10px)] ${
            compact ? "aspect-[5/4] max-h-16" : "mt-2 aspect-[4/5]"
          }`}
        >
          <svg
            viewBox="0 0 48 48"
            className={`text-ink/30 ${compact ? "h-7 w-7" : "h-12 w-12"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="14" y="6" width="20" height="36" rx="2" />
            <path d="M14 16h20" />
            <circle cx="24" cy="27" r="5" />
          </svg>
        </div>
      </div>

      <div
        data-pipeline-step
        className={`pipeline-step rounded-sm border border-transparent p-1 -m-1 transition-[border-color,box-shadow,background-color] duration-500 ${
          compact ? "mt-2" : "mt-4"
        }`}
      >
        <p
          className={`font-mono uppercase tracking-[0.2em] text-ink/40 ${
            compact ? "text-[8px]" : "text-[10px]"
          }`}
        >
          02 · Color Extract
        </p>
        <div
          className={`flex items-center justify-center border border-line bg-paper/50 ${
            compact ? "mt-1.5 gap-2 py-2" : "mt-3 gap-5 py-6 sm:gap-8 sm:py-8"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <span
              className={`rounded-full bg-mustard shadow-[0_4px_16px_rgba(227,167,46,0.35)] ring-2 ring-paper ${
                compact ? "h-8 w-8" : "h-14 w-14 sm:h-16 sm:w-16"
              }`}
            />
            {!compact && (
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-mustard">
                Accent
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span
              className={`rounded-full border-2 border-line bg-paper shadow-[0_4px_14px_rgba(27,27,24,0.08)] ring-2 ring-white ${
                compact ? "h-8 w-8" : "h-14 w-14 sm:h-16 sm:w-16"
              }`}
            />
            {!compact && (
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/50">
                Base
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span
              className={`rounded-full bg-slate-blue shadow-[0_4px_16px_rgba(47,72,88,0.35)] ring-2 ring-paper ${
                compact ? "h-8 w-8" : "h-14 w-14 sm:h-16 sm:w-16"
              }`}
            />
            {!compact && (
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-blue">
                Deep
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        data-pipeline-step
        className={`pipeline-step rounded-sm border border-transparent p-1 -m-1 transition-[border-color,box-shadow,background-color] duration-500 ${
          compact ? "mt-2" : "mt-4"
        }`}
      >
        <p
          className={`font-mono uppercase tracking-[0.2em] text-registration-red ${
            compact ? "text-[8px]" : "text-[10px]"
          }`}
        >
          03 · Generated
        </p>
        <div className={`space-y-1 border border-line ${compact ? "mt-1 p-2" : "mt-2 space-y-1.5 p-3"}`}>
          <div className={`w-full bg-ink ${compact ? "h-4" : "h-8"}`} />
          <div className={`bg-line ${compact ? "h-2 w-3/4" : "h-3 w-3/4"}`} />
          <div className={`bg-line ${compact ? "h-2 w-1/2" : "h-3 w-1/2"}`} />
          {!compact && <div className="h-10 w-full bg-mustard/30" />}
          <div className="flex items-center justify-between pt-0.5">
            <div className={`bg-line ${compact ? "h-2 w-1/4" : "h-3 w-1/3"}`} />
            <span
              className={`font-mono font-semibold text-registration-red ${
                compact ? "text-[8px]" : "text-[9px]"
              }`}
            >
              ₩32,900
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .pipeline-step-active {
          border-color: rgba(193, 39, 45, 0.35) !important;
          background-color: rgba(193, 39, 45, 0.04);
          box-shadow: 0 0 0 1px rgba(193, 39, 45, 0.12);
        }
      `}</style>
    </div>
  );
}
