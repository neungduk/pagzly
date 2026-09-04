"use client";

import { useEffect, useState } from "react";
import {
  resolveImageOriginIndex,
  useSellerImageMeta,
} from "@/components/SellerImageMetaContext";

type SectionImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  /** 명시 인덱스(없으면 URL로 origins 조회) */
  imageIndex?: number;
  /** true 강제 표시 / false 강제 숨김 / 미지정 시 context */
  showAiLifestyleBadge?: boolean;
};

export default function SectionImage({
  src,
  alt,
  className,
  fallbackSrc,
  imageIndex,
  showAiLifestyleBadge,
}: SectionImageProps) {
  const [current, setCurrent] = useState(src);
  const meta = useSellerImageMeta();

  useEffect(() => {
    setCurrent(src);
  }, [src]);

  const resolved = current || fallbackSrc || "";
  if (!resolved) return null;

  const idx = resolveImageOriginIndex(resolved, meta.urls, imageIndex);
  const fromOrigin =
    meta.showBadges &&
    typeof idx === "number" &&
    meta.origins[idx] === "ai-lifestyle";

  const showBadge =
    showAiLifestyleBadge === true || (showAiLifestyleBadge !== false && fromOrigin);

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      className={className}
      crossOrigin={
        resolved.startsWith("data:") || resolved.startsWith("blob:") ? undefined : "anonymous"
      }
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) {
          setCurrent(fallbackSrc);
        }
      }}
    />
  );

  if (!showBadge) return img;

  return (
    <>
      {img}
      <span
        data-seller-only-badge="1"
        className="pointer-events-none absolute left-2 top-2 z-[5] rounded bg-ink/75 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-paper"
        aria-label="AI 연출 배경·인물"
      >
        AI 연출 배경·인물
      </span>
    </>
  );
}
