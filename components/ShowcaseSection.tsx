"use client";

import { useEffect, useState } from "react";
import CropMarks from "@/components/CropMarks";

const samples = [
  {
    name: "스킨케어 크림",
    category: "화장품",
    emoji: "🧴",
    conversion: "+32%",
    bg: "from-rose-500/20 to-rose-900/40",
  },
  {
    name: "무선 이어폰",
    category: "전자제품",
    emoji: "🎧",
    conversion: "+28%",
    bg: "from-slate-500/20 to-slate-900/40",
  },
  {
    name: "린넨 셔츠",
    category: "의류",
    emoji: "👔",
    conversion: "+41%",
    bg: "from-amber-500/20 to-amber-900/40",
  },
  {
    name: "프로틴 쉐이크",
    category: "식품",
    emoji: "🥤",
    conversion: "+35%",
    bg: "from-emerald-500/20 to-emerald-900/40",
  },
  {
    name: "반려동물 간식",
    category: "펫",
    emoji: "🐾",
    conversion: "+29%",
    bg: "from-orange-500/20 to-orange-900/40",
  },
  {
    name: "캠핑 랜턴",
    category: "생활용품",
    emoji: "🏮",
    conversion: "+24%",
    bg: "from-yellow-500/20 to-yellow-900/40",
  },
];

export default function ShowcaseSection() {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (selected === null) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected]);

  return (
    <section id="showcase" className="bg-ink py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-paper/40">
            Gallery
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Pagzly로 만든 상세페이지
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-paper/60">
            실제 셀러들이 사용한 결과물을 확인하세요. 클릭하면 크게 볼 수
            있어요.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-5 sm:grid-cols-3">
          {samples.map((item, index) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setSelected(index)}
              className="group relative aspect-[3/4] overflow-hidden border border-paper/10 bg-gradient-to-br p-0 text-left transition-transform hover:-translate-y-1"
            >
              <div
                className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br ${item.bg}`}
              >
                <span className="text-5xl sm:text-6xl" role="img" aria-label={item.name}>
                  {item.emoji}
                </span>
                <span className="font-mono text-xs text-paper/70">
                  {item.category}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/80 px-3 py-2.5 backdrop-blur-sm">
                <span className="text-sm font-medium text-paper">
                  {item.name}
                </span>
                <span className="rounded-none border border-mustard/40 px-1.5 py-0.5 font-mono text-xs text-mustard">
                  {item.conversion}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-lg border border-paper/15 bg-ink p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <CropMarks color="text-paper/30" />
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="닫기"
              className="absolute right-4 top-4 font-mono text-sm text-paper/50 transition-colors hover:text-paper"
            >
              CLOSE ✕
            </button>
            <div
              className={`flex aspect-square w-full items-center justify-center bg-gradient-to-br ${samples[selected].bg}`}
            >
              <span className="text-8xl" role="img" aria-label={samples[selected].name}>
                {samples[selected].emoji}
              </span>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-paper/40">
                  {samples[selected].category}
                </p>
                <h3 className="mt-1 font-heading text-xl font-bold text-paper">
                  {samples[selected].name}
                </h3>
              </div>
              <span className="border border-mustard/40 px-2 py-1 font-mono text-sm text-mustard">
                전환율 {samples[selected].conversion}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
