"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import PagzlyLogo from "@/components/PagzlyLogo";
import { getCreditPack } from "@/lib/cost/saas-pricing-config";

type PurchaseResult =
  | { status: "loading" }
  | { status: "success"; packId: string; balance: number }
  | { status: "error"; message: string };

function PackSuccessContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<PurchaseResult>({ status: "loading" });

  useEffect(() => {
    const packId = searchParams.get("pack");
    const orderId = searchParams.get("orderId");
    const paymentKey = searchParams.get("paymentKey");
    const amountRaw = searchParams.get("amount");

    if (!packId || !orderId || !paymentKey || amountRaw == null) {
      setResult({
        status: "error",
        message: "결제 인증 정보가 올바르지 않습니다. 다시 시도해 주세요.",
      });
      return;
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount)) {
      setResult({
        status: "error",
        message: "결제 금액 정보가 올바르지 않습니다.",
      });
      return;
    }

    let cancelled = false;

    async function completePurchase() {
      try {
        const res = await fetch("/api/billing/purchase-pack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId, orderId, paymentKey, amount }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          packId?: string;
          balance?: number;
          error?: string;
        };

        if (cancelled) return;

        if (!res.ok || !data.ok || !data.packId || data.balance == null) {
          const message =
            data.error === "already_processed"
              ? "이미 처리된 결제입니다."
              : data.error === "amount_mismatch"
                ? "결제 금액이 일치하지 않습니다."
                : "토큰 팩 구매 처리에 실패했습니다. 다시 시도해 주세요.";
          setResult({ status: "error", message });
          return;
        }

        setResult({
          status: "success",
          packId: data.packId,
          balance: data.balance,
        });
      } catch {
        if (!cancelled) {
          setResult({
            status: "error",
            message: "네트워크 오류가 발생했습니다. 다시 시도해 주세요.",
          });
        }
      }
    }

    void completePurchase();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (result.status === "loading") {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">구매 처리 중…</h1>
        <p className="mt-3 text-sm text-ink/60">
          결제 승인을 확인하고 있습니다. 창을 닫지 마세요.
        </p>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-registration-red">구매 실패</h1>
        <p className="mt-3 text-sm text-ink/70">{result.message}</p>
        <Link
          href="/billing/packs"
          className="mt-8 inline-flex rounded-lg bg-registration-red px-5 py-3 text-sm font-semibold text-white"
        >
          다시 시도
        </Link>
      </div>
    );
  }

  const pack = getCreditPack(result.packId);

  return (
    <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold">구매가 완료되었습니다</h1>
      <p className="mt-3 text-sm text-ink/70">
        <strong>{pack?.label ?? result.packId}</strong> 토큰이 지급되었습니다.
      </p>
      <p className="mt-2 text-sm text-ink/60">
        현재 토큰 잔액: <strong>{result.balance.toLocaleString("ko-KR")}</strong>
      </p>
      <Link
        href="/create"
        className="mt-8 inline-flex rounded-lg bg-registration-red px-5 py-3 text-sm font-semibold text-white"
      >
        상세페이지 만들기
      </Link>
    </div>
  );
}

export default function PackSuccessPage() {
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
          <PackSuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
