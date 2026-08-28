"use client";

import { useCallback, useMemo, useState } from "react";
import type { DetailSection } from "@/lib/types/generate";
import {
  buildBlogPostDraft,
  downloadTextFile,
  exportBlogMarkdown,
  exportBlogPlainText,
  exportBlogTistoryHtml,
  mergeBlogPost,
  type BlogBlock,
  type BlogBlockOverride,
  type BlogPostDraft,
  type BlogPostGlobalOverride,
} from "@/lib/blog-post";

export type BlogPostPanelProps = {
  productName: string;
  brandName?: string | null;
  category: string;
  sections: DetailSection[];
  imageUrls: string[];
  description?: string;
  features?: string[];
  howToUse?: string;
  caution?: string;
  price?: number;
  variant?: "embedded" | "workspace";
  blockOverrides?: Record<string, BlogBlockOverride>;
  onBlockOverridesChange?: (next: Record<string, BlogBlockOverride>) => void;
  globalOverrides?: BlogPostGlobalOverride;
  onGlobalOverridesChange?: (next: BlogPostGlobalOverride) => void;
};

const KIND_LABEL: Record<BlogBlock["kind"], string> = {
  intro: "도입",
  heading: "소제목",
  paragraph: "본문",
  image: "이미지",
  bullet_list: "목록",
  faq: "FAQ",
  quote: "인용",
  cta: "구매 안내",
  notice: "주의",
};

function BlockPreview({ block }: { block: BlogBlock }) {
  switch (block.kind) {
    case "intro":
      return (
        <p className="text-base leading-[1.85] text-ink/80 sm:text-lg">{block.body}</p>
      );
    case "heading":
      return (
        <h2 className="font-heading text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">
          {block.heading}
        </h2>
      );
    case "paragraph":
      return (
        <div className="space-y-2">
          {block.heading ? (
            <h3 className="font-heading text-base font-semibold text-ink">{block.heading}</h3>
          ) : null}
          <p className="text-sm leading-[1.85] text-ink/75 sm:text-[0.9375rem]">{block.body}</p>
        </div>
      );
    case "image":
      return block.imageUrl ? (
        <figure className="overflow-hidden rounded-xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.imageUrl}
            alt={block.imageCaption ?? ""}
            className="aspect-[4/3] w-full object-cover"
          />
          {block.imageCaption ? (
            <figcaption className="px-3 py-2 text-center text-xs text-ink/50">
              {block.imageCaption}
            </figcaption>
          ) : null}
        </figure>
      ) : null;
    case "bullet_list":
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/78">
          {(block.listItems ?? []).map((item) => (
            <li key={item.slice(0, 24)}>{item}</li>
          ))}
        </ul>
      );
    case "faq":
      return (
        <div className="rounded-xl border border-line bg-line/10 px-4 py-3">
          <p className="text-sm font-semibold text-ink">
            <span className="text-slate-blue">Q.</span> {block.faqQuestion}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">
            <span className="font-medium text-ink/55">A.</span> {block.body}
          </p>
        </div>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 border-slate-blue/40 bg-line/15 px-4 py-3">
          {block.heading ? (
            <p className="font-heading text-sm font-bold text-ink">{block.heading}</p>
          ) : null}
          <p className="mt-1 text-sm leading-relaxed text-ink/75">{block.body}</p>
        </blockquote>
      );
    case "cta":
      return (
        <div className="rounded-xl border-2 border-ink px-5 py-4 text-center">
          <p className="font-heading text-2xl font-bold text-ink">{block.heading}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">{block.body}</p>
        </div>
      );
    case "notice":
      return (
        <p className="rounded-lg bg-mustard/10 px-3 py-2.5 text-sm leading-relaxed text-ink/80">
          {block.heading ? <strong className="text-ink">{block.heading}: </strong> : null}
          {block.body}
        </p>
      );
    default:
      return null;
  }
}

