"use client";

import CropMarks from "@/components/CropMarks";
import RevealOnScroll from "@/components/RevealOnScroll";
import { getCategoryTheme } from "@/lib/category-theme";

const SHOWCASE_CATEGORIES = [
  { key: "화장품/뷰티", label: "화장품", description: "슬레이트 블루 · 클린 스튜디오 톤" },
  { key: "의류/패션", label: "패션", description: "잉크 · 에디토리얼 무드" },
  { key: "식품/건강기능식품", label: "식품", description: "머스타드 · 따뜻한 식품 톤" },
  { key: "전자제품", label: "전자제품", description: "딥 슬레이트 · 테크 스튜디오" },
  { key: "생활용품", label: "생활용품", description: "소프트 슬레이트 · 홈 라이프" },
] as const;

function ColorSwatch({
  color,
  label,
  size = "md",
}: {
  color: string;
  label: string;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-14 w-14 sm:h-16 sm:w-16" : "h-10 w-10";
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={`${sizeClass} rounded-full shadow-[0_4px_14px_rgba(27,27,24,0.12)] ring-2 ring-paper`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink/45">{label}</span>
    </div>
  );
}

export default function CategoryColorEngine() {
  return (
    <section id="color-engine" className="border-b border-line bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-registration-red">
            Color Engine
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            카테고리 컬러 엔진
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink/60">
            상품 사진에서 추출한 색과 카테고리 테마를 조합해, 상품마다 다른 상세페이지 팔레트를
            자동으로 만듭니다.
          </p>
        </div>

        <RevealOnScroll
          stagger
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {SHOWCASE_CATEGORIES.map(({ key, label, description }) => {
            const palette = getCategoryTheme(key);
            return (
              <div
                key={key}
                className="relative flex flex-col overflow-hidden border border-line bg-paper"
              >
                <CropMarks />
                <div
                  className="border-b border-line px-4 py-3"
                  style={{ backgroundColor: palette.accentSoft }}
                >
                  <p
                    className="font-heading text-sm font-bold"
                    style={{ color: palette.deepAccent }}
                  >
                    {label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink/55">{description}</p>
                </div>
                <div className="flex flex-1 items-center justify-center gap-4 px-4 py-6">
                  <ColorSwatch color={palette.accent} label="Accent" />
                  <ColorSwatch color={palette.baseNeutral} label="Base" />
                  <ColorSwatch color={palette.deepAccent} label="Deep" />
                </div>
              </div>
            );
          })}
        </RevealOnScroll>
      </div>
    </section>
  );
}
