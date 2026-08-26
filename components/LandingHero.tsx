"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type LandingHeroProps = {
  startHref: string;
};

const BRAND = "Pagzly";

/**
 * 랜딩 첫 뷰포트 — 풀블리드 + 레터 스태거 + 커서 ink 스포트라이트 + 스크롤 패럴랙스.
 */
export default function LandingHero({ startHref }: LandingHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const letters = root.querySelectorAll<HTMLElement>("[data-brand-letter]");
    const title = root.querySelector("[data-hero-title]");
    const sub = root.querySelector("[data-hero-sub]");
    const cta = root.querySelector("[data-hero-cta]");
    const media = root.querySelector("[data-hero-media]");
    const flash = root.querySelector("[data-hero-flash]");
    const stats = root.querySelectorAll<HTMLElement>("[data-hero-stat]");

    if (reduced) {
      gsap.set([letters, title, sub, cta, media, stats], { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 });
      if (flash) gsap.set(flash, { opacity: 0 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    gsap.set(letters, { opacity: 0, y: 80, rotateX: -55, transformOrigin: "50% 100%" });
    gsap.set([title, sub, cta], { opacity: 0, y: 48 });
    gsap.set(stats, { opacity: 0, y: 24 });
    gsap.set(media, { opacity: 0, scale: 1.18 });
    if (flash) gsap.set(flash, { scaleX: 1, opacity: 1 });

    tl.to(media, { opacity: 1, scale: 1, duration: 1.6 }, 0);
    if (flash) {
      tl.to(flash, { scaleX: 0, opacity: 0.85, duration: 0.55, ease: "power3.inOut" }, 0.15);
    }
    tl.to(
      letters,
      { opacity: 1, y: 0, rotateX: 0, duration: 0.85, stagger: 0.055 },
      0.28,
    )
      .to(title, { opacity: 1, y: 0, duration: 0.85 }, 0.55)
      .to(sub, { opacity: 1, y: 0, duration: 0.7 }, 0.7)
      .to(cta, { opacity: 1, y: 0, duration: 0.65 }, 0.82)
      .to(stats, { opacity: 1, y: 0, duration: 0.55, stagger: 0.08 }, 0.9);

    const parallax = gsap.to(media, {
      yPercent: 18,
      ease: "none",
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });

    const spot = spotRef.current;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = window.innerWidth * 0.65;
    let cy = window.innerHeight * 0.4;

    function onMove(e: PointerEvent) {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function tick() {
      raf = 0;
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      if (spot) {
        spot.style.setProperty("--spot-x", `${cx}px`);
        spot.style.setProperty("--spot-y", `${cy}px`);
      }
    }

    root.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      tl.kill();
      parallax.scrollTrigger?.kill();
      parallax.kill();
      root.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative isolate min-h-[100svh] overflow-hidden bg-ink text-paper"
      aria-label="Pagzly 소개"
    >
      <div
        ref={spotRef}
        className="pagzly-landing-spot pointer-events-none absolute inset-0 z-[1]"
        aria-hidden="true"
      />

      <div data-hero-media className="absolute inset-0 will-change-transform">
        <Image
          src="/showcase/cosmetics-full.png"
          alt=""
          fill
          priority
          className="object-cover object-top opacity-60 pagzly-landing-kenburns"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/35"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent"
          aria-hidden="true"
        />
        <div className="pagzly-landing-scan pagzly-landing-scan-fast" aria-hidden="true" />
        <div className="pagzly-landing-grid" aria-hidden="true" />
        <div className="pagzly-landing-noise" aria-hidden="true" />
        <div className="pagzly-landing-orb pagzly-landing-orb-a" aria-hidden="true" />
        <div className="pagzly-landing-orb pagzly-landing-orb-b" aria-hidden="true" />
        <div className="pagzly-landing-orb pagzly-landing-orb-c" aria-hidden="true" />
      </div>

      <div
        data-hero-flash
        className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-full origin-left bg-paper"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-14 pt-28 sm:pb-20 sm:pt-32 lg:justify-center lg:pb-24">
        <p
          className="flex flex-wrap font-heading text-[clamp(4rem,18vw,11rem)] font-bold leading-[0.82] tracking-[-0.07em] text-paper [perspective:800px]"
          aria-label="Pagzly"
        >
          {BRAND.split("").map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              data-brand-letter
              className="inline-block pagzly-landing-brand-letter"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              {ch}
            </span>
          ))}
        </p>

        <h1
          data-hero-title
          className="mt-10 max-w-3xl font-heading text-[clamp(1.85rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.035em] text-paper sm:mt-12"
        >
          사진 한 장으로,
          <br />
          팔리는 상세페이지를{" "}
          <span className="pagzly-landing-ink-underline relative inline-block text-registration-red">
            2분 안에
          </span>
        </h1>

        <p
          data-hero-sub
          className="mt-5 max-w-xl text-base leading-relaxed text-paper/72 sm:text-lg"
        >
          AI가 색·카피·레이아웃까지 자동 완성합니다. 시안 기다리다 놓치는 주문을
          끊으세요.
        </p>

        <div data-hero-cta className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={startHref}
            className="pagzly-landing-cta pagzly-landing-cta-xl group relative inline-flex min-h-[3.25rem] items-center justify-center overflow-hidden bg-paper px-9 py-3.5 text-base font-bold text-ink transition-transform duration-200 hover:scale-[1.04] active:scale-[0.98]"
          >
            <span
              className="pointer-events-none absolute inset-0 origin-bottom translate-y-full bg-ink transition-transform duration-300 ease-out group-hover:translate-y-0"
              aria-hidden="true"
            />
            <span className="relative z-10 transition-colors duration-300 group-hover:text-paper">
              무료로 시작하기 →
            </span>
          </Link>
          <a
            href="#live-pipeline"
            className="inline-flex h-12 items-center justify-center border border-paper/40 px-7 text-sm font-semibold text-paper transition-all hover:border-paper hover:bg-paper hover:text-ink"
          >
            완성 예시 보기
          </a>
        </div>

        <dl className="mt-10 flex flex-wrap gap-8 border-t border-paper/15 pt-6 sm:gap-12">
          {[
            { value: "2–3분", label: "평균 생성" },
            { value: "5카테고리", label: "컬러 엔진" },
            { value: "PNG 즉시", label: "마켓 등록" },
          ].map((stat) => (
            <div key={stat.label} data-hero-stat>
              <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">
                {stat.label}
              </dt>
              <dd className="mt-1 font-heading text-xl font-bold tracking-tight text-paper sm:text-2xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div
        className="pointer-events-none absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        aria-hidden="true"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-paper/45">
          Scroll
        </span>
        <span className="pagzly-landing-scroll-line h-12 w-px bg-paper/50" />
      </div>
    </section>
  );
}
