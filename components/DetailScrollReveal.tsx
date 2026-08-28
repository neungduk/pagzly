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
   * 히어로는 ken-burns·ink-scan이 있어 y를 줄인다.
   * hero-follow / section 은 ink 와이프·레일로 더 강하게.
   */
  variant?: "hero" | "section" | "section-alt" | "hero-follow";
};

/** 상세페이지 섹션 진입 — ink 블랙 와이프 + 강한 slide/scale (미리보기 전용 감성) */
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
      gsap.set(el, { opacity: 1, y: 0, scale: 1, clearProps: "transform" });
      el.classList.add("is-ink-in");
      return;
    }

    const yFrom =
      variant === "hero"
        ? 18
        : variant === "hero-follow"
          ? 42
          : variant === "section-alt"
            ? 28
            : 36;
    const scaleFrom =
      variant === "hero"
        ? 1
        : variant === "hero-follow"
          ? 0.9
          : variant === "section-alt"
            ? 0.96
            : 0.94;
    const startRatio = variant === "hero" ? 0.94 : 0.88;
    const rect = el.getBoundingClientRect();
    const triggerLine = window.innerHeight * startRatio;

    if (rect.top <= triggerLine) {
      gsap.set(el, { opacity: 1, y: 0, scale: 1 });
      el.classList.add("is-ink-in");
      return;
    }

    gsap.set(el, { opacity: 0, y: yFrom, scale: scaleFrom });

    const tween = gsap.to(el, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: variant === "hero" ? 0.85 : variant === "hero-follow" ? 1.05 : 0.95,
      delay: Math.min(index * 0.04, 0.2),
      ease: "power3.out",
      immediateRender: false,
      scrollTrigger: {
        trigger: el,
        start: variant === "hero" ? "top 94%" : "top 88%",
        once: true,
        onEnter: () => el.classList.add("is-ink-in"),
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [index, variant]);

  const showInkFx = variant !== "hero";

  return (
    <div ref={ref} data-scroll-reveal className={`relative ${className}`}>
      {showInkFx ? (
        <>
          <span className="pagzly-ink-rail" aria-hidden="true" />
          <span className="pagzly-ink-wipe" aria-hidden="true" />
        </>
      ) : null}
      {children}
    </div>
  );
}

/** html-to-image 캡처 전 — 스크롤·차트·ink 펄스/스캔을 완료 상태로 고정 */
export function freezeScrollRevealAnimations(root: HTMLElement | null): void {
  if (!root) return;
  root.querySelectorAll("[data-scroll-reveal]").forEach((node) => {
    const el = node as HTMLElement;
    el.classList.add("is-ink-in");
    gsap.set(el, { opacity: 1, y: 0, scale: 1, clearProps: "transform" });
  });
  root.querySelectorAll<HTMLElement>("[data-fill-bar]").forEach((node) => {
    const pct = node.dataset.fillPercent ?? "100";
    node.style.transition = "none";
    node.style.width = `${pct}%`;
  });
  root.querySelectorAll<SVGCircleElement>("[data-radial-gauge] circle:last-child").forEach((node) => {
    const svg = node.ownerSVGElement;
    const pct = Number(svg?.dataset.fillPercent ?? "100");
    const strokeWidth = Number(node.getAttribute("stroke-width") ?? 9);
    const size = Number(svg?.getAttribute("width") ?? 96);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    node.style.transition = "none";
    node.style.strokeDashoffset = String(circumference * (1 - Math.min(100, Math.max(0, pct)) / 100));
  });

  const killAnim = (selector: string, final?: (el: HTMLElement) => void) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      node.style.animation = "none";
      final?.(node);
    });
  };

  killAnim(".pagzly-pulse-card");
  killAnim(".pagzly-hero-photo", (el) => {
    el.style.transform = "scale(1.04)";
  });
  killAnim(".pagzly-ink-scan", (el) => {
    el.style.opacity = "0.85";
  });
  killAnim(".pagzly-ink-wipe", (el) => {
    el.style.opacity = "0";
    el.style.transform = "scaleX(0)";
  });
  killAnim(".pagzly-ink-rail", (el) => {
    el.style.transform = "scaleY(1)";
    el.style.opacity = "0.9";
  });
  killAnim(".pagzly-ink-cta");
  killAnim(".pagzly-ink-shimmer");
  root.classList.add("is-pagzly-frozen");
  root.querySelectorAll("[data-pagzly-preview]").forEach((node) => {
    (node as HTMLElement).classList.add("is-pagzly-frozen");
  });

  ScrollTrigger.refresh();
}

/** PNG 캡처 후 미리보기 ink/펄스 모션 재개 */
export function unfreezeScrollRevealAnimations(root: HTMLElement | null): void {
  if (!root) return;
  root.classList.remove("is-pagzly-frozen");
  root.querySelectorAll("[data-pagzly-preview]").forEach((node) => {
    (node as HTMLElement).classList.remove("is-pagzly-frozen");
  });
  root.querySelectorAll<HTMLElement>(
    ".pagzly-pulse-card, .pagzly-hero-photo, .pagzly-ink-scan, .pagzly-ink-wipe, .pagzly-ink-rail, .pagzly-ink-cta, .pagzly-ink-shimmer",
  ).forEach((node) => {
    node.style.animation = "";
    node.style.opacity = "";
    node.style.transform = "";
  });
}
