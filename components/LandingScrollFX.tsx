"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * 랜딩 전역 스크롤 FX — 섹션 ink 펀치(스케일/클리핑), sticky progress 강화.
 * page 루트에 한 번만 마운트.
 */
export default function LandingScrollFX() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const punches = gsap.utils.toArray<HTMLElement>("[data-landing-punch]");
    const tweens = punches.map((el) =>
      gsap.fromTo(
        el,
        { opacity: 0.35, y: 72, scale: 0.94, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            end: "top 48%",
            scrub: 0.45,
          },
        },
      ),
    );

    const bands = gsap.utils.toArray<HTMLElement>("[data-landing-ink-band]");
    const bandTweens = bands.map((el) =>
      gsap.fromTo(
        el,
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "top 40%",
            scrub: 0.3,
          },
        },
      ),
    );

    return () => {
      tweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
      bandTweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
    };
  }, []);

  return null;
}
