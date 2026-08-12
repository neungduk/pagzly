"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import DetailSectionRenderer from "@/components/DetailSectionRenderer";
import PagzlyLogo from "@/components/PagzlyLogo";
import { SESSION_KEY } from "@/components/CreateProductForm";
import type { GenerateResponse } from "@/lib/types/generate";

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
  generated?: GenerateResponse;
};

export default function CreateResultPage() {
  const router = useRouter();
  const captureRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ProductResult | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      router.replace("/create");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ProductResult;
      setData(parsed);

      if (parsed.generated?.sections) {
        console.log("[create/result] sections count:", parsed.generated.sections.length);
        console.log(
          "[create/result] section types:",
          parsed.generated.sections.map((s) => s.type),
        );
        console.log("[create/result] sections:", parsed.generated.sections);
      }
    } catch {
      router.replace("/create");
    }
  }, [router]);

  async function handleDownload() {
    if (!captureRef.current || !data) return;

    setDownloading(true);
    try {
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
      <div className="flex min-h-full items-center justify-center bg-white text-gray-500">
        불러오는 중...
      </div>
    );
  }

  const { generated } = data;

  return (
    <div className="min-h-full bg-white text-gray-900">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#6366f1]/5 to-white" />

      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/">
            <PagzlyLogo className="h-8 w-auto" />
          </Link>
          <Link
            href="/create"
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            다시 입력
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10 pb-16">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-[#6366f1]">생성 완료</p>
            {generated?.mfdsReviewed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                ✅ 식약처 광고 기준 검수 완료
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {data.productName}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            AI가 상품 특성에 맞춰 {generated?.sections.length ?? 0}개 섹션으로
            상세페이지를 구성했습니다.
            {generated?.mfdsReviewed &&
              " 화장품/뷰티 카테고리 식약처 광고 기준이 적용되었습니다."}
          </p>

          {generated?.replacements && generated.replacements.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <p className="font-medium">자동 수정된 표현</p>
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
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#6366f1] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5558e3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? "다운로드 준비 중..." : "이미지로 다운로드"}
            </button>
          )}
        </div>

        {generated?.sections && generated.sections.length > 0 ? (
          <div ref={captureRef} className="space-y-6 bg-white p-2">
            <DetailSectionRenderer
              sections={generated.sections}
              imageUrls={data.imageUrls}
              category={data.category}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm">
            생성된 섹션이 없습니다. 상품을 다시 등록해 주세요.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/create"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            정보 수정
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[#6366f1] text-sm font-semibold text-white transition-colors hover:bg-[#5558e3]"
          >
            홈으로 이동
          </Link>
        </div>
      </main>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 font-medium text-gray-900">{value}</p>
    </div>
  );
}
