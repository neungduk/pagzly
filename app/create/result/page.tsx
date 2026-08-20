"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import DetailSectionRenderer from "@/components/DetailSectionRenderer";
import { freezeScrollRevealAnimations } from "@/components/DetailScrollReveal";
import DetailActionBar, { type DetailToolTab } from "@/components/DetailActionBar";
import ToastBanner from "@/components/ToastBanner";
import { SESSION_KEY } from "@/components/CreateProductForm";
import type { DetailSection, GenerateResponse } from "@/lib/types/generate";
import { getCategoryTheme } from "@/lib/category-theme";
import { validateImageFile } from "@/lib/image-upload";
import { createClient } from "@/lib/supabase";

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
  const [data, setData] = useState<ProductResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toolTab, setToolTab] = useState<DetailToolTab>("edit");
  const [replaceImageIndex, setReplaceImageIndex] = useState(0);
  const [toast, setToast] = useState<{ message: string; tone: "error" | "info" | "ok" } | null>(
    null,
  );
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const id = searchParams.get("id");
      const raw = sessionStorage.getItem(SESSION_KEY);

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
          router.replace("/create");
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

  function handleTabChange(next: DetailToolTab) {
    setToolTab(next);
    if (next === "edit") setEditMode(true);
  }

  function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setEditMode(false);
      setToast({ tone: "ok", message: "수정 내용이 저장되었습니다." });
    } catch {
      setToast({ tone: "error", message: "저장에 실패했습니다. 다시 시도해 주세요." });
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
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `${data.productName}-상세페이지.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("[download]", err);
    } finally {
      setDownloading(false);
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
              onSave={handleSave}
              saving={saving}
              onUploadClick={() => fileInputRef.current?.click()}
              replaceImageIndex={replaceImageIndex}
              imageCount={data.imageUrls.length}
              onReplaceIndexChange={setReplaceImageIndex}
              aiText={aiText}
              onAiTextChange={setAiText}
              onAiSubmit={() => void handleAiGenerate()}
              aiLoading={aiLoading}
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
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-registration-red px-5 text-sm font-semibold text-paper transition-colors hover:bg-registration-red/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? "다운로드 준비 중..." : "이미지로 다운로드"}
            </button>
          )}
        </div>

        {generated?.sections && generated.sections.length > 0 ? (
          <div
            ref={captureRef}
            data-testid="detail-preview"
            className="overflow-hidden rounded-2xl border border-line bg-paper"
          >
            <DetailSectionRenderer
              sections={generated.sections}
              imageUrls={data.imageUrls}
              category={data.category}
              theme={theme}
              conceptIcons={generated.conceptIcons}
              edit={{
                enabled: editMode,
                onChange: handleSectionChange,
                onReplaceImage: (imageIndex) => {
                  setReplaceImageIndex(imageIndex);
                  setToolTab("upload");
                  fileInputRef.current?.click();
                },
              }}
            />
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
