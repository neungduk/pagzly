"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import CropMarks from "@/components/CropMarks";
import { getCategoryTheme } from "@/lib/category-theme";

const samples = [
  {
    name: "히알루론 수분 크림",
    categoryKey: "화장품/뷰티",
    category: "화장품",
    thumb: "/showcase/cosmetics-thumb.png",
    full: "/showcase/cosmetics-full.png",
  },
  {
    name: "린넨 오버핏 셔츠",
    categoryKey: "의류/패션",
    category: "패션",
    thumb: "/showcase/fashion-thumb.png",
    full: "/showcase/fashion-full.png",
  },
  {
    name: "단백질 쉐이크 바닐라",
    categoryKey: "식품/건강기능식품",
    category: "식품",
    thumb: "/showcase/food-thumb.png",
    full: "/showcase/food-full.png",
  },
  {
    name: "노이즈캔슬링 무선 이어폰",
    categoryKey: "전자제품",
    category: "전자제품",
    thumb: "/showcase/electronics-thumb.png",
    full: "/showcase/electronics-full.png",
  },
  {
    name: "USB 캠핑 랜턴",
    categoryKey: "생활용품",
    category: "생활용품",
    thumb: "/showcase/lifestyle-thumb.png",
    full: "/showcase/lifestyle-full.png",
  },
] as const;

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
            Pexels 상품 사진으로 실제 생성한 예시입니다. 클릭하면 크게 볼 수
            있어요.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {samples.map((item, index) => {
            const palette = getCategoryTheme(item.categoryKey);
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setSelected(index)}
                className="group relative aspect-[3/4] overflow-hidden border-2 bg-ink p-0 text-left transition-transform hover:-translate-y-1"
                style={{ borderColor: palette.accent }}
              >
                <Image
                  src={item.thumb}
                  alt={`${item.name} 상세페이지 예시`}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
                <span
                  className="absolute left-2 top-2 z-10 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-paper"
                  style={{ backgroundColor: palette.deepAccent }}
                >
                  예시
                </span>
                <span
                  className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: palette.accentSoft,
                    color: palette.deepAccent,
                  }}
                >
                  {item.category}
                </span>
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-ink/85 px-3 py-2.5 backdrop-blur-sm">
                  <div className="flex items-center gap-1">
                    {[palette.accent, palette.baseNeutral, palette.deepAccent].map((c, i) => (
                      <span
                        key={`${item.name}-swatch-${i}`}
                        className="h-2.5 w-2.5 rounded-full ring-1 ring-paper/40"
                        style={{ backgroundColor: c }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-paper">
                    {item.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 sm:p-6"
          onClick={() => setSelected(null)}
        >
          {(() => {
            const item = samples[selected];
            const palette = getCategoryTheme(item.categoryKey);
            return (
              <div
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col border-2 bg-paper"
                style={{ borderColor: palette.accent }}
                onClick={(e) => e.stopPropagation()}
              >
                <CropMarks color="text-ink/20" />
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="닫기"
                  className="absolute right-3 top-3 z-10 font-mono text-sm text-ink/50 transition-colors hover:text-ink"
                >
                  CLOSE ✕
                </button>
                <div className="relative max-h-[calc(92vh-4rem)] overflow-y-auto">
                  <Image
                    src={item.full}
                    alt={`${item.name} 상세페이지 전체 예시`}
                    width={750}
                    height={4000}
                    className="h-auto w-full"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-between border-t border-line px-4 py-3">
                  <div>
                    <p
                      className="font-mono text-xs uppercase tracking-wider"
                      style={{ color: palette.accent }}
                    >
                      {item.category} · 예시
                    </p>
                    <h3 className="mt-0.5 font-heading text-lg font-bold text-ink">
                      {item.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[palette.accent, palette.baseNeutral, palette.deepAccent].map((c, i) => (
                      <span
                        key={`modal-swatch-${i}`}
                        className="h-4 w-4 rounded-full ring-1 ring-line"
                        style={{ backgroundColor: c }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}
