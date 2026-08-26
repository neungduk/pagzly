"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  /** true면 직계 children을 개별 순차 등장 (stagger 0.08s) */
  stagger?: boolean;
  /** strong: 랜딩용 더 큰 이동·스케일 */
  intensity?: "default" | "strong";
};

/** 랜딩 전용 GSAP ScrollTrigger 등장. prefers-reduced-motion 시 즉시 표시. */
export default function RevealOnScroll({
  children,
  className = "",
  delayMs = 0,
  stagger = false,
  intensity = "default",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = stagger
      ? (gsap.utils.toArray(el.children) as HTMLElement[])
      : [el];

    if (targets.length === 0) return;

    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const yFrom = intensity === "strong" ? 48 : 28;
    const scaleFrom = intensity === "strong" ? 0.96 : 1;

    gsap.set(targets, { opacity: 0, y: yFrom, scale: scaleFrom });
    const tween = gsap.to(targets, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: intensity === "strong" ? 1.05 : 0.9,
      delay: delayMs / 1000,
      ease: "power3.out",
      stagger: stagger ? (intensity === "strong" ? 0.12 : 0.08) : 0,
      scrollTrigger: {
        trigger: el,
        start: intensity === "strong" ? "top 90%" : "top 88%",
        once: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delayMs, stagger, intensity]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
