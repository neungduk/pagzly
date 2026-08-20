"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import PagzlyLogo from "@/components/PagzlyLogo";
import GeneratingOverlay, { type GeneratingStage } from "@/components/GeneratingOverlay";
import BackdropCandidatePicker from "@/components/BackdropCandidatePicker";
import { createClient } from "@/lib/supabase";
import { getCategoryTheme } from "@/lib/category-theme";
import type { GeneratedCopy, GenerateResponse } from "@/lib/types/generate";

const CATEGORIES = [
  "의류/패션",
  "화장품/뷰티",
  "식품/건강기능식품",
  "전자제품",
  "생활용품",
  "반려동물",
  "기타",
] as const;

const TARGET_CUSTOMERS = [
  "20~30대 여성",
  "30~40대 여성",
  "남녀 공용",
  "전 연령대",
] as const;

const MAX_IMAGES = 5;
const MAX_REVIEW_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const REVIEW_TYPES = [
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const PLANNING_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const STORAGE_BUCKET = "images";
const SESSION_KEY = "pagzly-create-result";

type CreateProductFormProps = {
  userId: string;
};

type UploadedImage = {
  url: string;
  path: string;
};

type LoadingStage = "idle" | GeneratingStage;

function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "JPG, PNG 파일만 업로드할 수 있습니다.";
  }
  return null;
}

