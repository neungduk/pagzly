"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type DetailScrollRevealProps = {
  children: ReactNode;
  index: number;
  className?: string;
  /**
   * 히어로는 이미 ken-burns가 있어 y-offset을 줄인다.
   * "hero-follow"는 hero 바로 다음 섹션 1곳에만 쓰는 강한 scale+fade
   * (design-brief 제안 C) — 나머지 섹션은 전부 절제된 "section" 모션 유지.
   */
  variant?: "hero" | "section" | "hero-follow";
};

/** 상세페이지 섹션 진입 애니메이션 — 절제된 fade + slide-up + 미세 stagger */
export default function DetailScrollReveal({
  children,
  index,
  className = "",
  variant = "section",
}: DetailScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(el, { opacity: 1, y: 0, clearProps: "transform" });
      return;
    }

    const yFrom = variant === "hero" ? 12 : variant === "hero-follow" ? 26 : 20;
    const startRatio = variant === "hero" ? 0.92 : 0.9;
    const rect = el.getBoundingClientRect();
    const triggerLine = window.innerHeight * startRatio;
    // 이미 트리거선 위에 있으면 숨기지 않음 (히어로·풀페이지 캡처 시 opacity 0 방지)
    if (rect.top <= triggerLine) {
      gsap.set(el, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const tween = gsap.from(el, {
      opacity: 0,
      y: yFrom,
      // hero-follow 1곳에만 scale 진입을 더해 볼륨을 준다 (나머지는 scale 1 고정)
      scale: variant === "hero-follow" ? 0.94 : 1,
      duration: variant === "hero" ? 0.75 : variant === "hero-follow" ? 0.9 : 0.82,
      delay: Math.min(index * 0.05, 0.25),
      ease: "power2.out",
      immediateRender: false,
      scrollTrigger: {
        trigger: el,
        start: variant === "hero" ? "top 92%" : "top 90%",
        once: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [index, variant]);

  return (
    <div ref={ref} data-scroll-reveal className={className}>
      {children}
    </div>
  );
}

/** html-to-image 캡처 전 호출 — 모든 스크롤 애니메이션을 완료 상태로 고정 */
export function freezeScrollRevealAnimations(root: HTMLElement | null): void {
  if (!root) return;
  root.querySelectorAll("[data-scroll-reveal]").forEach((node) => {
    gsap.set(node, { opacity: 1, y: 0, clearProps: "transform" });
  });
  ScrollTrigger.refresh();
}
