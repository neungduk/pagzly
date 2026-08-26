"use client";

import { useMemo, useState } from "react";
import type { DetailSection } from "@/lib/types/generate";
import {
  buildInstagramFeedSlides,
  renderInstagramFeedPng,
  type InstagramFeedSlide,
} from "@/lib/instagram-feed";

type InstagramFeedPanelProps = {
  productName: string;
  brandName?: string | null;
  sections: DetailSection[];
  imageUrls: string[];
};

export default function InstagramFeedPanel({
  productName,
  brandName,
  sections,
  imageUrls,
}: InstagramFeedPanelProps) {
  const slides = useMemo(
    () =>
      buildInstagramFeedSlides({
        productName,
        brandName,
        sections,
        imageUrls,
      }),
    [productName, brandName, sections, imageUrls],
  );

  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadOne(slide: InstagramFeedSlide) {
    setBusyId(slide.id);
    setError(null);
    try {
      const dataUrl = await renderInstagramFeedPng(slide);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${productName}-인스타-${slide.id}.png`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "다운로드에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function downloadAll() {
    setError(null);
    for (const slide of slides) {
      setBusyId(slide.id);
      try {
        const dataUrl = await renderInstagramFeedPng(slide);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${productName}-인스타-${slide.id}.png`;
        a.click();
        await new Promise((r) => setTimeout(r, 280));
      } catch (err) {
        setError(err instanceof Error ? err.message : "다운로드에 실패했습니다.");
        break;
      }
    }
    setBusyId(null);
  }

  if (slides.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-ink px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
        data-testid="instagram-feed-toggle"
      >
        {open ? "인스타 피드 닫기" : "인스타 피드용 만들기 (1:1)"}
      </button>

      {open && (
        <div className="mt-4 space-y-4 rounded-2xl border-2 border-ink/15 bg-paper p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-registration-red">
                Instagram · 1080×1080
              </p>
              <p className="mt-1 text-sm text-ink/60">
                상세페이지 카피·사진으로 피드 카드 {slides.length}장을 만들었습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void downloadAll()}
              disabled={busyId !== null}
              className="inline-flex h-10 items-center justify-center bg-ink px-4 text-xs font-semibold text-paper disabled:opacity-50"
            >
              {busyId ? "저장 중…" : "전체 PNG 저장"}
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slides.map((slide) => (
              <li
                key={slide.id}
                className="overflow-hidden border border-line bg-white shadow-[4px_4px_0_0_#1B1B18]"
              >
                <div className="relative aspect-square bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.imageUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-80"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-3">
                    <p className="font-heading text-sm font-bold text-paper line-clamp-2">
                      {slide.title}
                    </p>
                    {slide.subtitle && (
                      <p className="mt-0.5 text-[11px] text-paper/65 line-clamp-1">
                        {slide.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="absolute left-2 top-2 bg-paper px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-ink">
                    {slide.kind}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void downloadOne(slide)}
                  disabled={busyId !== null}
                  className="flex h-10 w-full items-center justify-center border-t border-line text-xs font-semibold text-ink hover:bg-line/30 disabled:opacity-50"
                >
                  {busyId === slide.id ? "렌더 중…" : "PNG 저장"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
