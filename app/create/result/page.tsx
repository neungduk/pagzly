"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PagzlyLogo from "@/components/PagzlyLogo";
import { SESSION_KEY } from "@/components/CreateProductForm";
import type { GeneratedCopy } from "@/lib/types/generate";

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
  generated?: GeneratedCopy & { imageAnalysis?: string };
};

export default function CreateResultPage() {
  const router = useRouter();
  const [data, setData] = useState<ProductResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      router.replace("/create");
      return;
    }

    try {
      setData(JSON.parse(raw) as ProductResult);
    } catch {
      router.replace("/create");
    }
  }, [router]);

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
          <p className="text-sm font-medium text-[#6366f1]">생성 완료</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {data.productName}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            AI가 분석한 상품 정보를 바탕으로 상세페이지 카피를 생성했습니다.
          </p>

          <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <InfoItem label="카테고리" value={data.category} />
            <InfoItem label="판매 가격" value={`₩${data.price.toLocaleString()}`} />
            {data.brandName && <InfoItem label="브랜드" value={data.brandName} />}
            {data.targetCustomer && (
              <InfoItem label="타겟 고객" value={data.targetCustomer} />
            )}
          </div>

          {data.imageUrls.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700">업로드된 사진</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {data.imageUrls.map((url) => (
                  <div
                    key={url}
                    className="aspect-square overflow-hidden rounded-lg border border-gray-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="상품 사진" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {generated && (
          <>
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900">헤드라인</h2>
              <div className="mt-4 space-y-3">
                {generated.headlines.map((headline, index) => (
                  <div
                    key={headline}
                    className="rounded-lg bg-[#6366f1]/5 px-4 py-3 text-sm font-medium text-[#6366f1]"
                  >
                    {index + 1}. {headline}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900">상품 설명</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {generated.description}
              </p>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900">핵심 특징</h2>
              <ul className="mt-4 space-y-2">
                {generated.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#6366f1]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid gap-6 sm:grid-cols-2">
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">사용 방법</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {generated.howToUse}
                </p>
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">주의사항</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {generated.caution}
                </p>
              </section>
            </div>
          </>
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
