"use client";

import Image from "next/image";
import CropMarks from "@/components/CropMarks";
import PipelineCard from "@/components/PipelineCard";
import HeroGenerationDemo from "@/components/HeroGenerationDemo";
import RevealOnScroll from "@/components/RevealOnScroll";

const HERO_SAMPLE = {
  name: "히알루론 수분 크림",
  category: "화장품",
  full: "/showcase/cosmetics-full.png",
  swatches: ["#E3A746", "#F5F3EE", "#2F4858"],
} as const;

/** 히어로 아래 — 완성 예시 + 생성 시뮬레이션 (첫 뷰포트 밖) */
export default function LandingProductStage() {
  return (
    <section
      id="live-pipeline"
      className="relative overflow-hidden border-b border-line bg-paper py-20 sm:py-28"
    >
      <div className="pagzly-landing-orb pagzly-landing-orb-stage" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        <RevealOnScroll intensity="strong">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-registration-red">
            Live pipeline
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-ink sm:text-4xl">
            업로드하는 순간,
            <br />
            상세페이지가 조립됩니다
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink/60">
            실제 생성 흐름을 미리 보여 줍니다. 슬롯이 채워지는 동안 옆에서는
            완성본이 대기합니다.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start">
            <HeroGenerationDemo />
            <div className="sm:pt-1">
              <PipelineCard compact className="rotate-2 shadow-[6px_6px_0_0_#1B1B18]" />
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll intensity="strong" delayMs={120} className="relative">
          <div className="relative z-10 -rotate-1 overflow-hidden border-2 border-ink bg-white shadow-[12px_12px_0_0_#1B1B18]">
            <CropMarks color="text-ink/30" />
            <div className="relative aspect-[3/4] w-full max-h-[min(70vh,620px)]">
              <Image
                src={HERO_SAMPLE.full}
                alt={`${HERO_SAMPLE.name} 상세페이지 예시`}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 90vw, 480px"
              />
              <div className="pagzly-landing-frame-scan" aria-hidden="true" />
            </div>
            <div className="flex items-center justify-between border-t-2 border-ink bg-white px-4 py-3 sm:px-5 sm:py-4">
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
                    className="h-3.5 w-3.5 ring-1 ring-ink/20 sm:h-4 sm:w-4"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
