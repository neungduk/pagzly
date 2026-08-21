"use client";

import Image from "next/image";
import CropMarks from "@/components/CropMarks";
import PipelineCard from "@/components/PipelineCard";
import HeroGenerationDemo from "@/components/HeroGenerationDemo";

const HERO_SAMPLE = {
  name: "히알루론 수분 크림",
  category: "화장품",
  full: "/showcase/cosmetics-full.png",
  swatches: ["#E3A746", "#F5F3EE", "#2F4858"],
} as const;

/**
 * 히어로 우측 메인 비주얼 — 실제 완성 예시 스크린샷 + 보조 PipelineCard.
 */
export default function HeroShowcaseVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:mx-0 lg:max-w-none lg:ml-auto">
      <div
        className="relative z-10 rotate-1 overflow-hidden border border-line bg-white shadow-[8px_8px_0_0_#DAD5C9]"
      >
        <CropMarks />
        <div className="relative aspect-[3/4] w-full max-h-[min(72vh,640px)] sm:aspect-[4/5] lg:aspect-[3/4]">
          <Image
            src={HERO_SAMPLE.full}
            alt={`${HERO_SAMPLE.name} 상세페이지 예시`}
            fill
            className="object-cover object-top"
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 480px"
            priority
          />
          <span
            className="absolute left-3 top-3 z-10 rounded bg-registration-red px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-paper"
          >
            예시
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-registration-red">
              {HERO_SAMPLE.category} · 예시
            </p>
            <p className="mt-0.5 font-heading text-sm font-bold text-ink sm:text-base">
              {HERO_SAMPLE.name}
            </p>
          </div>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {HERO_SAMPLE.swatches.map((color) => (
              <span
                key={color}
                className="h-3.5 w-3.5 rounded-full ring-1 ring-line sm:h-4 sm:w-4"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start sm:gap-5">
        <HeroGenerationDemo />
        <div className="sm:pt-1">
          <PipelineCard compact className="rotate-2 shadow-[4px_4px_0_0_#DAD5C9]" />
        </div>
      </div>
    </div>
  );
}
