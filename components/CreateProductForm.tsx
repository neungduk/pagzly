"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GeneratingOverlay, { type GeneratingStage, SNAP_HOLD_MS } from "@/components/GeneratingOverlay";
import { createClient } from "@/lib/supabase";
import { productImageProtectedUntil } from "@/lib/product-image-protection";
import { countSlotSections, type SlotLength } from "@/lib/section-templates";
import type { DraftGenerateResponse } from "@/lib/types/generate";
import type { UploadedImage } from "@/lib/photo-pipeline-client";
import { MAX_PRODUCT_IMAGES, MIN_AI_USED_IMAGES } from "@/lib/assign-section-images";
import {
  defaultRoleForIndex,
  getUploadRoleGuide,
  type ProductImageRole,
} from "@/lib/image-roles";
import { pickAutofillVisionIndices } from "@/lib/autofill-vision-pick";

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

const MAX_IMAGES = MAX_PRODUCT_IMAGES;
const MIN_IMAGES = MIN_AI_USED_IMAGES;
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
/** 기획 초안(draft) — payload + sections */
export const DRAFT_SESSION_KEY = "pagzly-create-draft";
/** result → draft 사진만 재시도 */
export const RETRY_PHOTO_ONLY_KEY = "pagzly-retry-photo-only";

export type DraftSessionPayload = {
  payload: Record<string, unknown>;
  draftToken: string;
  sections: DraftGenerateResponse["sections"];
  headlines: string[];
  description: string;
  features: string[];
  howToUse: string;
  caution: string;
  imageAnalysis?: string;
  theme?: DraftGenerateResponse["theme"];
  mfdsReviewed?: boolean;
  replacements?: DraftGenerateResponse["replacements"];
  photoCostBreakdown?: DraftGenerateResponse["photoCostBreakdown"];
  referenceAnalysis?: DraftGenerateResponse["referenceAnalysis"];
  reviewInsights?: DraftGenerateResponse["reviewInsights"];
  planningDocText?: DraftGenerateResponse["planningDocText"];
  competitorDifferentiation?: DraftGenerateResponse["competitorDifferentiation"];
  /** false면 원본 이미지로 카피만 뽑은 상태 — 승인 전 */
  draftApproved: boolean;
  formSnapshot: {
    category: string;
    compositionLength: SlotLength;
    productName: string;
    brandName: string;
    price: string;
    targetCustomer: string;
    keyFeatures: string;
    ingredients: string;
    certifications: string;
    competitorUrl: string;
    wholesaleUrl: string;
    sellerTrustEvidence: string;
  };
};