export default function CreateProductForm({ userId }: CreateProductFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [price, setPrice] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [certifications, setCertifications] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [wholesaleUrl, setWholesaleUrl] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [planningDoc, setPlanningDoc] = useState<File | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const reviewInputRef = useRef<HTMLInputElement>(null);
  const planningInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const [backdropCandidates, setBackdropCandidates] = useState<string[] | null>(null);
  const backdropPickRef = useRef<((url: string) => void) | null>(null);
  const loading = loadingStage !== "idle" || backdropCandidates !== null;

  const addImages = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files);
      if (incoming.length === 0) return;

      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        setError(`상품 사진은 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다.`);
        return;
      }

      const nextFiles: File[] = [];
      const nextPreviews: string[] = [];

      for (const file of incoming.slice(0, remaining)) {
        const validationError = validateImage(file);
        if (validationError) {
          setError(validationError);
          return;
        }
        nextFiles.push(file);
        nextPreviews.push(URL.createObjectURL(file));
      }

      setError(null);
      setImages((prev) => [...prev, ...nextFiles]);
      setPreviews((prev) => [...prev, ...nextPreviews]);
    },
    [images.length],
  );

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addImages(e.dataTransfer.files);
  }

  async function uploadImages(files: File[]): Promise<UploadedImage[]> {
    const supabase = createClient();
    const uploaded: UploadedImage[] = [];
    const uploadedAt = new Date().toISOString();

    for (const file of files) {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
      }

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

      // product_images: 완성되기 전 업로드된 이미지를 추적하는 임시 테이블.
      // 상품 저장이 완료되면 /api/generate 에서 product_id를 연결해
      // 3일 자동 삭제 대상에서 제외한다.
      const { error: dbError } = await supabase.from("product_images").insert({
        user_id: userId,
        storage_path: path,
        image_url: data.publicUrl,
        image_uploaded_at: uploadedAt,
      });

      if (dbError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        throw new Error(`이미지 정보 저장 실패: ${dbError.message}`);
      }

      uploaded.push({ url: data.publicUrl, path });
    }

    return uploaded;
  }

  async function uploadAuxFile(file: File, prefix: string): Promise<string> {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${userId}/aux/${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false });

    if (uploadError) {
      throw new Error(`파일 업로드 실패: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  function handleReferenceImage(file: File | null) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("레퍼런스 이미지는 JPG, PNG만 업로드할 수 있습니다.");
      return;
    }
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    setError(null);
    setReferenceImage(file);
    setReferencePreview(URL.createObjectURL(file));
  }

  function handleReviewFile(file: File | null) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    const okExt = lower.endsWith(".txt") || lower.endsWith(".xlsx") || lower.endsWith(".xls");
    if (!okExt && !REVIEW_TYPES.includes(file.type)) {
      setError("리뷰 파일은 txt 또는 xlsx만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_REVIEW_BYTES) {
      setError("리뷰 파일은 2MB 이하만 업로드할 수 있습니다.");
      return;
    }
    setError(null);
    setReviewFile(file);
  }

  function handlePlanningDoc(file: File | null) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".hwp") || lower.endsWith(".pptx") || lower.endsWith(".ppt")) {
      setError("HWP·PPTX는 아직 지원하지 않습니다. PDF 또는 DOCX를 사용해 주세요.");
      return;
    }
    const okExt = lower.endsWith(".pdf") || lower.endsWith(".docx");
    if (!okExt && !PLANNING_TYPES.includes(file.type)) {
      setError("기획안은 PDF 또는 DOCX만 업로드할 수 있습니다.");
      return;
    }
    setError(null);
    setPlanningDoc(file);
  }

  function waitForBackdropPick(urls: string[]): Promise<string> {
    return new Promise((resolve) => {
      backdropPickRef.current = resolve;
      setBackdropCandidates(urls);
      setLoadingStage("idle");
    });
  }

  async function generateBackdrop(
    productCategory: string,
    name: string,
    brand: string | null,
    imageUrls: string[],
    formPrice: string,
    formKeyFeatures: string,
    formIngredients: string,
    formTargetCustomer: string,
    referenceImageUrl: string | null,
  ): Promise<{
    backdropDataUrl?: string;
    candidateUrls?: string[];
    autoPicked?: boolean;
    cost: number;
    conceptBriefCost: number;
    backdropCost: number;
    claudeCost?: number;
    referenceAnalysisCost?: number;
    referenceAnalysis?: import("@/lib/types/generate").ReferenceAnalysisInput;
    testMode?: boolean;
    shadowAnalysis?: import("@/lib/vision-utils").ShadowAnalysis;
    conceptBrief?: import("@/lib/concept-brief").ConceptBrief;
  } | null> {
    try {
      const response = await fetch("/api/generate-backdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: productCategory,
          productName: name,
          brandName: brand,
          imageUrls,
          price: Number(formPrice) || undefined,
          keyFeatures: formKeyFeatures.trim() || null,
          ingredients: formIngredients.trim() || null,
          targetCustomer: formTargetCustomer.trim() || null,
          referenceImageUrl,
        }),
      });

      const result = (await response.json()) as {
        backdropDataUrl?: string;
        candidateUrls?: string[];
        autoPicked?: boolean;
        cost?: number;
        conceptBriefCost?: number;
        backdropCost?: number;
        claudeCost?: number;
        referenceAnalysisCost?: number;
        referenceAnalysis?: import("@/lib/types/generate").ReferenceAnalysisInput;
        testMode?: boolean;
        shadowAnalysis?: import("@/lib/vision-utils").ShadowAnalysis;
        conceptBrief?: import("@/lib/concept-brief").ConceptBrief;
        error?: string;
      };

      if (!response.ok) {
        console.warn(
          "[generate-backdrop] 배경 생성 실패, 원본 이미지 사용:",
          result.error ?? "unknown",
        );
        return null;
      }

      const candidates = result.candidateUrls?.filter(Boolean) ?? [];
      if (!result.backdropDataUrl && candidates.length === 0) {
        console.warn("[generate-backdrop] 배경 후보가 없습니다.");
        return null;
      }

      return {
        backdropDataUrl: result.backdropDataUrl,
        candidateUrls: candidates,
        autoPicked: result.autoPicked ?? true,
        cost: result.cost ?? 0,
        conceptBriefCost: result.conceptBriefCost ?? 0,
        backdropCost: result.backdropCost ?? result.cost ?? 0,
        claudeCost: result.claudeCost ?? 0,
        referenceAnalysisCost: result.referenceAnalysisCost ?? 0,
        referenceAnalysis: result.referenceAnalysis,
        testMode: result.testMode ?? false,
        shadowAnalysis: result.shadowAnalysis,
        conceptBrief: result.conceptBrief,
      };
    } catch (err) {
      console.warn("[generate-backdrop] 배경 생성 실패, 원본 이미지 사용:", err);
      return null;
    }
  }

  async function enhanceImages(
    uploaded: UploadedImage[],
    heroBackdrop: string,
    shadowAnalysis?: import("@/lib/vision-utils").ShadowAnalysis,
    conceptBrief?: import("@/lib/concept-brief").ConceptBrief,
    productCategory?: string,
    testMode?: boolean,
    sectionBackdrops?: { ingredientUrl?: string | null; textureUrl?: string | null },
  ): Promise<{ images: UploadedImage[]; cost: number; decorCost: number; claudeCost: number }> {
    let totalCost = 0;
    let decorCost = 0;
    let claudeCost = 0;
    let decorDataUrl: string | undefined;
    const categoryTheme = productCategory ? getCategoryTheme(productCategory) : null;
    const themeColors = categoryTheme
      ? {
          accent: categoryTheme.accent,
          baseNeutral: categoryTheme.baseNeutral,
          deepAccent: categoryTheme.deepAccent,
        }
      : undefined;
    const isBeauty = productCategory === "화장품/뷰티";
    const backdropByIndex = [
      heroBackdrop,
      sectionBackdrops?.ingredientUrl || heroBackdrop,
      sectionBackdrops?.textureUrl || heroBackdrop,
    ];

    async function enhanceOne(
      item: UploadedImage,
      backdropDataUrl: string,
      options: {
        applyDecor: boolean;
        keepOriginal?: boolean;
        pathSuffix?: string;
        reuseDecor?: boolean;
      },
    ): Promise<UploadedImage | null> {
      const response = await fetch("/api/enhance-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: item.url,
          storagePath: item.path,
          backdropDataUrl,
          shadowAnalysis,
          conceptBrief,
          applyDecor: options.applyDecor,
          decorDataUrl: options.reuseDecor ? decorDataUrl : undefined,
          theme: themeColors,
          keepOriginal: options.keepOriginal,
          pathSuffix: options.pathSuffix,
        }),
      });

      const result = (await response.json()) as {
        enhancedUrl?: string;
        enhancedPath?: string;
        cost?: number;
        decorCost?: number;
        claudeCost?: number;
        decorDataUrl?: string;
        error?: string;
      };

      if (!response.ok || !result.enhancedUrl || !result.enhancedPath) {
        console.warn(
          "[enhance-image] 보정 실패, 원본 사용:",
          result.error ?? item.path,
        );
        return null;
      }

      totalCost += result.cost ?? 0;
      decorCost += result.decorCost ?? 0;
      claudeCost += result.claudeCost ?? 0;
      if (result.decorDataUrl) {
        decorDataUrl = result.decorDataUrl;
      }
      return { url: result.enhancedUrl, path: result.enhancedPath };
    }

    const extras: UploadedImage[] = [];
    if (isBeauty) {
      if (uploaded.length < 2 && sectionBackdrops?.ingredientUrl) {
        try {
          const extra = await enhanceOne(uploaded[0], sectionBackdrops.ingredientUrl, {
            applyDecor: false,
            keepOriginal: true,
            pathSuffix: "ingredient",
          });
          if (extra) extras.push(extra);
        } catch (err) {
          console.warn("[enhance-image] 성분 배경 추가 합성 실패:", err);
        }
      }
      if (uploaded.length + extras.length < 3 && sectionBackdrops?.textureUrl) {
        try {
          const extra = await enhanceOne(uploaded[0], sectionBackdrops.textureUrl, {
            applyDecor: false,
            keepOriginal: true,
            pathSuffix: "texture",
          });
          if (extra) extras.push(extra);
        } catch (err) {
          console.warn("[enhance-image] 텍스처 배경 추가 합성 실패:", err);
        }
      }
    }

    const results: UploadedImage[] = [];
    for (let index = 0; index < uploaded.length; index++) {
      const item = uploaded[index];
      const isHero = index === 0;

      // TEST_MODE에서도 모든 업로드 사진에 배경 제거+합성을 적용한다.
      // (index>0 스킵은 비용 절감용이었으나, 원본 사진 사각형이 섹션에 그대로
      //  노출되어 QA/데모 품질을 망가뜨림 — P0 버그)

      try {
        const enhanced = await enhanceOne(
          item,
          backdropByIndex[index] ?? heroBackdrop,
          {
            applyDecor: isHero,
            reuseDecor: !isHero,
            pathSuffix: "enhanced",
          },
        );
        results.push(enhanced ?? item);
      } catch (err) {
        console.warn("[enhance-image] 보정 실패, 원본 사용:", item.path, err);
        results.push(item);
      }
    }

    return { images: [...results, ...extras], cost: totalCost, decorCost, claudeCost };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("카테고리를 선택해 주세요.");
      return;
    }
    if (images.length === 0) {
      setError("상품 사진을 1장 이상 업로드해 주세요.");
      return;
    }
    if (!productName.trim()) {
      setError("상품명을 입력해 주세요.");
      return;
    }
    if (!price.trim() || Number(price) <= 0) {
      setError("판매 가격을 올바르게 입력해 주세요.");
      return;
    }

    setLoadingStage("uploading");

    try {
      const uploaded = await uploadImages(images);

      let referenceImageUrl: string | null = null;
      let reviewFileUrl: string | null = null;
      let planningDocUrl: string | null = null;
      let referenceAnalysis: import("@/lib/types/generate").ReferenceAnalysisInput | undefined;

      if (referenceImage) {
        referenceImageUrl = await uploadAuxFile(referenceImage, "reference");
      }
      if (reviewFile) {
        reviewFileUrl = await uploadAuxFile(reviewFile, "review");
      }
      if (planningDoc) {
        planningDocUrl = await uploadAuxFile(planningDoc, "planning");
      }

      let photoProcessingCost = 0;
      let conceptBrief: import("@/lib/concept-brief").ConceptBrief | undefined;
      let photoCostBreakdown: import("@/lib/types/generate").PhotoCostBreakdown = {};
      let testMode = false;

      setLoadingStage("backdrop");
      const backdropResult = await generateBackdrop(
        category,
        productName.trim(),
        brandName.trim() || null,
        uploaded.map((item) => item.url),
        price,
        keyFeatures,
        ingredients,
        targetCustomer,
        referenceImageUrl,
      );

      let finalImages = uploaded;
      if (backdropResult) {
        testMode = backdropResult.testMode ?? false;
        photoProcessingCost += backdropResult.cost;
        conceptBrief = backdropResult.conceptBrief;
        photoCostBreakdown = {
          conceptBrief: backdropResult.conceptBriefCost,
          backdrop: backdropResult.backdropCost,
          claude: backdropResult.claudeCost ?? 0,
          referenceAnalysis: backdropResult.referenceAnalysisCost ?? 0,
        };
        referenceAnalysis = backdropResult.referenceAnalysis;

        let chosenBackdrop = backdropResult.backdropDataUrl;
        const candidates = backdropResult.candidateUrls ?? [];
        if (!testMode && candidates.length > 1) {
          chosenBackdrop = await waitForBackdropPick(candidates);
          setLoadingStage("enhancing");
        } else if (candidates.length >= 1) {
          // fill-dev 단일 후보: Supabase에 올린 안정 URL 우선 (Replicate 임시 URL 만료 방지)
          chosenBackdrop = candidates[0];
        }

        if (!chosenBackdrop) {
          throw new Error("배경이 선택되지 않았습니다.");
        }

        let sectionBackdrops:
          | { ingredientUrl?: string | null; textureUrl?: string | null }
          | undefined;
        // 업로드 2·3번(성분/기능·텍스처/사용 장면)마다 히어로와 다른 배경을 쓴다.
        if (backdropResult.shadowAnalysis && uploaded.length >= 2) {
          try {
            const sectionRes = await fetch("/api/section-backdrops", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                shadowAnalysis: backdropResult.shadowAnalysis,
                conceptBrief,
                category,
              }),
            });
            const sectionJson = (await sectionRes.json()) as {
              ingredientUrl?: string | null;
              textureUrl?: string | null;
              cost?: number;
              error?: string;
            };
            if (sectionRes.ok) {
              sectionBackdrops = {
                ingredientUrl: sectionJson.ingredientUrl,
                textureUrl: sectionJson.textureUrl,
              };
              photoProcessingCost += sectionJson.cost ?? 0;
              photoCostBreakdown = {
                ...photoCostBreakdown,
                sectionBackdrops: sectionJson.cost ?? 0,
              };
            } else {
              console.warn("[section-backdrops] 생략:", sectionJson.error);
            }
          } catch (err) {
            console.warn("[section-backdrops] 생략:", err);
          }
        }

        setLoadingStage("enhancing");
        const enhanced = await enhanceImages(
          uploaded,
          chosenBackdrop,
          backdropResult.shadowAnalysis,
          conceptBrief,
          category,
          testMode,
          sectionBackdrops,
        );
        finalImages = enhanced.images;
        photoProcessingCost += enhanced.cost;
        photoCostBreakdown = {
          ...photoCostBreakdown,
          enhance: enhanced.cost - enhanced.decorCost,
          decor: enhanced.decorCost,
          claude: (photoCostBreakdown.claude ?? 0) + enhanced.claudeCost,
        };
      }

      const imageUrls = finalImages.map((item) => item.url);
      const imagePaths = finalImages.map((item) => item.path);

      const payload = {
        category,
        imageUrls,
        imagePaths,
        productName: productName.trim(),
        brandName: brandName.trim() || null,
        price: Number(price),
        targetCustomer: targetCustomer || null,
        keyFeatures: keyFeatures.trim() || null,
        ingredients: ingredients.trim() || null,
        certifications: certifications.trim() || null,
        competitorUrl: competitorUrl.trim() || null,
        wholesaleUrl: wholesaleUrl.trim() || null,
        referenceImageUrl,
        reviewFileUrl,
        planningDocUrl,
        referenceAnalysis: referenceAnalysis ?? null,
        createdAt: new Date().toISOString(),
        photoProcessingCost,
        conceptBrief,
        photoCostBreakdown,
        testMode,
        imageCacheKey: images
          .map((file) => `${file.name}:${file.size}`)
          .sort()
          .join("|"),
      };

      setLoadingStage("generating");

      console.log("[generate payload wholesale]", {
        rawLength: wholesaleUrl.length,
        trimmedLength: wholesaleUrl.trim().length,
        sent:
          payload.wholesaleUrl === null
            ? "null (empty)"
            : `string(${String(payload.wholesaleUrl).length})`,
        preview: (payload.wholesaleUrl ?? "").slice(0, 120),
      });

      const generateResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const generateResult = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(generateResult.error ?? "AI 생성에 실패했습니다.");
      }

      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          ...payload,
          imageUrls: (generateResult as GenerateResponse).imageUrls ?? payload.imageUrls,
          photoCostBreakdown:
            (generateResult as GenerateResponse).photoCostBreakdown ?? payload.photoCostBreakdown,
          referenceAnalysis:
            (generateResult as GenerateResponse).referenceAnalysis ?? payload.referenceAnalysis,
          reviewInsights: (generateResult as GenerateResponse).reviewInsights ?? null,
          planningDocText: (generateResult as GenerateResponse).planningDocText ?? null,
          testMode: generateResult.testMode ?? testMode,
          generated: generateResult as GenerateResponse,
        }),
      );
      router.push("/create/result");
    } catch (err) {
      setBackdropCandidates(null);
      setError(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
      setLoadingStage("idle");
    }
  }

  const loadingLabel =
    loadingStage === "uploading"
      ? "사진 업로드 중..."
      : loadingStage === "backdrop"
        ? "배경 디자인 생성 중..."
        : loadingStage === "enhancing"
          ? "사진 보정 중..."
          : loadingStage === "generating"
            ? "AI 상세페이지 생성 중..."
            : "AI 상세페이지 생성하기";

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-registration-red focus:ring-2 focus:ring-registration-red/20";
  const labelClass = "block text-sm font-medium text-ink/80";
  const sectionClass = "rounded-2xl border border-line bg-paper p-6 shadow-sm sm:p-8";

  return (
    <div className="min-h-full bg-paper text-ink">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-line/40 to-paper" />

      <header className="border-b border-line bg-paper/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/">
            <PagzlyLogo className="h-8 w-auto" />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-ink/60 hover:text-ink"
          >
            홈
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 pb-16">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-registration-red">
            상세페이지 생성
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-ink sm:text-3xl">
            상품 정보 입력
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            AI가 상세페이지를 만들 수 있도록 상품 정보를 입력해 주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. 카테고리 */}
          <section className={sectionClass}>
            <h2 className="font-heading text-lg font-bold text-ink">카테고리</h2>
            <p className="mt-1 text-sm text-ink/60">상품 카테고리를 선택해 주세요.</p>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${inputClass} mt-4`}
            >
              <option value="">카테고리 선택</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </section>

          {/* 2. 상품 사진 */}
          <section className={sectionClass}>
            <h2 className="font-heading text-lg font-bold text-ink">상품 사진</h2>
            <p className="mt-1 text-sm text-ink/60">
              JPG, PNG · 최대 {MAX_IMAGES}장
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragOver
                  ? "border-registration-red bg-registration-red/5"
                  : "border-line hover:border-registration-red/40 hover:bg-line/20"
              }`}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-registration-red/10 text-registration-red">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-ink/80">
                클릭하거나 파일을 드래그하여 업로드
              </p>
              <p className="mt-1 text-xs text-ink/40">
                {images.length}/{MAX_IMAGES}장 업로드됨
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {previews.map((src, index) => (
                  <div key={src} className="group relative aspect-square overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`상품 사진 ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="사진 삭제"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. 상품 기본 정보 */}
          <section className={sectionClass}>
            <h2 className="font-heading text-lg font-bold text-ink">상품 기본 정보</h2>
            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="productName" className={labelClass}>
                  상품명 <span className="text-registration-red">*</span>
                </label>
                <input
                  id="productName"
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="예: 오버사이즈 코튼 셔츠"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="brandName" className={labelClass}>
                  브랜드명
                </label>
                <input
                  id="brandName"
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="예: Pagzly"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="price" className={labelClass}>
                    판매 가격 <span className="text-registration-red">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink/40">₩</span>
                    <input
                      id="price"
                      type="number"
                      required
                      min={1}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="29900"
                      className={`${inputClass} mt-0 pl-8`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="targetCustomer" className={labelClass}>
                    타겟 고객
                  </label>
                  <select
                    id="targetCustomer"
                    value={targetCustomer}
                    onChange={(e) => setTargetCustomer(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">선택 (선택사항)</option>
                    {TARGET_CUSTOMERS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 상품 특징 */}
          <section className={sectionClass}>
            <h2 className="font-heading text-lg font-bold text-ink">상품 특징</h2>
            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="keyFeatures" className={labelClass}>
                  핵심 특징 / 강조 포인트
                </label>
                <textarea
                  id="keyFeatures"
                  rows={4}
                  value={keyFeatures}
                  onChange={(e) => setKeyFeatures(e.target.value)}
                  placeholder="예: 100% 순면, 사계절 착용 가능, 루즈핏 디자인"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label htmlFor="ingredients" className={labelClass}>
                  주요 성분 또는 소재
                </label>
                <input
                  id="ingredients"
                  type="text"
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="예: 면 100%, 히알루론산"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="certifications" className={labelClass}>
                  인증 / 수상 이력
                </label>
                <input
                  id="certifications"
                  type="text"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  placeholder="예: KC 인증, 2025 디자인 어워드"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* 5. 참고 자료 (선택) */}
          <section className={sectionClass}>
            <h2 className="font-heading text-lg font-bold text-ink">참고 자료 (선택)</h2>
            <p className="mt-1 text-sm text-ink/60">
              레퍼런스 이미지·리뷰·기획안을 첨부하면 AI가 색감·후기 톤·기획 톤을 참고합니다.
            </p>
            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="referenceImage" className={labelClass}>
                  레퍼런스 이미지 (선택)
                </label>
                <p className="mt-1 text-xs text-ink/40">색상·무드 참고용 JPG/PNG</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => referenceInputRef.current?.click()}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink/80 hover:bg-line/30"
                  >
                    {referenceImage ? "다른 이미지 선택" : "이미지 선택"}
                  </button>
                  {referenceImage && (
                    <button
                      type="button"
                      onClick={() => {
                        if (referencePreview) URL.revokeObjectURL(referencePreview);
                        setReferenceImage(null);
                        setReferencePreview(null);
                      }}
                      className="text-sm text-ink/50 hover:text-registration-red"
                    >
                      제거
                    </button>
                  )}
                  {referenceImage && (
                    <span className="text-xs text-ink/50">{referenceImage.name}</span>
                  )}
                </div>
                {referencePreview && (
                  <div className="mt-3 h-24 w-24 overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={referencePreview} alt="레퍼런스 미리보기" className="h-full w-full object-cover" />
                  </div>
                )}
                <input
                  id="referenceImage"
                  ref={referenceInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    handleReferenceImage(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>

              <div>
                <label htmlFor="reviewFile" className={labelClass}>
                  리뷰 파일 (선택)
                </label>
                <p className="mt-1 text-xs text-ink/40">엑셀(xlsx) 또는 txt · 최대 2MB</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => reviewInputRef.current?.click()}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink/80 hover:bg-line/30"
                  >
                    {reviewFile ? "다른 파일 선택" : "파일 선택"}
                  </button>
                  {reviewFile && (
                    <button
                      type="button"
                      onClick={() => setReviewFile(null)}
                      className="text-sm text-ink/50 hover:text-registration-red"
                    >
                      제거
                    </button>
                  )}
                  {reviewFile && (
                    <span className="text-xs text-ink/50">
                      {reviewFile.name} ({(reviewFile.size / 1024).toFixed(0)}KB)
                    </span>
                  )}
                </div>
                <input
                  id="reviewFile"
                  ref={reviewInputRef}
                  type="file"
                  accept=".txt,.xlsx,.xls,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    handleReviewFile(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>

              <div>
                <label htmlFor="planningDoc" className={labelClass}>
                  기획안 (선택)
                </label>
                <p className="mt-1 text-xs text-ink/40">
                  PDF 또는 DOCX만 지원 · HWP는 아직 지원하지 않습니다 · PPTX는 지원 예정
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => planningInputRef.current?.click()}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink/80 hover:bg-line/30"
                  >
                    {planningDoc ? "다른 파일 선택" : "파일 선택"}
                  </button>
                  {planningDoc && (
                    <button
                      type="button"
                      onClick={() => setPlanningDoc(null)}
                      className="text-sm text-ink/50 hover:text-registration-red"
                    >
                      제거
                    </button>
                  )}
                  {planningDoc && (
                    <span className="text-xs text-ink/50">{planningDoc.name}</span>
                  )}
                </div>
                <input
                  id="planningDoc"
                  ref={planningInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    handlePlanningDoc(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </section>

          {/* 6. 추가 옵션 */}
          <section className={sectionClass}>
            <h2 className="font-heading text-lg font-bold text-ink">추가 옵션</h2>
            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="competitorUrl" className={labelClass}>
                  경쟁사 URL
                </label>
                <input
                  id="competitorUrl"
                  type="url"
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-ink/40">AI가 USP를 분석합니다</p>
              </div>

              <div>
                <label htmlFor="wholesaleUrl" className={labelClass}>
                  1688 / 도매꾹 원본 상품명/스펙/설명 붙여넣기
                </label>
                <textarea
                  id="wholesaleUrl"
                  rows={4}
                  value={wholesaleUrl}
                  onChange={(e) => setWholesaleUrl(e.target.value)}
                  placeholder="원본 판매 페이지의 상품명, 스펙, 상세 설명 등을 그대로 붙여넣어 주세요."
                  className={`${inputClass} resize-none`}
                />
                <p className="mt-1.5 text-xs text-ink/40">위탁 셀러용 원본 상품 정보 붙여넣기</p>
              </div>
            </div>
          </section>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-registration-red text-base font-semibold text-paper transition-colors hover:bg-registration-red/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? loadingLabel : "AI 상세페이지 생성하기"}
          </button>
        </form>
      </main>

      {loadingStage !== "idle" && !backdropCandidates && (
        <GeneratingOverlay stage={loadingStage} />
      )}
      {backdropCandidates && (
        <BackdropCandidatePicker
          urls={backdropCandidates}
          onConfirm={(url) => {
            const resolve = backdropPickRef.current;
            backdropPickRef.current = null;
            setBackdropCandidates(null);
            resolve?.(url);
          }}
        />
      )}
    </div>
  );
}

export { SESSION_KEY };
