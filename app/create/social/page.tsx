"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import GeneratingOverlay, { type GeneratingStage, SNAP_HOLD_MS } from "@/components/GeneratingOverlay";
import { createClient } from "@/lib/supabase";
import {
  SOCIAL_MINI_MAX_PHOTOS,
  SOCIAL_MINI_MIN_PHOTOS,
  TOKEN_COST_SOCIAL_MINI,
} from "@/lib/cost/saas-pricing-config";
import { productImageProtectedUntil } from "@/lib/product-image-protection";

const STORAGE_BUCKET = "images";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const CATEGORIES = [
  "의류/패션",
  "화장품/뷰티",
  "식품/건강기능식품",
  "전자제품",
  "생활용품",
  "반려동물",
  "기타",
] as const;

type UploadedImage = { url: string; path: string };
type LoadingStage = GeneratingStage | "idle";

export default function CreateSocialPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [productName, setProductName] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [category, setCategory] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const [overlaySnap, setOverlaySnap] = useState(false);

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) router.replace("/login");
        else setUserId(data.user.id);
      });
  }, [router]);

  const addImages = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files).filter((f) => ALLOWED_TYPES.includes(f.type));
    setImages((prev) => {
      const merged = [...prev, ...incoming].slice(0, SOCIAL_MINI_MAX_PHOTOS);
      setPreviews(merged.map((f) => URL.createObjectURL(f)));
      return merged;
    });
    setError(null);
  }, []);

  async function uploadImages(files: File[], uid: string): Promise<UploadedImage[]> {
    const supabase = createClient();
    const uploaded: UploadedImage[] = [];
    const uploadedAt = new Date().toISOString();

    for (const file of files) {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${uid}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw new Error(`이미지 업로드 실패: ${uploadError.message}`);

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

      const { error: dbError } = await supabase.from("product_images").insert({
        user_id: uid,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!userId) {
      setError("로그인이 필요합니다.");
      return;
    }

    if (!productName.trim()) {
      setError("상품명을 입력해 주세요.");
      return;
    }

    if (images.length < SOCIAL_MINI_MIN_PHOTOS) {
      setError(`사진을 최소 ${SOCIAL_MINI_MIN_PHOTOS}장 이상 업로드해 주세요.`);
      return;
    }

    setLoadingStage("generating");
    setOverlaySnap(false);

    try {
      const uploaded = await uploadImages(images, userId);

      const res = await fetch("/api/generate-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          category: category || "기타",
          keyFeatures: keyFeatures.trim() || null,
          imageUrls: uploaded.map((u) => u.url),
          imagePaths: uploaded.map((u) => u.path),
        }),
      });

      const json = (await res.json()) as {
        productId?: string;
        error?: string;
        balance?: number;
        required?: number;
      };

      if (!res.ok) {
        if (res.status === 402 && json.error === "insufficient_credits") {
          const bal = json.balance ?? 0;
          const req = json.required ?? TOKEN_COST_SOCIAL_MINI;
          throw new Error(
            `토큰이 부족합니다 (필요 ${req.toLocaleString("ko-KR")} / 보유 ${bal.toLocaleString("ko-KR")})`,
          );
        }
        throw new Error(json.error ?? "생성에 실패했습니다.");
      }

      if (!json.productId) throw new Error("생성 결과 ID가 없습니다.");

      setOverlaySnap(true);
      await new Promise((r) => setTimeout(r, SNAP_HOLD_MS));
      router.push(`/create/social/result?id=${encodeURIComponent(json.productId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 중 오류가 발생했습니다.");
      setLoadingStage("idle");
      setOverlaySnap(false);
    }
  }

  return (
    <>
      {loadingStage !== "idle" && (
        <GeneratingOverlay
          stage={loadingStage}
          category={category || "기타"}
          productName={productName || "상품"}
          snapComplete={overlaySnap}
        />
      )}

      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <Link href="/create" className="text-sm text-ink/50 hover:text-ink">
          ← 만들기 선택
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-ink">인스타 · 블로그/티스토리 전용</h1>
        <p className="mt-2 text-sm text-ink/60">
          상세페이지 없이 SNS·블로그 콘텐츠만 만듭니다. 사진 {SOCIAL_MINI_MIN_PHOTOS}~
          {SOCIAL_MINI_MAX_PHOTOS}장 · 완성 1건 {TOKEN_COST_SOCIAL_MINI}토큰
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-6">
          <div>
            <label className="text-sm font-medium text-ink">상품 사진</label>
            <p className="mt-1 text-xs text-ink/50">
              최소 {SOCIAL_MINI_MIN_PHOTOS}장 · JPG/PNG
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addImages(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 w-full rounded-xl border border-dashed border-line px-4 py-8 text-sm text-ink/60 hover:bg-line/20"
            >
              {images.length > 0
                ? `${images.length}장 선택됨 — 추가/변경`
                : "사진 업로드 (5장 이상)"}
            </button>
            {previews.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {previews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg border border-line object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="productName" className="text-sm font-medium text-ink">
              상품명 <span className="text-registration-red">*</span>
            </label>
            <input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line px-3 py-2.5 text-sm"
              placeholder="예: 데일리 립틴트"
            />
          </div>

          <div>
            <label htmlFor="keyFeatures" className="text-sm font-medium text-ink">
              핵심 특징
            </label>
            <textarea
              id="keyFeatures"
              value={keyFeatures}
              onChange={(e) => setKeyFeatures(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-line px-3 py-2.5 text-sm"
              placeholder="강조하고 싶은 포인트를 쉼표로 구분해 입력"
            />
          </div>

          <div>
            <label htmlFor="category" className="text-sm font-medium text-ink">
              카테고리 <span className="text-xs text-ink/45">(선택 — 톤·검수에 참고)</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line px-3 py-2.5 text-sm"
            >
              <option value="">선택 안 함 (기타로 처리)</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loadingStage !== "idle"}
            className="w-full rounded-lg bg-registration-red px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loadingStage !== "idle" ? "생성 중…" : `미니 생성 (${TOKEN_COST_SOCIAL_MINI}토큰)`}
          </button>
        </form>
      </div>
    </>
  );
}
