"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import PagzlyLogo from "@/components/PagzlyLogo";
import { createClient } from "@/lib/supabase";
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
const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const STORAGE_BUCKET = "images";
const SESSION_KEY = "pagzly-create-result";

type CreateProductFormProps = {
  userId: string;
};

type UploadedImage = {
  url: string;
  path: string;
};

type LoadingStage = "idle" | "uploading" | "enhancing" | "generating";

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
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const loading = loadingStage !== "idle";

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

  async function enhanceImages(
    uploaded: UploadedImage[],
    productCategory: string,
  ): Promise<UploadedImage[]> {
    const results = await Promise.all(
      uploaded.map(async (item) => {
        try {
          const response = await fetch("/api/enhance-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: item.url,
              storagePath: item.path,
              category: productCategory,
            }),
          });

          const result = (await response.json()) as {
            enhancedUrl?: string;
            enhancedPath?: string;
            error?: string;
          };

          if (!response.ok || !result.enhancedUrl || !result.enhancedPath) {
            console.warn(
              "[enhance-image] 보정 실패, 원본 사용:",
              result.error ?? item.path,
            );
            return item;
          }

          return { url: result.enhancedUrl, path: result.enhancedPath };
        } catch (err) {
          console.warn("[enhance-image] 보정 실패, 원본 사용:", item.path, err);
          return item;
        }
      }),
    );

    return results;
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
      setLoadingStage("enhancing");
      const enhanced = await enhanceImages(uploaded, category);
      const imageUrls = enhanced.map((item) => item.url);
      const imagePaths = enhanced.map((item) => item.path);

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
        createdAt: new Date().toISOString(),
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

      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          ...payload,
          generated: generateResult as GenerateResponse,
        }),
      );
      router.push("/create/result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
      setLoadingStage("idle");
    }
  }

  const loadingLabel =
    loadingStage === "uploading"
      ? "사진 업로드 중..."
      : loadingStage === "enhancing"
        ? "사진 보정 중..."
        : loadingStage === "generating"
          ? "AI 상세페이지 생성 중..."
          : "AI 상세페이지 생성하기";

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20";
  const labelClass = "block text-sm font-medium text-gray-700";
  const sectionClass = "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8";

  return (
    <div className="min-h-full bg-white text-gray-900">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#6366f1]/5 to-white" />

      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/">
            <PagzlyLogo className="h-8 w-auto" />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            홈
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 pb-16">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#6366f1]">상세페이지 생성</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            상품 정보 입력
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            AI가 상세페이지를 만들 수 있도록 상품 정보를 입력해 주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. 카테고리 */}
          <section className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900">카테고리</h2>
            <p className="mt-1 text-sm text-gray-500">상품 카테고리를 선택해 주세요.</p>
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
            <h2 className="text-lg font-semibold text-gray-900">상품 사진</h2>
            <p className="mt-1 text-sm text-gray-500">
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
                  ? "border-[#6366f1] bg-[#6366f1]/5"
                  : "border-gray-200 hover:border-[#6366f1]/40 hover:bg-gray-50"
              }`}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#6366f1]/10 text-[#6366f1]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-700">
                클릭하거나 파일을 드래그하여 업로드
              </p>
              <p className="mt-1 text-xs text-gray-400">
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
                  <div key={src} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-100">
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
            <h2 className="text-lg font-semibold text-gray-900">상품 기본 정보</h2>
            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="productName" className={labelClass}>
                  상품명 <span className="text-[#6366f1]">*</span>
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
                    판매 가격 <span className="text-[#6366f1]">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">₩</span>
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
            <h2 className="text-lg font-semibold text-gray-900">상품 특징</h2>
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

          {/* 5. 추가 옵션 */}
          <section className={sectionClass}>
            <h2 className="text-lg font-semibold text-gray-900">추가 옵션</h2>
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
                <p className="mt-1.5 text-xs text-gray-400">AI가 USP를 분석합니다</p>
              </div>

              <div>
                <label htmlFor="wholesaleUrl" className={labelClass}>
                  1688 / 도매꾹 URL
                </label>
                <input
                  id="wholesaleUrl"
                  type="url"
                  value={wholesaleUrl}
                  onChange={(e) => setWholesaleUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-gray-400">위탁 셀러용 원본 상품 링크</p>
              </div>
            </div>
          </section>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-[#6366f1] text-base font-semibold text-white shadow-lg shadow-[#6366f1]/25 transition-all hover:bg-[#5558e3] hover:shadow-xl hover:shadow-[#6366f1]/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? loadingLabel : "AI 상세페이지 생성하기"}
          </button>
        </form>
      </main>
    </div>
  );
}

export { SESSION_KEY };
