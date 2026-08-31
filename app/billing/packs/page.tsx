"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BillingAccountSummary from "@/components/BillingAccountSummary";
import PagzlyLogo from "@/components/PagzlyLogo";
import { CREDIT_PACKS, getCreditPack, type PricingTierId } from "@/lib/cost/saas-pricing-config";
import { createClient } from "@/lib/supabase";

type TossPaymentsSdk = {
  payment: (options: { customerKey: string }) => {
    requestPayment: (params: {
      method: string;
      amount: { currency: string; value: number };
      orderId: string;
      orderName: string;
      successUrl: string;
      failUrl: string;
      customerName?: string;
      card?: {
        useEscrow?: boolean;
        flowMode?: string;
        useCardPoint?: boolean;
        useAppCardOnly?: boolean;
      };
    }) => Promise<void>;
  };
};

function getTossPayments(clientKey: string): TossPaymentsSdk {
  const tossPayments = (
    window as unknown as { TossPayments: (key: string) => TossPaymentsSdk }
  ).TossPayments(clientKey);
  return tossPayments;
}

export default function PacksPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [activeTier, setActiveTier] = useState<PricingTierId | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingPackId, setSubmittingPackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const [{ data: subscription }, { data: creditRow }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("tier_id, status")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("user_credits").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);

      if (subscription?.status === "active" && subscription.tier_id) {
        setActiveTier(subscription.tier_id as PricingTierId);
      }
      setBalance(creditRow?.balance ?? 0);

      setLoading(false);
    }

    void load();
  }, [router]);

  const handlePurchase = useCallback(
    async (packId: string) => {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      const pack = getCreditPack(packId);
      if (!userId || !pack) return;
      if (!clientKey) {
        setError("NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다.");
        return;
      }
      if (!(window as unknown as { TossPayments?: unknown }).TossPayments) {
        setError("토스페이먼츠 SDK를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setError(null);
      setSubmittingPackId(packId);

      try {
        const orderId = `${packId}_${userId}_${Date.now().toString(36)}${crypto.randomUUID().slice(0, 8)}`;
        const tossPayments = getTossPayments(clientKey);
        const payment = tossPayments.payment({ customerKey: userId });
        const origin = window.location.origin;
        const successUrl = `${origin}/billing/packs/success?pack=${packId}&orderId=${encodeURIComponent(orderId)}`;
        const failUrl = `${origin}/billing/packs/fail`;

        await payment.requestPayment({
          method: "CARD",
          amount: {
            currency: "KRW",
            value: pack.priceKrw,
          },
          orderId,
          orderName: `Pagzly ${pack.label}`,
          successUrl,
          failUrl,
          customerName: "Pagzly 고객",
          card: {
            useEscrow: false,
            flowMode: "DEFAULT",
            useCardPoint: false,
            useAppCardOnly: false,
          },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "결제창을 시작하지 못했습니다.";
        setError(message);
        setSubmittingPackId(null);
      }
    },
    [userId],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink">
        <p className="text-sm text-ink/60">불러오는 중…</p>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://js.tosspayments.com/v2/standard"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />

      <div className="flex min-h-screen flex-col bg-paper text-ink">
        <header className="border-b border-line px-6 py-5">
          <Link href="/">
            <PagzlyLogo className="h-8 w-auto" />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-3xl px-6 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold">토큰 팩 구매</h1>
            <p className="mt-3 text-sm text-ink/60">
              구독 없이도 추가 토큰을 바로 구매할 수 있습니다.
            </p>
          </div>

          <BillingAccountSummary balance={balance} activeTier={activeTier} />

          {error ? (
            <p className="mx-auto mt-6 max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {CREDIT_PACKS.map((pack) => {
              const isSubmitting = submittingPackId === pack.id;
              const perToken = Math.round(pack.priceKrw / pack.tokens);
              return (
                <div
                  key={pack.id}
                  className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-sm"
                >
                  <h2 className="text-xl font-bold">{pack.label}</h2>
                  <p className="mt-2 text-3xl font-bold">
                    {pack.priceKrw.toLocaleString("ko-KR")}
                    <span className="ml-1 text-base font-medium text-ink/60">원</span>
                  </p>
                  <p className="mt-4 text-sm text-ink/70">
                    <strong>{pack.tokens.toLocaleString("ko-KR")}토큰</strong> 즉시 지급
                  </p>
                  <p className="mt-1 text-xs text-ink/50">
                    토큰당 약 {perToken.toLocaleString("ko-KR")}원
                  </p>
                  <button
                    type="button"
                    disabled={!sdkReady || isSubmitting || submittingPackId !== null}
                    onClick={() => void handlePurchase(pack.id)}
                    className="mt-auto pt-8 w-full rounded-lg bg-registration-red px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "결제창 여는 중…" : "구매하기"}
                  </button>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}
