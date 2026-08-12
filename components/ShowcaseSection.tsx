"use client";

import { useEffect, useRef, useState } from "react";

const CARD_WIDTH = 280;
const CARD_GAP = 24;
const STEP = CARD_WIDTH + CARD_GAP;

const samples = [
  {
    name: "스킨케어 크림",
    category: "화장품",
    emoji: "🧴",
    conversion: "+32%",
    bg: "from-pink-50 to-rose-100",
  },
  {
    name: "무선 이어폰",
    category: "전자제품",
    emoji: "🎧",
    conversion: "+28%",
    bg: "from-slate-50 to-blue-100",
  },
  {
    name: "린넨 셔츠",
    category: "의류",
    emoji: "👔",
    conversion: "+41%",
    bg: "from-amber-50 to-orange-100",
  },
  {
    name: "프로틴 쉐이크",
    category: "식품",
    emoji: "🥤",
    conversion: "+35%",
    bg: "from-green-50 to-emerald-100",
  },
  {
    name: "반려동물 간식",
    category: "펫",
    emoji: "🐾",
    conversion: "+29%",
    bg: "from-violet-50 to-purple-100",
  },
];

function ShowcaseCard({
  item,
  isVisible,
  delay,
}: {
  item: (typeof samples)[number];
  isVisible: boolean;
  delay: number;
}) {
  return (
    <div
      className={`w-[280px] shrink-0 rounded-2xl bg-white p-5 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-xl ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className={`flex h-44 items-center justify-center rounded-xl bg-gradient-to-br ${item.bg}`}
      >
        <span className="text-6xl" role="img" aria-label={item.name}>
          {item.emoji}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.name}</h3>
      <span className="mt-2 inline-block rounded-full bg-[#6366f1]/10 px-3 py-1 text-xs font-medium text-[#6366f1]">
        {item.category}
      </span>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
        <span className="text-gray-500">3분 만에 완성</span>
        <span className="font-semibold text-[#6366f1]">
          전환율 {item.conversion}
        </span>
      </div>
    </div>
  );
}

export default function ShowcaseSection() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [enableTransition, setEnableTransition] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  const duplicated = [...samples, ...samples];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 },
    );

    const section = sectionRef.current;
    if (section) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPaused || !isVisible) return;

    const timer = setInterval(() => {
      setIndex((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(timer);
  }, [isPaused, isVisible]);

  useEffect(() => {
    if (index !== samples.length) return;

    const timeout = setTimeout(() => {
      setEnableTransition(false);
      setIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnableTransition(true));
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [index]);

  const translateX = -index * STEP;

  return (
    <section
      ref={sectionRef}
      id="showcase"
      className="overflow-hidden bg-gradient-to-b from-[#6366f1]/10 via-[#6366f1]/5 to-[#6366f1]/10 py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div
          className={`text-center transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Pagzly로 만든 상세페이지
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            실제 셀러들이 사용한 결과물을 확인하세요
          </p>
        </div>
      </div>

      <div
        className={`relative mt-16 transition-all duration-700 delay-200 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#6366f1]/10 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#6366f1]/10 to-transparent" />

        <div className="overflow-hidden px-6">
          <div
            className={`flex w-max gap-6 ${enableTransition ? "transition-transform duration-500 ease-in-out" : ""}`}
            style={{ transform: `translateX(${translateX}px)` }}
          >
            {duplicated.map((item, i) => (
              <ShowcaseCard
                key={`${item.name}-${i}`}
                item={item}
                isVisible={isVisible}
                delay={Math.min(i, samples.length - 1) * 100}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
