"use client";

import { useEffect, useState } from "react";
import {
  resolveImageOriginIndex,
  useSellerImageMeta,
} from "@/components/SellerImageMetaContext";
import { HERO_V2_TUNED } from "@/lib/hero-spec";

type SectionImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  /** 명시 인덱스(없으면 URL로 origins 조회) */
  imageIndex?: number;
  /** true 강제 표시 / false 강제 숨김 / 미지정 시 context */
  showAiLifestyleBadge?: boolean;
  /** 191차 — true면 즉시 로드(히어로 전용). 기본 false = lazy. */
  priority?: boolean;
};

export default function SectionImage({
  src,
  alt,
  className,
  fallbackSrc,
  imageIndex,
  showAiLifestyleBadge,
  priority = false,
}: SectionImageProps) {
  const [current, setCurrent] = useState(src);
  // 438차 — 대체 사진까지 실패하면 이미지를 숨겨 깨진 아이콘·alt 텍스트가 화면에 보이지 않게(컨테이너 색 면만 남김)
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const meta = useSellerImageMeta();

  useEffect(() => {
    setCurrent(src);
  }, [src]);

  const resolved = current || fallbackSrc || "";
  const failed = failedSrc !== null && failedSrc === resolved;
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
      style={failed ? { visibility: "hidden" } : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
      crossOrigin={
        resolved.startsWith("data:") || resolved.startsWith("blob:") ? undefined : "anonymous"
      }
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) {
          setCurrent(fallbackSrc);
        } else if (HERO_V2_TUNED) {
          setFailedSrc(resolved);
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
