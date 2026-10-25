"use client";

import { useState } from "react";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ColorVariationSection } from "@/lib/types/generate";
import { DESIGN_V4_ENABLED, hideImgOnError } from "@/lib/design-v4";
import { CHIP_V4 } from "@/lib/design-tokens-v4";

/** 448차 — v4는 섹션 제목을 h2로(제목 단계 건너뜀 방지) */
const TitleTag = (DESIGN_V4_ENABLED ? "h2" : "h3") as "h2";

type Props = {
  section: ColorVariationSection;
  index: number;
  imageUrls: string[];
  theme: CategoryTheme;
  ratioClass: string;
  padClass: string;
  textSectionStyle: React.CSSProperties;
  accentHairline: React.ReactNode;
  titleClassName: string;
  titleStyle?: React.CSSProperties;
  titleContent?: React.ReactNode;
};

function resolveImage(imageUrls: string[], imageIndex: number): string {
  if (
    Number.isInteger(imageIndex) &&
    imageIndex >= 0 &&
    imageIndex < imageUrls.length
  ) {
    return imageUrls[imageIndex] ?? "";
  }
  // 잘못된 index를 [0]으로 몰아넣으면 전 옵션이 같은 사진처럼 보임
  return "";
}

export default function ColorVariationInteractive({
  section,
  index,
  imageUrls,
  theme,
  ratioClass,
  padClass,
  textSectionStyle,
  accentHairline,
  titleClassName,
  titleStyle,
  titleContent,
}: Props) {
  const [active, setActive] = useState(0);
  const activeOption = section.options[active] ?? section.options[0];

  return (
    <section
      key={`color_variation-${index}`}
      className={padClass}
      style={textSectionStyle}
    >
      {accentHairline}
      <TitleTag className={titleClassName} style={titleStyle}>
        {titleContent ?? section.heading}
      </TitleTag>

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        {section.options.map((option, optIndex) => (
          <button
            key={`${optIndex}-${option.label}`}
            type="button"
            onClick={() => setActive(optIndex)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              active === optIndex
                ? "border-ink/40 bg-ink/5 font-medium text-ink"
                : "border-line text-ink/70 hover:border-ink/25"
            }`}
            style={DESIGN_V4_ENABLED ? { borderColor: active === optIndex ? CHIP_V4.selectedBorder : CHIP_V4.controlBorder } : undefined}
            aria-pressed={active === optIndex}
          >
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{
                backgroundColor: option.colorHex,
                boxShadow: `0 0 0 1px ${theme.accent}33`,
              }}
              aria-hidden="true"
            />
            {option.label}
          </button>
        ))}
      </div>

      {activeOption && (
        <div className="mx-auto mt-8 max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* 450차 — v4: 사진이 없으면 빈 src 이미지를 그리지 않는다(export와 같이 생략) */}
          {DESIGN_V4_ENABLED && !resolveImage(imageUrls, activeOption.imageIndex) ? null : (
            <img onError={hideImgOnError}
              src={resolveImage(imageUrls, activeOption.imageIndex)}
              alt={activeOption.label}
              className={`${ratioClass} w-full object-cover`}
            />
          )}
        </div>
      )}
    </section>
  );
}
