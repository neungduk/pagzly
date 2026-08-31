"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import BlogPostPanel from "@/components/BlogPostPanel";
import InstagramFeedPanel from "@/components/InstagramFeedPanel";
import { createClient } from "@/lib/supabase";
import type { DetailSection } from "@/lib/types/generate";

type SocialResult = {
  productId: string;
  productName: string;
  category: string;
  imageUrls: string[];
  imagePaths?: string[];
  sections: DetailSection[];
  description: string;
  features: string[];
  howToUse: string;
  caution: string;
};

function SocialResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SocialResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"instagram" | "blog">("instagram");

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) {
      router.replace("/create/social");
      return;
    }

    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: row, error: dbError } = await supabase
        .from("products")
        .select(
          "id, kind, category, product_name, image_urls, description, features, how_to_use, caution, sections",
        )
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (dbError || !row || row.kind !== "social_mini") {
        setError("미니 생성 결과를 불러오지 못했습니다.");
        return;
      }

      setData({
        productId: row.id,
        productName: row.product_name,
        category: row.category,
        imageUrls: row.image_urls ?? [],
        sections: (row.sections as DetailSection[]) ?? [],
        description: row.description ?? "",
        features: (row.features as string[]) ?? [],
        howToUse: row.how_to_use ?? "",
        caution: row.caution ?? "",
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/create/social" className="mt-6 inline-block text-sm font-semibold text-ink underline">
          다시 만들기
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink/50">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link href="/create/social" className="text-sm text-ink/50 hover:text-ink">
        ← 새 미니 생성
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">
            Social mini result
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">{data.productName}</h1>
          <p className="mt-1 text-sm text-ink/55">
            인스타 피드 PNG · 블로그/티스토리 복사용 — 상세페이지 다운로드 없음
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("instagram")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === "instagram" ? "bg-ink text-paper" : "border border-line text-ink/65"
            }`}
          >
            인스타 피드
          </button>
          <button
            type="button"
            onClick={() => setTab("blog")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === "blog" ? "bg-ink text-paper" : "border border-line text-ink/65"
            }`}
          >
            블로그 · 티스토리
          </button>
        </div>
      </div>

      {tab === "blog" && (
        <div className="mt-4 rounded-xl border border-mustard/40 bg-mustard/10 px-4 py-3 text-sm text-ink/75">
          티스토리 HTML 또는 <strong>일반 텍스트</strong>를 다운로드해 에디터에 붙여넣으세요.
          자동 업로드는 지원하지 않습니다.
        </div>
      )}

      <div className="mt-8">
        {tab === "instagram" ? (
          <div
            className="rounded-2xl border border-ink/20 bg-paper p-4 shadow-sm sm:p-6"
            data-testid="instagram-feed-workspace"
          >
            <InstagramFeedPanel
              variant="workspace"
              productName={data.productName}
              sections={data.sections}
              imageUrls={data.imageUrls}
            />
          </div>
        ) : (
          <div
            className="rounded-2xl border border-ink/20 bg-paper p-4 shadow-sm sm:p-6"
            data-testid="blog-post-workspace"
          >
            <BlogPostPanel
              variant="workspace"
              productName={data.productName}
              category={data.category}
              sections={data.sections}
              imageUrls={data.imageUrls}
              description={data.description}
              features={data.features}
              howToUse={data.howToUse}
              caution={data.caution}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SocialResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink/50">
          불러오는 중…
        </div>
      }
    >
      <SocialResultContent />
    </Suspense>
  );
}
