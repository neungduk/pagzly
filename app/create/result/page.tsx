"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import DetailSectionRenderer from "@/components/DetailSectionRenderer";
import { freezeScrollRevealAnimations, unfreezeScrollRevealAnimations } from "@/components/DetailScrollReveal";
import DetailActionBar, { type DetailToolTab } from "@/components/DetailActionBar";
import InstagramFeedPanel from "@/components/InstagramFeedPanel";
import ToastBanner from "@/components/ToastBanner";
import { DRAFT_SESSION_KEY, SESSION_KEY } from "@/components/CreateProductForm";
import type { CustomGifSection, DetailSection, GenerateResponse } from "@/lib/types/generate";
import { getCategoryTheme } from "@/lib/category-theme";
import { buildDetailPageHtml } from "@/lib/export-detail-html";
import { validateImageFile } from "@/lib/image-upload";
import { createClient } from "@/lib/supabase";

const MAX_GIF_BYTES = 8 * 1024 * 1024;

function insertOrReplaceCustomGif(sections: DetailSection[], gifUrl: string): DetailSection[] {
  const without = sections.filter((s) => s.slot !== "custom_gif" && s.type !== "custom_gif");
  const heroIdx = without.findIndex((s) => s.type === "hero");
  const insertAt = heroIdx >= 0 ? heroIdx + 1 : 0;
  const gifSection: CustomGifSection = {
    type: "custom_gif",
    slot: "custom_gif",
    gifUrl,
  };
  return [...without.slice(0, insertAt), gifSection, ...without.slice(insertAt)];
}

function remapHiddenAfterReorder(hidden: number[], from: number, to: number): number[] {
  return hidden.map((i) => {
    if (i === from) return to;
    if (from < to && i > from && i <= to) return i - 1;
    if (from > to && i >= to && i < from) return i + 1;
    return i;
  });
}

type ProductResult = {
  category: string;
  imageUrls: string[];
  productName: string;
  brandName: string | null;
  price: number;
  targetCustomer: string | null;
  keyFeatures: string | null;
  ingredients: string | null;
  certifications: string | null;
  competitorUrl: string | null;
  wholesaleUrl: string | null;
  createdAt: string;
  testMode?: boolean;
  generated?: GenerateResponse;
};

type ProductRow = {
  id: string;
  category: string;
  product_name: string;
  brand_name: string | null;
  price: number | string;
  target_customer: string | null;
  key_features: string | null;
  ingredients: string | null;
  certifications: string | null;
  competitor_url: string | null;
  wholesale_url: string | null;
  image_urls: string[] | null;
  headlines: string[] | null;
  description: string | null;
  features: string[] | null;
  how_to_use: string | null;
  caution: string | null;
  mfds_reviewed: boolean | null;
  replacements: GenerateResponse["replacements"];
  sections: DetailSection[] | null;
  created_at: string;
};

function mapProductRow(row: ProductRow): ProductResult {
  const generated: GenerateResponse = {
    sections: row.sections ?? [],
    headlines: row.headlines ?? [],
    description: row.description ?? "",
    features: row.features ?? [],
    howToUse: row.how_to_use ?? "",
    caution: row.caution ?? "",
    imageAnalysis: "",
    productId: row.id,
    mfdsReviewed: row.mfds_reviewed ?? false,
    replacements: row.replacements ?? [],
    imageUrls: row.image_urls ?? [],
  };

  return {
    category: row.category,
    imageUrls: row.image_urls ?? [],
    productName: row.product_name,
    brandName: row.brand_name,
    price: Number(row.price),
    targetCustomer: row.target_customer,
    keyFeatures: row.key_features,
    ingredients: row.ingredients,
    certifications: row.certifications,
    competitorUrl: row.competitor_url,
    wholesaleUrl: row.wholesale_url,
    createdAt: row.created_at,
    generated,
  };
}

function CreateResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const captureRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<ProductResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingHtml, setDownloadingHtml] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toolTab, setToolTab] = useState<DetailToolTab>("edit");
  const [replaceImageIndex, setReplaceImageIndex] = useState(0);
  const [toast, setToast] = useState<{ message: string; tone: "error" | "info" | "ok" } | null>(
    null,
  );
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [downloadPlatform, setDownloadPlatform] = useState<"smartstore" | "coupang">(
    "smartstore",
  );
  const [hiddenIndexes, setHiddenIndexes] = useState<number[]>([]);
  const [patchIndex, setPatchIndex] = useState(0);
  const [patchInstruction, setPatchInstruction] = useState("");
  const [patchLoading, setPatchLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const id = searchParams.get("id");
      const raw = sessionStorage.getItem(SESSION_KEY);
      const draftRaw = sessionStorage.getItem(DRAFT_SESSION_KEY);

      // 미승인 draft 세션이면 draft로 되돌림
      if (!id && raw) {
        try {
          const parsed = JSON.parse(raw) as ProductResult & { draftApproved?: boolean };
          if (parsed.draftApproved === false) {
            router.replace("/create/draft");
            return;
          }
        } catch {
          /* fall through */
        }
      }
      if (!id && draftRaw && !raw) {
        router.replace("/create/draft");
        return;
      }

      if (id) {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as ProductResult;
            if (parsed.generated?.productId === id) {
              if (!cancelled) {
                setData(parsed);
                setAiText(parsed.wholesaleUrl ?? "");
              }
              return;
            }
          } catch {
            sessionStorage.removeItem(SESSION_KEY);
          }
        }

        const supabase = createClient();
        const { data: row, error } = await supabase
          .from("products")
          .select(
            "id, category, product_name, brand_name, price, target_customer, key_features, ingredients, certifications, competitor_url, wholesale_url, image_urls, headlines, description, features, how_to_use, caution, mfds_reviewed, replacements, sections, created_at",
          )
          .eq("id", id)
          .single();

        if (cancelled) return;

        if (error || !row) {
          console.warn("[create/result] DB load failed", error);
          if (draftRaw) {
            router.replace("/create/draft");
          } else {
            router.replace("/create");
          }
          return;
        }

        const mapped = mapProductRow(row as ProductRow);
        setData(mapped);
        setAiText(mapped.wholesaleUrl ?? "");
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(mapped));
        return;
      }

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ProductResult;
          if (!cancelled) {
            setData(parsed);
            setAiText(parsed.wholesaleUrl ?? "");
          }
          return;
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }

      router.replace("/create");
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  function persist(next: ProductResult) {
    setData(next);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  }

  function handleSectionChange(index: number, section: DetailSection) {
    if (!data?.generated) return;
    const sections = data.generated.sections.map((item, i) => (i === index ? section : item));
    persist({ ...data, generated: { ...data.generated, sections } });
  }

  function handleReorder(from: number, to: number) {
    if (!data?.generated || from === to) return;
    const sections = [...data.generated.sections];
    const [moved] = sections.splice(from, 1);
    if (!moved) return;
    sections.splice(to, 0, moved);
    setHiddenIndexes((prev) => remapHiddenAfterReorder(prev, from, to));
    setPatchIndex((prev) => {
      if (prev === from) return to;
      if (from < to && prev > from && prev <= to) return prev - 1;
      if (from > to && prev >= to && prev < from) return prev + 1;
      return prev;
    });
    persist({ ...data, generated: { ...data.generated, sections } });
  }

  function handleToggleHidden(index: number) {
    setHiddenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }

  async function handlePatchSection() {
    if (!data?.generated) return;
    const instruction = patchInstruction.trim();
    if (!instruction) return;
    const section = data.generated.sections[patchIndex];
    if (!section) return;
    setPatchLoading(true);
    try {
      const response = await fetch("/api/patch-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          instruction,
          category: data.category,
          productName: data.productName,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "섹션 수정에 실패했습니다.");
      }
      const patched = result.section as DetailSection;
      const sections = data.generated.sections.map((item, i) =>
        i === patchIndex ? patched : item,
      );
      persist({ ...data, generated: { ...data.generated, sections } });
      setPatchInstruction("");
      setToast({ tone: "ok", message: "섹션이 AI로 수정됐습니다. 저장을 눌러 유지하세요." });
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "섹션 수정에 실패했습니다.",
      });
    } finally {
      setPatchLoading(false);
    }
  }

  async function handleGifSelected(file: File | undefined) {
    if (!file || !data?.generated) return;
    if (file.type !== "image/gif") {
      setToast({ tone: "error", message: "GIF 파일(.gif)만 업로드할 수 있습니다." });
      return;
    }
    if (file.size > MAX_GIF_BYTES) {
      setToast({ tone: "error", message: "GIF는 8MB 이하여야 합니다." });
      return;
    }

    let gifUrl = URL.createObjectURL(file);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.gif`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(path, file, { contentType: "image/gif", upsert: false });
        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("images").getPublicUrl(path);
          gifUrl = publicData.publicUrl;
        }
      }
    } catch (err) {
      console.warn("[gif-upload] storage skip", err);
    }

    const sections = insertOrReplaceCustomGif(data.generated.sections, gifUrl);
    persist({ ...data, generated: { ...data.generated, sections } });
    setToast({ tone: "ok", message: "GIF 섹션을 hero 바로 아래에 넣었습니다. 저장을 눌러 유지하세요." });
  }

  function handleTabChange(next: DetailToolTab) {
    setToolTab(next);
    if (next === "edit") setEditMode(true);
  }

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      // 세션 캐시(새로고침 없이 즉시 반영)는 항상 갱신 — DB 저장 성공 여부와 무관.
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));

      // 실제 영구 저장: products.sections / products.image_urls에 반영.
      // 이전에는 sessionStorage에만 남아서 탭을 닫거나 "작업 내역"에서 다시
      // 열면 수정 전 AI 생성 결과로 되돌아갔음 — 이 호출이 그 문제를 고친다.
      const productId = data.generated?.productId;
      if (productId) {
        const response = await fetch(`/api/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sections: data.generated?.sections ?? [],
            imageUrls: data.imageUrls,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "저장에 실패했습니다.");
        }
        setEditMode(false);
        setToast({ tone: "ok", message: "수정 내용이 저장됐습니다." });
      } else {
        // productId가 없는 예외적인 경우 (정상 흐름에서는 발생하지 않아야 함)
        setEditMode(false);
        setToast({
          tone: "info",
          message: "임시로만 저장했습니다 (이 상품은 서버에 아직 없어 새로고침하면 사라질 수 있어요).",
        });
      }
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "저장에 실패했습니다. 다시 시도해 주세요.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file || !data) return;
    const error = validateImageFile(file);
    if (error) {
      setToast({ tone: "error", message: error });
      return;
    }

    const localUrl = URL.createObjectURL(file);
    const nextUrls = [...data.imageUrls];
    const target = Math.min(replaceImageIndex, Math.max(0, nextUrls.length - 1));
    nextUrls[target] = localUrl;
    persist({ ...data, imageUrls: nextUrls });
    setToast({ tone: "ok", message: "미리보기에 반영했습니다. 저장을 누르면 유지됩니다." });

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setToast({ tone: "error", message: `업로드 실패: ${uploadError.message}` });
        return;
      }
      const { data: publicData } = supabase.storage.from("images").getPublicUrl(path);
      const uploaded = [...nextUrls];
      uploaded[target] = publicData.publicUrl;
      persist({ ...data, imageUrls: uploaded });
    } catch (err) {
      console.warn("[one-click-upload] storage skip", err);
    }
  }

  async function handleAiGenerate() {
    const trimmed = aiText.trim();
    console.log("[ai-generate] wholesale length", trimmed.length, "preview", trimmed.slice(0, 80));
    if (!trimmed) {
      setToast({
        tone: "info",
        message:
          "1688/도매꾹 원본 상품명·스펙·설명을 붙여넣은 뒤 다시 시도해 주세요. 빈 상태에서는 AI를 호출하지 않습니다.",
      });
      return;
    }
    if (!data) return;
    setAiLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: data.category,
          imageUrls: data.imageUrls,
          imagePaths: [],
          productName: data.productName,
          brandName: data.brandName,
          price: data.price,
          targetCustomer: data.targetCustomer,
          keyFeatures: data.keyFeatures,
          ingredients: data.ingredients,
          certifications: data.certifications,
          competitorUrl: data.competitorUrl,
          wholesaleUrl: trimmed,
          productId: data.generated?.productId ?? null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "AI 생성에 실패했습니다.");
      }
      persist({
        ...data,
        wholesaleUrl: trimmed,
        generated: result as GenerateResponse,
      });
      setToast({ tone: "ok", message: "AI가 상세페이지를 다시 구성했습니다." });
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "AI 생성에 실패했습니다.",
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function handleDownload() {
    if (!captureRef.current || !data) return;

    setDownloading(true);
    try {
      freezeScrollRevealAnimations(captureRef.current);
      await new Promise((r) => setTimeout(r, 80));
      const targetWidth = downloadPlatform === "coupang" ? 780 : 860;
      const elWidth = Math.max(1, captureRef.current.offsetWidth);
      const pixelRatio = targetWidth / elWidth;
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio,
        cacheBust: true,
      });
      const platformLabel = downloadPlatform === "coupang" ? "쿠팡" : "스마트스토어";
      const link = document.createElement("a");
      link.download = `${data.productName}-상세페이지-${platformLabel}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("[download]", err);
    } finally {
      unfreezeScrollRevealAnimations(captureRef.current);
      setDownloading(false);
    }
  }

  function handleDownloadHtml() {
    if (!data?.generated) return;
    setDownloadingHtml(true);
    try {
      const categoryTheme = getCategoryTheme(data.category);
      const exportTheme = data.generated.theme
        ? { ...categoryTheme, ...data.generated.theme }
        : categoryTheme;
      const html = buildDetailPageHtml({
        productName: data.productName,
        category: data.category,
        sections: data.generated.sections,
        imageUrls: data.imageUrls,
        theme: exportTheme,
        hiddenIndexes,
      });
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${data.productName}-상세페이지.html`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ tone: "ok", message: "HTML을 내려받았습니다 (웹·자사몰용, PNG와 별개)." });
    } catch (err) {
      console.error("[download-html]", err);
      setToast({ tone: "error", message: "HTML 내보내기에 실패했습니다." });
    } finally {
      setDownloadingHtml(false);
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-full items-center justify-center bg-paper text-ink/60">
        불러오는 중...
      </div>
    );
  }

  const { generated } = data;
  const isTestMode = data.testMode ?? generated?.testMode ?? false;
  const categoryTheme = getCategoryTheme(data.category);
  const theme = generated?.theme
    ? { ...categoryTheme, ...generated.theme }
    : categoryTheme;
  const hiddenSet = new Set(hiddenIndexes);
  const visibleOriginalIndexes =
    generated?.sections.map((_, i) => i).filter((i) => !hiddenSet.has(i)) ?? [];
  const visibleSections =
    generated?.sections.filter((_, i) => !hiddenSet.has(i)) ?? [];

  return (
    <div className="min-h-full bg-paper text-ink">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-line/40 to-paper" />

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10 pb-16">
        <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-registration-red">
              생성 완료
            </p>
            {isTestMode && (
              <span className="inline-flex items-center gap-1 rounded-full border border-mustard/40 bg-mustard/15 px-3 py-1 text-xs font-semibold text-ink/70">
                TEST MODE — 저비용 테스트 결과
              </span>
            )}
            {generated?.mfdsReviewed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-blue/10 px-3 py-1 text-xs font-semibold text-slate-blue">
                ✅ 식약처 광고 기준 검수 완료
              </span>
            )}
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold text-ink">
            {data.productName}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            AI가 상품 특성에 맞춰 {generated?.sections.length ?? 0}개 섹션으로
            상세페이지를 구성했습니다.
            {isTestMode &&
              " 테스트 모드로 생성되어 clarity-upscaler·장식·QA 등 일부 단계가 생략되었습니다. 합성(누끼·배경) 품질 확인은 TEST_MODE=false 실행 결과로만 판단하세요."}
            {generated?.mfdsReviewed &&
              " 화장품/뷰티 카테고리 식약처 광고 기준이 적용되었습니다."}
          </p>

          {generated?.urlAnalysisNotices && generated.urlAnalysisNotices.length > 0 && (
            <div className="mt-4 rounded-lg border border-line bg-line/20 px-4 py-3 text-xs text-ink/70">
              <p className="font-medium text-ink">URL 자동 분석 안내</p>
              <ul className="mt-1.5 space-y-1">
                {generated.urlAnalysisNotices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
              </ul>
            </div>
          )}

          {generated?.replacements && generated.replacements.length > 0 && (
            <div className="mt-4 rounded-lg border border-mustard/30 bg-mustard/10 px-4 py-3 text-xs text-ink/80">
              <p className="font-medium text-ink">자동 수정된 표현</p>
              <ul className="mt-1.5 space-y-1">
                {generated.replacements.map((item) => (
                  <li key={`${item.original}-${item.replacement}`}>
                    &quot;{item.original}&quot; → &quot;{item.replacement}&quot;
                    {item.count > 1 ? ` (${item.count}회)` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="sticky top-0 z-30 -mx-6 mb-2 bg-paper/95 px-6 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
            <DetailActionBar
              tab={toolTab}
              onTabChange={handleTabChange}
              editMode={editMode}
              onToggleEdit={() => setEditMode((v) => !v)}
              onSave={() => void handleSave()}
              saving={saving}
              onUploadClick={() => fileInputRef.current?.click()}
              replaceImageIndex={replaceImageIndex}
              imageCount={data.imageUrls.length}
              onReplaceIndexChange={setReplaceImageIndex}
              aiText={aiText}
              onAiTextChange={setAiText}
              onAiSubmit={() => void handleAiGenerate()}
              aiLoading={aiLoading}
              sections={generated?.sections ?? []}
              hiddenIndexes={hiddenIndexes}
              onReorder={handleReorder}
              onToggleHidden={handleToggleHidden}
              patchIndex={patchIndex}
              onPatchIndexChange={setPatchIndex}
              patchInstruction={patchInstruction}
              onPatchInstructionChange={setPatchInstruction}
              onPatchSubmit={() => void handlePatchSection()}
              patchLoading={patchLoading}
              onGifUploadClick={() => gifInputRef.current?.click()}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              data-testid="file-input"
              onChange={(e) => {
                void handleFileSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={gifInputRef}
              type="file"
              accept="image/gif"
              className="hidden"
              data-testid="gif-file-input"
              onChange={(e) => {
                void handleGifSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <InfoItem label="카테고리" value={data.category} />
            <InfoItem label="판매 가격" value={`₩${data.price.toLocaleString()}`} />
            {data.brandName && <InfoItem label="브랜드" value={data.brandName} />}
            {data.targetCustomer && (
              <InfoItem label="타겟 고객" value={data.targetCustomer} />
            )}
          </div>

          {generated?.sections && generated.sections.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-lg border border-line bg-paper p-1">
                <button
                  type="button"
                  onClick={() => setDownloadPlatform("smartstore")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    downloadPlatform === "smartstore"
                      ? "bg-ink text-paper"
                      : "text-ink/60 hover:text-ink"
                  }`}
                >
                  스마트스토어 860px
                </button>
                <button
                  type="button"
                  onClick={() => setDownloadPlatform("coupang")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    downloadPlatform === "coupang"
                      ? "bg-ink text-paper"
                      : "text-ink/60 hover:text-ink"
                  }`}
                >
                  쿠팡 780px
                </button>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-registration-red px-5 text-sm font-semibold text-paper transition-colors hover:bg-registration-red/85 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? "다운로드 준비 중..." : "이미지로 다운로드"}
              </button>
              <button
                type="button"
                onClick={handleDownloadHtml}
                disabled={downloadingHtml}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-ink transition-colors hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="download-html"
              >
                {downloadingHtml ? "HTML 준비 중..." : "HTML 내보내기"}
              </button>
            </div>
          )}

          {generated?.sections && generated.sections.length > 0 && (
            <InstagramFeedPanel
              productName={data.productName}
              brandName={data.brandName}
              sections={
                visibleSections.length > 0 ? visibleSections : generated.sections
              }
              imageUrls={data.imageUrls}
            />
          )}
        </div>

        {visibleSections.length > 0 ? (
          <div
            ref={captureRef}
            data-testid="detail-preview"
            data-pagzly-preview
            className="relative overflow-hidden rounded-2xl border border-ink/20 bg-paper shadow-[0_24px_60px_-28px_rgba(27,27,24,0.45)]"
          >
            <DetailSectionRenderer
              sections={visibleSections}
              imageUrls={data.imageUrls}
              category={data.category}
              theme={theme}
              conceptIcons={generated?.conceptIcons}
              edit={{
                enabled: editMode,
                onChange: (displayIndex, section) => {
                  const originalIndex = visibleOriginalIndexes[displayIndex];
                  if (originalIndex === undefined) return;
                  handleSectionChange(originalIndex, section);
                },
                onReplaceImage: (imageIndex) => {
                  setReplaceImageIndex(imageIndex);
                  setToolTab("upload");
                  fileInputRef.current?.click();
                },
              }}
            />
            <p className="border-t border-line bg-line/10 px-6 py-3 text-center text-[11px] text-ink/45">
              이 상세페이지는 AI가 자동 생성한 콘텐츠를 포함합니다. 게시 전 실제 상품 정보와 대조
              확인해 주세요.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-paper p-6 text-sm text-ink/60 shadow-sm">
            생성된 섹션이 없습니다. 상품을 다시 등록해 주세요.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/create"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-line text-sm font-semibold text-ink/80 transition-colors hover:bg-line/20"
          >
            정보 수정
          </Link>
          <Link
            href="/create/history"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-line text-sm font-semibold text-ink/80 transition-colors hover:bg-line/20"
          >
            작업 내역
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-registration-red text-sm font-semibold text-paper transition-colors hover:bg-registration-red/85"
          >
            홈으로 이동
          </Link>
        </div>
      </main>
      {toast && (
        <ToastBanner
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-line/15 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/45">{label}</p>
      <p className="mt-0.5 font-medium text-ink">{value}</p>
    </div>
  );
}

export default function CreateResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-paper text-ink/60">
          불러오는 중...
        </div>
      }
    >
      <CreateResultContent />
    </Suspense>
  );
}
