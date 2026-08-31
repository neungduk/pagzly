"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PagzlyLogo from "@/components/PagzlyLogo";

function SubscribeFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-registration-red">카드 등록이 완료되지 않았습니다</h1>
      {code ? (
        <p className="mt-3 text-xs text-ink/50">오류 코드: {code}</p>
      ) : null}
      <p className="mt-3 text-sm text-ink/70">
        {message ?? "결제가 취소되었거나 카드 인증에 실패했습니다."}
      </p>
      <Link
        href="/billing/subscribe"
        className="mt-8 inline-flex rounded-lg bg-registration-red px-5 py-3 text-sm font-semibold text-white"
      >
        다시 시도
      </Link>
    </div>
  );
}

export default function SubscribeFailPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="border-b border-line px-6 py-5">
        <Link href="/">
          <PagzlyLogo className="h-8 w-auto" />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-ink/60">불러오는 중…</p>
            </div>
          }
        >
          <SubscribeFailContent />
        </Suspense>
      </main>
    </div>
  );
}
