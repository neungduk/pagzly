"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DetailSection } from "@/lib/types/generate";
import {
  buildInstagramFeedSlides,
  mergeFeedSlides,
  renderInstagramFeedPng,
  type InstagramFeedSlide,
  type InstagramSlideOverride,
} from "@/lib/instagram-feed";

export type InstagramFeedPanelProps = {
  productName: string;
  brandName?: string | null;
  sections: DetailSection[];
  imageUrls: string[];
  imagePaths?: string[];
  /** action bar 탭 안에 넣을 때 */
  variant?: "collapse" | "embedded" | "workspace";
  overrides?: Record<string, InstagramSlideOverride>;
  onOverridesChange?: (next: Record<string, InstagramSlideOverride>) => void;
};

function SlidePreview({ slide }: { slide: InstagramFeedSlide }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setError(null);
    renderInstagramFeedPng(slide)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "렌더 실패");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slide]);

  if (error) {
    return (
      <div className="flex aspect-square items-center justify-center bg-ink/5 p-3 text-center text-[11px] text-red-600">
        {error}
      </div>
    );
  }
  if (!src) {
    return (
      <div className="flex aspect-square items-center justify-center bg-ink/5 text-xs text-ink/40">
        렌더 중…
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="aspect-square w-full object-cover" />
  );
}

export default function InstagramFeedPanel({
  productName,
  brandName,
  sections,
  imageUrls,
  imagePaths,
  variant = "collapse",
  overrides: controlledOverrides,
  onOverridesChange,
}: InstagramFeedPanelProps) {
  const [open, setOpen] = useState(variant !== "collapse");
  const [internalOverrides, setInternalOverrides] = useState<
    Record<string, InstagramSlideOverride>
  >({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const overrides = controlledOverrides ?? internalOverrides;
  const setOverrides = useCallback(
    (next: Record<string, InstagramSlideOverride>) => {
      if (onOverridesChange) onOverridesChange(next);
      else setInternalOverrides(next);
    },
    [onOverridesChange],
  );

  const baseSlides = useMemo(
    () =>
      buildInstagramFeedSlides({
        productName,
        brandName,
        sections,
        imageUrls,
        imagePaths,
      }),
    [productName, brandName, sections, imageUrls, imagePaths],
  );

  const slides = useMemo(
    () => mergeFeedSlides(baseSlides, overrides, imageUrls),
    [baseSlides, overrides, imageUrls],
  );

  function patchOverride(id: string, patch: InstagramSlideOverride) {
    setOverrides({
      ...overrides,
      [id]: { ...overrides[id], ...patch },
    });
  }

  function resetOverrides() {
    setOverrides({});
  }

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

  function handleUpload(file: File | undefined) {
    if (!file || !uploadTargetId) return;
    const url = URL.createObjectURL(file);
    patchOverride(uploadTargetId, { imageUrl: url });
    setUploadTargetId(null);
  }

  if (slides.length === 0) {
    return (
      <p className="text-xs text-ink/50">
        상품 사진이 없어 인스타 피드를 만들 수 없습니다. 원클릭 업로드로 사진을 추가하세요.
      </p>
    );
  }

  const panelBody = (
    <div
      className={
        variant === "workspace"
          ? "space-y-5"
          : "space-y-4 rounded-2xl border-2 border-ink/15 bg-paper p-4 sm:p-5"
      }
      data-testid="instagram-feed-panel"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-registration-red">
            Instagram · 1080×1080
          </p>
          <p className="mt-1 text-sm text-ink/60">
            상세 카피·사진으로 피드 {slides.length}장. 문구·사진을 바꾼 뒤 PNG로 저장하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetOverrides}
            className="inline-flex h-10 items-center justify-center border border-line px-3 text-xs font-semibold text-ink hover:bg-line/30"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => void downloadAll()}
            disabled={busyId !== null}
            className="inline-flex h-10 items-center justify-center bg-ink px-4 text-xs font-semibold text-paper disabled:opacity-50"
            data-testid="instagram-download-all"
          >
            {busyId ? "저장 중…" : "전체 PNG 저장"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      <input
        ref={uploadRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handleUpload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <ul
        className={
          variant === "workspace"
            ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
            : "grid gap-3 sm:grid-cols-2"
        }
      >
        {slides.map((slide) => (
          <li
            key={slide.id}
            className="overflow-hidden border border-line bg-white shadow-[4px_4px_0_0_#1B1B18]"
          >
            <SlidePreview slide={slide} />
            <div className="space-y-2 border-t border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] font-semibold uppercase text-ink/45">
                  {slide.kind}
                </span>
                <button
                  type="button"
                  onClick={() => void downloadOne(slide)}
                  disabled={busyId !== null}
                  className="text-[11px] font-semibold text-registration-red hover:underline disabled:opacity-50"
                >
                  {busyId === slide.id ? "저장 중…" : "PNG"}
                </button>
              </div>
              <label className="block text-[10px] font-medium text-ink/55">
                제목
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => patchOverride(slide.id, { title: e.target.value })}
                  className="mt-0.5 h-8 w-full rounded border border-line px-2 text-xs"
                />
              </label>
              <label className="block text-[10px] font-medium text-ink/55">
                보조 문구
                <input
                  type="text"
                  value={slide.subtitle ?? ""}
                  onChange={(e) => patchOverride(slide.id, { subtitle: e.target.value })}
                  className="mt-0.5 h-8 w-full rounded border border-line px-2 text-xs"
                />
              </label>
              <label className="block text-[10px] font-medium text-ink/55">
                배경 사진
                <select
                  className="mt-0.5 h-8 w-full rounded border border-line px-2 text-xs"
                  value={
                    overrides[slide.id]?.imageIndex ??
                    imageUrls.findIndex((u) => u === slide.imageUrl)
                  }
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    patchOverride(slide.id, {
                      imageIndex: idx,
                      imageUrl: undefined,
                    });
                  }}
                >
                  {imageUrls.map((_, i) => (
                    <option key={i} value={i}>
                      사진 {i + 1}
                      {imagePaths?.[i]?.includes("lifestyle-ai") ? " · 일상샷" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="h-8 w-full border border-line text-[11px] font-semibold text-ink hover:bg-line/30"
                onClick={() => {
                  setUploadTargetId(slide.id);
                  uploadRef.current?.click();
                }}
              >
                이 슬라이드만 사진 업로드
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  if (variant === "embedded") {
    return panelBody;
  }

  if (variant === "workspace") {
    return panelBody;
  }

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
      {open && <div className="mt-4">{panelBody}</div>}
    </div>
  );
}