type CreateProductFormProps = {
  userId: string;
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
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState("");
  const [compositionLength, setCompositionLength] = useState<SlotLength>("long");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [imageRoles, setImageRoles] = useState<ProductImageRole[]>([]);
  /** draft 수정 복귀 시 — 이미 업로드된 URL (새 File 없이 재제출 가능) */
  const [restoredUploads, setRestoredUploads] = useState<UploadedImage[] | null>(null);
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [price, setPrice] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [certifications, setCertifications] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [wholesaleUrl, setWholesaleUrl] = useState("");
  const [sellerTrustEvidence, setSellerTrustEvidence] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [lifestyleImage, setLifestyleImage] = useState<File | null>(null);
  const [lifestylePreview, setLifestylePreview] = useState<string | null>(null);
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [planningDoc, setPlanningDoc] = useState<File | null>(null);
  const [customGif, setCustomGif] = useState<File | null>(null);
  const [customGifPreview, setCustomGifPreview] = useState<string | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const lifestyleInputRef = useRef<HTMLInputElement>(null);
  const reviewInputRef = useRef<HTMLInputElement>(null);
  const planningInputRef = useRef<HTMLInputElement>(null);
  const customGifInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const [overlaySnapComplete, setOverlaySnapComplete] = useState(false);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [autofillNotice, setAutofillNotice] = useState(false);
  const [autofillTargetHint, setAutofillTargetHint] = useState<string | null>(null);
  const loading = loadingStage !== "idle";

  const sectionCountHint = useMemo(() => {
    if (!category) return null;
    return countSlotSections(category, compositionLength);
  }, [category, compositionLength]);

  const uploadRoleGuide = useMemo(() => getUploadRoleGuide(category || "기타"), [category]);

  useEffect(() => {
    if (searchParams.get("restore") !== "1") return;
    try {
      const raw = sessionStorage.getItem(DRAFT_SESSION_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as DraftSessionPayload;
      const snap = draft.formSnapshot;
      if (!snap) return;
      setCategory(snap.category ?? "");
      setCompositionLength(snap.compositionLength === "short" ? "short" : "long");
      setProductName(snap.productName ?? "");
      setBrandName(snap.brandName ?? "");
      setPrice(snap.price ?? "");
      setTargetCustomer(snap.targetCustomer ?? "");
      setKeyFeatures(snap.keyFeatures ?? "");
      setIngredients(snap.ingredients ?? "");
      setCertifications(snap.certifications ?? "");
      setCompetitorUrl(snap.competitorUrl ?? "");
      setWholesaleUrl(snap.wholesaleUrl ?? "");
      setSellerTrustEvidence(snap.sellerTrustEvidence ?? "");
      const urls = (draft.payload.imageUrls as string[] | undefined) ?? [];
      const paths = (draft.payload.imagePaths as string[] | undefined) ?? [];
      if (urls.length > 0) {
        setPreviews(urls);
        setRestoredUploads(
          urls.map((url, i) => ({
            url,
            path: paths[i] ?? `restored/${i}`,
          })),
        );
        const savedRoles = (draft.payload.imageRoles as ProductImageRole[] | undefined) ?? [];
        setImageRoles(
          urls.map((_, i) => savedRoles[i] ?? defaultRoleForIndex(i)),
        );
      }
    } catch {
      // ignore corrupt draft
    }
  }, [searchParams]);

  const addImages = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files);
      if (incoming.length === 0) return;

      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        setError(`상품 사진은 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다.`);
        return;
      }

      setRestoredUploads(null);

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
      setImageRoles((prev) => {
        const start = prev.length;
        const added = nextFiles.map((_, i) => defaultRoleForIndex(start + i));
        return [...prev, ...added];
      });
    },
    [images.length],
  );

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setImageRoles((prev) => prev.filter((_, i) => i !== index));
  }

  function setRoleAt(index: number, role: ProductImageRole) {
    setImageRoles((prev) => {
      const next = [...prev];
      next[index] = role;
      return next;
    });
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

      // product_images: 완성 전 임시 추적. product_id 연결 전에도
      // protected_until(24h) 동안 cleanup 대상에서 제외 (30차).
      const { error: dbError } = await supabase.from("product_images").insert({
        user_id: userId,
        storage_path: path,
        image_url: data.publicUrl,
        image_uploaded_at: uploadedAt,
        protected_until: productImageProtectedUntil(),
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

  function handleLifestyleImage(file: File | null) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("라이프스타일 사진은 JPG, PNG만 업로드할 수 있습니다.");
      return;
    }
    if (lifestylePreview) URL.revokeObjectURL(lifestylePreview);
    setError(null);
    setLifestyleImage(file);
    setLifestylePreview(URL.createObjectURL(file));
  }

  const autofillReady = Boolean(category) && productName.trim().length >= 5;

  async function handleAutofillDraft() {
    if (!autofillReady || autofillLoading) return;
    setAutofillError(null);
    setAutofillLoading(true);
    try {
      let imageUrls: string[] = [];
      if (restoredUploads?.length) {
        const all = restoredUploads.map((item) => item.url);
        const indices = pickAutofillVisionIndices(all.length);
        imageUrls = indices.map((i) => all[i]).filter(Boolean);
      } else if (images.length > 0) {
        const indices = pickAutofillVisionIndices(images.length);
        const uploaded = await uploadImages(indices.map((i) => images[i]));
        imageUrls = uploaded.map((item) => item.url);
      }

      const res = await fetch("/api/autofill-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          productName: productName.trim(),
          brandName: brandName.trim() || null,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        }),
      });
      const json = (await res.json()) as {
        draft?: { keyFeatures?: string; targetCustomer?: string };
        error?: string;
        visionCost?: number;
        visionImageCount?: number;
      };
      if (!res.ok) {
        setAutofillError(json.error ?? "자동입력에 실패했습니다.");
        return;
      }
      const draft = json.draft;
      if (!draft) return;

      let filled = false;
      if (!keyFeatures.trim() && draft.keyFeatures?.trim()) {
        setKeyFeatures(draft.keyFeatures.trim());
        filled = true;
      }
      if (!targetCustomer.trim() && draft.targetCustomer?.trim()) {
        const suggestion = draft.targetCustomer.trim();
        const match = TARGET_CUSTOMERS.find(
          (item) => suggestion.includes(item) || item.includes(suggestion.split(/[\s,]/)[0] ?? ""),
        );
        if (match) {
          setTargetCustomer(match);
          filled = true;
        } else {
          setAutofillTargetHint(suggestion);
        }
      }
      if (filled) {
        setAutofillNotice(true);
        if ((json.visionImageCount ?? 0) > 0) {
          console.log(
            `[autofill] Vision ${json.visionImageCount}장 반영 (visionCost=$${(json.visionCost ?? 0).toFixed(4)})`,
          );
        }
      } else if (!keyFeatures.trim() && !targetCustomer.trim()) {
        setAutofillError("채울 수 있는 빈 필드가 없거나 초안이 비어 있습니다.");
      }
    } catch {
      setAutofillError("자동입력에 실패했습니다.");
    } finally {
      setAutofillLoading(false);
    }
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

  function handleCustomGif(file: File | null) {
    if (!file) return;
    if (file.type !== "image/gif") {
      setError("GIF 파일(.gif)만 업로드할 수 있습니다.");
      return;
    }
    if (customGifPreview) URL.revokeObjectURL(customGifPreview);
    setError(null);
    setCustomGif(file);
    setCustomGifPreview(URL.createObjectURL(file));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("카테고리를 선택해 주세요.");
      return;
    }
    if (images.length === 0 && !restoredUploads?.length) {
      setError(`상품 사진을 ${MIN_IMAGES}장 이상 업로드해 주세요. (최대 ${MAX_IMAGES}장)`);
      return;
    }
    const imageTotal = images.length > 0 ? images.length : (restoredUploads?.length ?? 0);
    if (imageTotal < MIN_IMAGES) {
      setError(
        `상세페이지 생성에는 사진이 최소 ${MIN_IMAGES}장 필요합니다. (현재 ${imageTotal}장 · 최대 ${MAX_IMAGES}장)`,
      );
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
    setOverlaySnapComplete(false);

    try {
      const uploaded =
        images.length > 0 ? await uploadImages(images) : (restoredUploads as UploadedImage[]);

      let referenceImageUrl: string | null = null;
      let lifestyleImageUrl: string | null = null;
      let reviewFileUrl: string | null = null;
      let planningDocUrl: string | null = null;
      let customGifUrl: string | null = null;

      if (referenceImage) {
        referenceImageUrl = await uploadAuxFile(referenceImage, "reference");
      }
      if (lifestyleImage) {
        lifestyleImageUrl = await uploadAuxFile(lifestyleImage, "lifestyle");
      }
      if (reviewFile) {
        reviewFileUrl = await uploadAuxFile(reviewFile, "review");
      }
      if (planningDoc) {
        planningDocUrl = await uploadAuxFile(planningDoc, "planning");
      }
      if (customGif) {
        customGifUrl = await uploadAuxFile(customGif, "custom-gif");
      }

      // 승인 전: 원본 업로드만으로 카피 draft 생성 (배경/보정 비용 스킵)
      const imageUrls = uploaded.map((item) => item.url);
      const imagePaths = uploaded.map((item) => item.path);

      const payload = {
        category,
        length: compositionLength,
        mode: "draft" as const,
        imageUrls,
        imagePaths,
        imageRoles: imageRoles.slice(0, imageUrls.length),
        productName: productName.trim(),
        brandName: brandName.trim() || null,
        price: Number(price),
        targetCustomer: targetCustomer || null,
        keyFeatures: keyFeatures.trim() || null,
        ingredients: ingredients.trim() || null,
        certifications: certifications.trim() || null,
        competitorUrl: competitorUrl.trim() || null,
        wholesaleUrl: wholesaleUrl.trim() || null,
        sellerTrustEvidence: sellerTrustEvidence.trim() || null,
        referenceImageUrl,
        lifestyleImageUrl,
        reviewFileUrl,
        planningDocUrl,
        customGifUrl,
        referenceAnalysis: null,
        createdAt: new Date().toISOString(),
        photoProcessingCost: 0,
        photoCostBreakdown: {},
        testMode: false,
        imageCacheKey: images
          .map((file) => `${file.name}:${file.size}`)
          .sort()
          .join("|"),
      };

      setLoadingStage("generating");

      const generateResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const generateResult = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(generateResult.error ?? "AI 생성에 실패했습니다.");
      }

      setOverlaySnapComplete(true);
      await new Promise((r) => setTimeout(r, SNAP_HOLD_MS));

      const draftResult = generateResult as DraftGenerateResponse;
      const draftSession: DraftSessionPayload = {
        payload: {
          ...payload,
          imageUrls: draftResult.imageUrls ?? payload.imageUrls,
          photoCostBreakdown: draftResult.photoCostBreakdown ?? payload.photoCostBreakdown,
          referenceAnalysis: draftResult.referenceAnalysis ?? null,
          reviewInsights: draftResult.reviewInsights ?? null,
          planningDocText: draftResult.planningDocText ?? null,
          competitorDifferentiation: draftResult.competitorDifferentiation ?? null,
        },
        draftToken: draftResult.draftToken,
        sections: draftResult.sections,
        headlines: draftResult.headlines ?? [],
        description: draftResult.description ?? "",
        features: draftResult.features ?? [],
        howToUse: draftResult.howToUse ?? "",
        caution: draftResult.caution ?? "",
        imageAnalysis: draftResult.imageAnalysis,
        theme: draftResult.theme,
        mfdsReviewed: draftResult.mfdsReviewed,
        replacements: draftResult.replacements,
        photoCostBreakdown: draftResult.photoCostBreakdown,
        referenceAnalysis: draftResult.referenceAnalysis,
        reviewInsights: draftResult.reviewInsights,
        planningDocText: draftResult.planningDocText,
        competitorDifferentiation: draftResult.competitorDifferentiation,
        draftApproved: false,
        formSnapshot: {
          category,
          compositionLength,
          productName: productName.trim(),
          brandName: brandName.trim(),
          price,
          targetCustomer,
          keyFeatures: keyFeatures.trim(),
          ingredients: ingredients.trim(),
          certifications: certifications.trim(),
          competitorUrl: competitorUrl.trim(),
          wholesaleUrl: wholesaleUrl.trim(),
          sellerTrustEvidence: sellerTrustEvidence.trim(),
        },
      };
      sessionStorage.setItem(DRAFT_SESSION_KEY, JSON.stringify(draftSession));
      // result 리다이렉트용 — 미승인 세션 표시
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          ...payload,
          imageUrls,
          generated: {
            sections: draftResult.sections,
            headlines: draftResult.headlines ?? [],
            description: draftResult.description ?? "",
            features: draftResult.features ?? [],
            howToUse: draftResult.howToUse ?? "",
            caution: draftResult.caution ?? "",
            imageAnalysis: draftResult.imageAnalysis,
            theme: draftResult.theme,
            mfdsReviewed: draftResult.mfdsReviewed,
            replacements: draftResult.replacements,
            photoCostBreakdown: draftResult.photoCostBreakdown,
            referenceAnalysis: draftResult.referenceAnalysis,
            reviewInsights: draftResult.reviewInsights,
            planningDocText: draftResult.planningDocText,
            draftToken: draftResult.draftToken,
          },
          draftApproved: false,
        }),
      );
      router.push("/create/draft");
    } catch (err) {
      setOverlaySnapComplete(false);
      setError(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
      setLoadingStage("idle");
    }
  }

  const loadingLabel =
    loadingStage === "uploading"
      ? "사진 업로드 중..."
      : loadingStage === "generating"
        ? "기획 초안 생성 중..."
        : "AI 상세페이지 생성하기";

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-registration-red focus:ring-2 focus:ring-registration-red/20";
  const labelClass = "block text-sm font-medium text-ink/80";
  const sectionClass = "rounded-2xl border border-line bg-paper p-6 shadow-sm sm:p-8";

  return (
    <div className="min-h-full bg-paper text-ink">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-line/40 to-paper" />

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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-line bg-paper p-1">
              <button
                type="button"
                onClick={() => setCompositionLength("short")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  compositionLength === "short"
                    ? "bg-ink text-paper"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                짧은 구성
              </button>
              <button
                type="button"
                onClick={() => setCompositionLength("long")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  compositionLength === "long"
                    ? "bg-ink text-paper"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                긴 구성
              </button>
            </div>
            <span className="text-sm text-ink/50">
              {sectionCountHint != null
                ? `약 ${sectionCountHint}개 섹션`
                : "카테고리 선택 후 섹션 수 표시"}
            </span>
          </div>
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
              JPG, PNG · 최소 {MIN_IMAGES}장 · 최대 {MAX_IMAGES}장 · AI가 서로 다른 사진 최소{" "}
              {MIN_IMAGES}장을 상세페이지에 사용합니다
            </p>
            <p
              className="mt-2 text-sm leading-relaxed text-ink/70"
              data-testid="photo-minimal-input-hint"
            >
              사진과 상품명만으로도 AI가 상세페이지를 생성합니다. 아래 선택 항목을 채우면 더
              정확해집니다.
            </p>

            <div
              className="mt-3 rounded-xl border border-line bg-line/15 px-4 py-3"
              data-testid="upload-role-guide"
            >
              <p className="text-xs font-semibold text-ink">{uploadRoleGuide.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink/65">{uploadRoleGuide.summary}</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {uploadRoleGuide.roles
                  .filter((r) => r.role !== "other")
                  .map((r) => (
                    <li key={r.role} className="text-[11px] text-ink/70">
                      <span className="font-semibold text-ink">{r.label}</span>
                      <span className="text-ink/45"> — {r.hint}</span>
                    </li>
                  ))}
              </ul>
            </div>

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
                  <div key={src} className="space-y-1.5">
                    <div className="group relative aspect-square overflow-hidden rounded-lg border border-line">
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
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-ink/75 px-1.5 py-0.5 font-mono text-[10px] text-paper">
                        {index + 1}
                      </span>
                    </div>
                    <label className="block">
                      <span className="sr-only">사진 {index + 1} 역할</span>
                      <select
                        data-testid={`image-role-${index}`}
                        value={imageRoles[index] ?? defaultRoleForIndex(index)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRoleAt(index, e.target.value as ProductImageRole)}
                        className="h-8 w-full rounded-md border border-line bg-paper px-1.5 text-[11px] text-ink"
                      >
                        {uploadRoleGuide.roles.map((r) => (
                          <option key={r.role} value={r.role}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
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
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!autofillReady || autofillLoading}
                    onClick={handleAutofillDraft}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink/80 hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {autofillLoading ? "AI 자동입력 중…" : "AI 자동입력"}
                  </button>
                  {!autofillReady ? (
                    <span className="text-xs text-ink/40">카테고리 + 상품명 5자 이상</span>
                  ) : images.length > 0 || (restoredUploads?.length ?? 0) > 0 ? (
                    <span className="text-xs text-ink/45">업로드한 사진도 함께 분석합니다</span>
                  ) : null}
                  {autofillError ? (
                    <span className="text-xs text-registration-red">{autofillError}</span>
                  ) : null}
                </div>
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
                    onChange={(e) => {
                      setTargetCustomer(e.target.value);
                      setAutofillNotice(false);
                      setAutofillTargetHint(null);
                    }}
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
              {autofillNotice ? (
                <p className="rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink/70">
                  AI가 작성한 초안입니다. 실제와 다르면 꼭 수정해 주세요.
                  {autofillTargetHint ? (
                    <span className="mt-1 block text-ink/55">
                      타겟 고객 제안: {autofillTargetHint} (목록에서 가장 가까운 항목을 선택해 주세요)
                    </span>
                  ) : null}
                </p>
              ) : null}
              <div>
                <label htmlFor="keyFeatures" className={labelClass}>
                  핵심 특징 / 강조 포인트
                </label>
                <textarea
                  id="keyFeatures"
                  rows={4}
                  value={keyFeatures}
                  onChange={(e) => {
                    setKeyFeatures(e.target.value);
                    setAutofillNotice(false);
                  }}
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
                <label htmlFor="lifestyleImage" className={labelClass}>
                  인물/라이프스타일 사진 (선택)
                </label>
                <p className="mt-1 text-xs text-ink/40">
                  실제 사용 장면 사진이 있으면 업로드해 주세요. 제품 사진을 자연스럽게 합성해 드립니다.
                  (AI가 가짜 인물을 만들지는 않습니다)
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => lifestyleInputRef.current?.click()}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink/80 hover:bg-line/30"
                  >
                    {lifestyleImage ? "다른 이미지 선택" : "이미지 선택"}
                  </button>
                  {lifestyleImage && (
                    <button
                      type="button"
                      onClick={() => {
                        if (lifestylePreview) URL.revokeObjectURL(lifestylePreview);
                        setLifestyleImage(null);
                        setLifestylePreview(null);
                      }}
                      className="text-sm text-ink/50 hover:text-registration-red"
                    >
                      제거
                    </button>
                  )}
                  {lifestyleImage && (
                    <span className="text-xs text-ink/50">{lifestyleImage.name}</span>
                  )}
                </div>
                {lifestylePreview && (
                  <div className="mt-3 h-24 w-24 overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lifestylePreview}
                      alt="라이프스타일 미리보기"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <input
                  id="lifestyleImage"
                  ref={lifestyleInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    handleLifestyleImage(e.target.files?.[0] ?? null);
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

              <div>
                <label htmlFor="customGif" className={labelClass}>
                  직접 만든 GIF (선택)
                </label>
                <p className="mt-1 text-xs text-ink/40">
                  동영상처럼 움직이는 사용 장면을 넣으면 체류시간이 올라갑니다. 이미 가지고
                  계신 GIF를 그대로 상세페이지에 삽입합니다(AI 재생성 없음, 별도 비용 없음).
                  상단 대표 이미지 바로 아래에 들어갑니다.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => customGifInputRef.current?.click()}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink/80 hover:bg-line/30"
                  >
                    {customGif ? "다른 GIF 선택" : "GIF 선택"}
                  </button>
                  {customGif && (
                    <button
                      type="button"
                      onClick={() => {
                        if (customGifPreview) URL.revokeObjectURL(customGifPreview);
                        setCustomGif(null);
                        setCustomGifPreview(null);
                      }}
                      className="text-sm text-ink/50 hover:text-registration-red"
                    >
                      제거
                    </button>
                  )}
                  {customGif && (
                    <span className="text-xs text-ink/50">{customGif.name}</span>
                  )}
                </div>
                {customGifPreview && (
                  <div className="mt-3 h-24 w-24 overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={customGifPreview} alt="GIF 미리보기" className="h-full w-full object-cover" />
                  </div>
                )}
                <input
                  id="customGif"
                  ref={customGifInputRef}
                  type="file"
                  accept="image/gif"
                  className="hidden"
                  onChange={(e) => {
                    handleCustomGif(e.target.files?.[0] ?? null);
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
                <label htmlFor="sellerTrustEvidence" className={labelClass}>
                  판매·랭킹 근거 (선택)
                </label>
                <input
                  id="sellerTrustEvidence"
                  type="text"
                  value={sellerTrustEvidence}
                  onChange={(e) => setSellerTrustEvidence(e.target.value)}
                  placeholder='예: "올리브영 판매 1위", "누적 판매 3만개"'
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-ink/40">
                  직접 보유한 근거만 입력하세요. 비워 두면 표시하지 않으며, AI가 리뷰 수·조회수 등을
                  만들지 않습니다.
                </p>
              </div>

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

      {loadingStage !== "idle" && (
        <GeneratingOverlay
          stage={loadingStage}
          category={category}
          productName={productName}
          length={compositionLength}
          snapComplete={overlaySnapComplete}
        />
      )}
    </div>
  );
}

export { SESSION_KEY };
