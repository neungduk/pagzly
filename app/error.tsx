"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * 425차 — 화면 오류 안내(기본 Next 오류 화면 대신). 오류 내용은 사용자에게 보이지 않고 콘솔에만 남긴다.
 * 생성·저장 중 오류는 각 화면의 토스트가 먼저 처리하며, 이 화면은 예상 못 한 렌더 오류의 마지막 방어선이다.
 */
export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app/error]", error.digest ?? "", error.message);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">문제가 생겼어요</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          잠시 후 다시 시도해 주세요. 작업 중이던 상세페이지는 작업 내역에서 다시 열 수 있습니다. 계속 반복되면 고객센터로 알려 주세요.
        </p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-6 text-sm font-semibold text-white">
          다시 시도
        </button>
        <Link href="/" className="inline-flex h-11 items-center justify-center rounded-lg border border-neutral-300 px-6 text-sm font-semibold">
          처음으로
        </Link>
      </div>
    </main>
  );
}
