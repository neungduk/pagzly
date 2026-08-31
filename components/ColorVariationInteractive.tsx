"use client";

import { useState } from "react";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ColorVariationSection } from "@/lib/types/generate";

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
};

function resolveImage(imageUrls: string[], imageIndex: number): string {
  return imageUrls[imageIndex] ?? imageUrls[0] ?? "";
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
      <h3 className={titleClassName}>{section.heading}</h3>

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        {section.options.map((option, optIndex) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setActive(optIndex)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              active === optIndex
                ? "border-ink/40 bg-ink/5 font-medium text-ink"
                : "border-line text-ink/70 hover:border-ink/25"
            }`}
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
          <img
            src={resolveImage(imageUrls, activeOption.imageIndex)}
            alt={activeOption.label}
            className={`${ratioClass} w-full object-cover`}
          />
        </div>
      )}
    </section>
  );
}