export default function BlogPostPanel({
  productName,
  brandName,
  category,
  sections,
  imageUrls,
  description,
  features,
  howToUse,
  caution,
  price,
  variant = "workspace",
  blockOverrides: controlledBlockOverrides,
  onBlockOverridesChange,
  globalOverrides: controlledGlobalOverrides,
  onGlobalOverridesChange,
}: BlogPostPanelProps) {
  const [internalBlockOverrides, setInternalBlockOverrides] = useState<
    Record<string, BlogBlockOverride>
  >({});
  const [internalGlobalOverrides, setInternalGlobalOverrides] = useState<BlogPostGlobalOverride>(
    {},
  );
  const [previewMode, setPreviewMode] = useState<"article" | "edit">("article");

  const blockOverrides = controlledBlockOverrides ?? internalBlockOverrides;
  const setBlockOverrides = useCallback(
    (next: Record<string, BlogBlockOverride>) => {
      if (onBlockOverridesChange) onBlockOverridesChange(next);
      else setInternalBlockOverrides(next);
    },
    [onBlockOverridesChange],
  );

  const globalOverrides = controlledGlobalOverrides ?? internalGlobalOverrides;
  const setGlobalOverrides = useCallback(
    (next: BlogPostGlobalOverride) => {
      if (onGlobalOverridesChange) onGlobalOverridesChange(next);
      else setInternalGlobalOverrides(next);
    },
    [onGlobalOverridesChange],
  );

  const baseDraft = useMemo(
    () =>
      buildBlogPostDraft({
        productName,
        brandName,
        category,
        sections,
        imageUrls,
        description,
        features,
        howToUse,
        caution,
        price,
      }),
    [
      productName,
      brandName,
      category,
      sections,
      imageUrls,
      description,
      features,
      howToUse,
      caution,
      price,
    ],
  );

  const draft = useMemo(
    () => mergeBlogPost(baseDraft, blockOverrides, globalOverrides, imageUrls),
    [baseDraft, blockOverrides, globalOverrides, imageUrls],
  );

  function patchBlock(id: string, patch: BlogBlockOverride) {
    setBlockOverrides({
      ...blockOverrides,
      [id]: { ...blockOverrides[id], ...patch },
    });
  }

  function resetAll() {
    setBlockOverrides({});
    setGlobalOverrides({});
  }

  function handleDownload(format: "html" | "md" | "txt") {
    const safeName = productName.replace(/[\\/:*?"<>|]/g, "-").slice(0, 40);
    if (format === "html") {
      downloadTextFile(`${safeName}-블로그-티스토리.html`, exportBlogTistoryHtml(draft), "text/html");
    } else if (format === "md") {
      downloadTextFile(`${safeName}-블로그.md`, exportBlogMarkdown(draft), "text/markdown");
    } else {
      downloadTextFile(`${safeName}-블로그.txt`, exportBlogPlainText(draft), "text/plain");
    }
  }

  if (draft.blocks.length === 0) {
    return (
      <p className="text-xs text-ink/50">
        블로그 글로 변환할 콘텐츠가 없습니다. 상세페이지 섹션을 먼저 생성해 주세요.
      </p>
    );
  }

  return (
    <div
      className={variant === "workspace" ? "space-y-5" : "space-y-4 rounded-2xl border-2 border-ink/15 bg-paper p-4"}
      data-testid="blog-post-panel"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-registration-red">
            Blog · Tistory / Markdown
          </p>
          <p className="mt-1 text-sm text-ink/60">
            상세페이지 카피·사진으로 블로그 초안 {draft.blocks.length}블록. 문단을 고친 뒤
            다운로드하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex h-10 items-center justify-center border border-line px-3 text-xs font-semibold text-ink hover:bg-line/30"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => handleDownload("html")}
            className="inline-flex h-10 items-center justify-center bg-ink px-3 text-xs font-semibold text-paper"
            data-testid="blog-download-html"
          >
            티스토리 HTML
          </button>
          <button
            type="button"
            onClick={() => handleDownload("md")}
            className="inline-flex h-10 items-center justify-center border border-ink px-3 text-xs font-semibold text-ink hover:bg-line/20"
            data-testid="blog-download-md"
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={() => handleDownload("txt")}
            className="inline-flex h-10 items-center justify-center border border-line px-3 text-xs font-semibold text-ink hover:bg-line/20"
          >
            TXT
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPreviewMode("article")}
          className={`h-9 rounded-lg px-3 text-xs font-semibold ${
            previewMode === "article" ? "bg-ink text-paper" : "border border-line text-ink/60"
          }`}
        >
          미리보기
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode("edit")}
          className={`h-9 rounded-lg px-3 text-xs font-semibold ${
            previewMode === "edit" ? "bg-ink text-paper" : "border border-line text-ink/60"
          }`}
        >
          문단 편집
        </button>
      </div>

      <div className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 sm:gap-5 sm:p-5">
        <label className="block text-[10px] font-medium text-ink/55 sm:col-span-2">
          글 제목
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setGlobalOverrides({ ...globalOverrides, title: e.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm font-semibold"
          />
        </label>
        <label className="block text-[10px] font-medium text-ink/55 sm:col-span-2">
          요약 (메타·도입용)
          <textarea
            value={draft.excerpt}
            onChange={(e) => setGlobalOverrides({ ...globalOverrides, excerpt: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-[10px] font-medium text-ink/55 sm:col-span-2">
          태그 (쉼표로 구분)
          <input
            type="text"
            value={draft.tags.join(", ")}
            onChange={(e) =>
              setGlobalOverrides({
                ...globalOverrides,
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm"
          />
        </label>
      </div>

      {previewMode === "article" ? (
        <article
          className="space-y-6 rounded-xl border border-ink/15 bg-paper px-5 py-8 sm:px-8"
          data-testid="blog-article-preview"
        >
          <header className="space-y-3 border-b border-line pb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/40">
              {category}
            </p>
            <h1 className="font-heading text-2xl font-bold leading-tight tracking-[-0.03em] text-ink sm:text-3xl">
              {draft.title}
            </h1>
            <p className="text-sm leading-relaxed text-ink/65">{draft.excerpt}</p>
            {draft.tags.length > 0 ? (
              <p className="text-xs text-ink/45">
                {draft.tags.map((t) => `#${t}`).join(" ")}
              </p>
            ) : null}
          </header>
          {draft.blocks.map((block) => (
            <div key={block.id}>
              <BlockPreview block={block} />
            </div>
          ))}
        </article>
      ) : (
        <ul className="space-y-3" data-testid="blog-block-editor">
          {draft.blocks.map((block) => (
            <li
              key={block.id}
              className="rounded-xl border border-line bg-white p-4 shadow-[3px_3px_0_0_#1B1B18]/10"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink/45">
                  {KIND_LABEL[block.kind]}
                </span>
                <label className="flex items-center gap-1.5 text-[10px] text-ink/50">
                  <input
                    type="checkbox"
                    checked={blockOverrides[block.id]?.hidden === true}
                    onChange={(e) => patchBlock(block.id, { hidden: e.target.checked })}
                  />
                  숨기기
                </label>
              </div>

              {(block.kind === "heading" ||
                block.kind === "paragraph" ||
                block.kind === "quote" ||
                block.kind === "notice" ||
                block.kind === "cta") &&
              (block.heading != null || block.kind !== "paragraph") ? (
                <label className="mb-2 block text-[10px] font-medium text-ink/55">
                  소제목
                  <input
                    type="text"
                    value={block.heading ?? ""}
                    onChange={(e) => patchBlock(block.id, { heading: e.target.value })}
                    className="mt-0.5 h-8 w-full rounded border border-line px-2 text-xs"
                  />
                </label>
              ) : null}

              {block.kind === "faq" ? (
                <label className="mb-2 block text-[10px] font-medium text-ink/55">
                  질문
                  <input
                    type="text"
                    value={block.faqQuestion ?? ""}
                    onChange={(e) => patchBlock(block.id, { faqQuestion: e.target.value })}
                    className="mt-0.5 h-8 w-full rounded border border-line px-2 text-xs"
                  />
                </label>
              ) : null}

              {block.kind !== "image" && block.kind !== "bullet_list" ? (
                <label className="block text-[10px] font-medium text-ink/55">
                  본문
                  <textarea
                    value={block.body}
                    onChange={(e) => patchBlock(block.id, { body: e.target.value })}
                    rows={block.kind === "intro" ? 4 : 3}
                    className="mt-0.5 w-full rounded border border-line px-2 py-1.5 text-xs leading-relaxed"
                  />
                </label>
              ) : null}

              {block.kind === "bullet_list" ? (
                <label className="block text-[10px] font-medium text-ink/55">
                  목록 (한 줄에 한 항목)
                  <textarea
                    value={(block.listItems ?? []).join("\n")}
                    onChange={(e) =>
                      patchBlock(block.id, {
                        body: "",
                        listItems: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                    rows={4}
                    className="mt-0.5 w-full rounded border border-line px-2 py-1.5 text-xs leading-relaxed"
                  />
                </label>
              ) : null}

              {block.kind === "image" ? (
                <>
                  <label className="mb-2 block text-[10px] font-medium text-ink/55">
                    사진
                    <select
                      className="mt-0.5 h-8 w-full rounded border border-line px-2 text-xs"
                      value={
                        blockOverrides[block.id]?.imageIndex ??
                        imageUrls.findIndex((u) => u === block.imageUrl)
                      }
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        patchBlock(block.id, { imageIndex: idx, imageUrl: undefined });
                      }}
                    >
                      {imageUrls.map((_, i) => (
                        <option key={i} value={i}>
                          사진 {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[10px] font-medium text-ink/55">
                    캡션
                    <input
                      type="text"
                      value={block.imageCaption ?? ""}
                      onChange={(e) => patchBlock(block.id, { imageCaption: e.target.value })}
                      className="mt-0.5 h-8 w-full rounded border border-line px-2 text-xs"
                    />
                  </label>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-relaxed text-ink/45">
        티스토리: HTML 파일을 열어 본문을 복사한 뒤 글쓰기 → HTML 모드에 붙여넣으세요. 이미지는
        외부 URL이 차단될 수 있어 티스토리에 직접 업로드하는 것을 권장합니다.
      </p>
    </div>
  );
}
