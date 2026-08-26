"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CropMarks from "@/components/CropMarks";
import SpotlightCard from "@/components/SpotlightCard";

gsap.registerPlugin(ScrollTrigger);

type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

type ProcessStepsProps = {
  steps: ProcessStep[];
};

/** Process 3단계 카드 + 점선 연결선 draw-in (ScrollTrigger scrub). */
export default function ProcessSteps({ steps }: ProcessStepsProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const path = pathRef.current;
    if (!wrap || !path) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const length = path.getTotalLength();
    path.style.strokeDasharray = "5 5";
    path.style.strokeDashoffset = reduced ? "0" : `${length}`;

    if (reduced) return;

    const tween = gsap.to(path, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        trigger: wrap,
        start: "top 75%",
        end: "bottom 55%",
        scrub: 0.6,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative mt-16">
      {/* 데스크톱: 카드 사이 가로 점선 */}
      <svg
        className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-[2.75rem] hidden h-8 w-[66.8%] sm:block"
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          ref={pathRef}
          d="M 0 6 C 16 6, 16 6, 33 6 S 50 6, 50 6 S 67 6, 67 6 S 84 6, 100 6"
          fill="none"
          stroke="#1B1B18"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="relative grid gap-8 sm:grid-cols-3">
        {steps.map((item) => (
          <SpotlightCard
            key={item.step}
            className="relative border-2 border-ink/15 bg-white p-8 shadow-[6px_6px_0_0_#1B1B18] transition-transform duration-300 hover:-translate-y-2 hover:shadow-[10px_10px_0_0_#1B1B18]"
          >
            <CropMarks />
            <span className="font-mono text-sm font-semibold text-ink">
              STEP {item.step}
            </span>
            <h3 className="mt-4 font-heading text-xl font-bold text-ink">{item.title}</h3>
            <p className="mt-3 leading-relaxed text-ink/60">{item.description}</p>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
}
