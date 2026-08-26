"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";

type LandingHeroProps = {
  startHref: string;
};

/**
 * 랜딩 첫 뷰포트 — 풀블리드 비주얼 + Pagzly 브랜드 히어로 + ink 모션.
 * (상세결과 미리보기와 무관. prefers-reduced-motion 시 정적.)
 */
export default function LandingHero({ startHref }: LandingHeroProps) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const brand = root.querySelector("[data-hero-brand]");
    const title = root.querySelector("[data-hero-title]");
    const sub = root.querySelector("[data-hero-sub]");
    const cta = root.querySelector("[data-hero-cta]");
    const media = root.querySelector("[data-hero-media]");

    if (reduced) {
      gsap.set([brand, title, sub, cta, media], { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    gsap.set([brand, title, sub, cta], { opacity: 0, y: 36 });
    gsap.set(media, { opacity: 0, scale: 1.08 });

    tl.to(media, { opacity: 1, scale: 1, duration: 1.35 }, 0)
      .to(brand, { opacity: 1, y: 0, duration: 0.85 }, 0.25)
      .to(title, { opacity: 1, y: 0, duration: 0.9 }, 0.4)
      .to(sub, { opacity: 1, y: 0, duration: 0.75 }, 0.55)
      .to(cta, { opacity: 1, y: 0, duration: 0.7 }, 0.68);

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative isolate min-h-[100svh] overflow-hidden bg-ink text-paper"
      aria-label="Pagzly 소개"
    >
      <div data-hero-media className="absolute inset-0">
        <Image
          src="/showcase/cosmetics-full.png"
          alt=""
          fill
          priority
          className="object-cover object-top opacity-55 pagzly-landing-kenburns"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-ink via-ink/88 to-ink/45"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/20"
          aria-hidden="true"
        />
        <div className="pagzly-landing-scan" aria-hidden="true" />
        <div className="pagzly-landing-grid" aria-hidden="true" />
        <div className="pagzly-landing-orb pagzly-landing-orb-a" aria-hidden="true" />
        <div className="pagzly-landing-orb pagzly-landing-orb-b" aria-hidden="true" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-16 pt-28 sm:pb-20 sm:pt-32 lg:justify-center lg:pb-24">
        <p
          data-hero-brand
          className="font-heading text-[clamp(3.5rem,14vw,9rem)] font-bold leading-[0.85] tracking-[-0.06em] text-paper"
        >
          Pagzly
        </p>
        <h1
          data-hero-title
          className="mt-6 max-w-3xl font-heading text-[clamp(1.75rem,4.5vw,3.25rem)] font-bold leading-[1.12] tracking-[-0.03em] text-paper"
        >
          사진 한 장으로,
          <br />
          팔리는 상세페이지를{" "}
          <span className="pagzly-landing-ink-underline relative inline-block">
            2분 안에
          </span>
        </h1>
        <p
          data-hero-sub
          className="mt-5 max-w-xl text-base leading-relaxed text-paper/70 sm:text-lg"
        >
          AI가 색·카피·레이아웃까지 자동 완성합니다. 시안을 기다리는 동안 놓치는
          주문을 줄이세요.
        </p>
        <div data-hero-cta className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href={startHref}
            className="pagzly-landing-cta inline-flex min-h-12 items-center justify-center bg-paper px-8 py-3 text-base font-semibold text-ink transition-transform duration-200 hover:bg-paper/90 active:scale-[0.98]"
          >
            무료로 시작하기
          </Link>
          <a
            href="#live-pipeline"
            className="inline-flex h-12 items-center justify-center border border-paper/35 px-7 text-sm font-semibold text-paper/90 transition-colors hover:border-paper hover:bg-paper/10"
          >
            완성 예시 보기
          </a>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        aria-hidden="true"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-paper/45">
          Scroll
        </span>
        <span className="pagzly-landing-scroll-line h-10 w-px bg-paper/40" />
      </div>
    </section>
  );
}
