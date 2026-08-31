"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PagzlyLogo from "@/components/PagzlyLogo";
import {
  PRICING_TIERS,
  getPricingTier,
  type PricingTierId,
} from "@/lib/cost/saas-pricing-config";
import { createClient } from "@/lib/supabase";

declare global {
  interface Window {
    TossPayments: (clientKey: string) => {
      payment: (options: { customerKey: string }) => {
        requestBillingAuth: (params: {
          method: string;
          successUrl: string;
          failUrl: string;
          customerName?: string;
          customerEmail?: string;
        }) => Promise<void>;
      };
    };
  }
}

export default function SubscribePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingTier, setSubmittingTier] = useState<PricingTierId | null>(null);
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

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("tier_id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (subscription?.status === "active") {
        setActiveTier(subscription.tier_id);
      }

      setLoading(false);
    }

    void load();
  }, [router]);

  const handleSubscribe = useCallback(
    async (tierId: PricingTierId) => {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!userId) return;
      if (!clientKey) {
        setError("NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다.");
        return;
      }
      if (!window.TossPayments) {
        setError("토스페이먼츠 SDK를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setError(null);
      setSubmittingTier(tierId);

      try {
        const tossPayments = window.TossPayments(clientKey);
        const payment = tossPayments.payment({ customerKey: userId });
        const tier = getPricingTier(tierId);
        const origin = window.location.origin;
        const successUrl = `${origin}/billing/subscribe/success?tier=${tierId}`;
        const failUrl = `${origin}/billing/subscribe/fail`;

        await payment.requestBillingAuth({
          method: "CARD",
          successUrl,
          failUrl,
          customerName: `Pagzly ${tier.label}`,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "카드 등록을 시작하지 못했습니다.";
        setError(message);
        setSubmittingTier(null);
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

  if (activeTier) {
    const tier = getPricingTier(activeTier as PricingTierId);
    return (
      <div className="flex min-h-screen flex-col bg-paper text-ink">
        <header className="border-b border-line px-6 py-5">
          <Link href="/">
            <PagzlyLogo className="h-8 w-auto" />
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
          <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">이미 구독 중입니다</h1>
            <p className="mt-3 text-sm text-ink/70">
              현재 <strong>{tier.label}</strong> 플랜을 이용 중입니다.
            </p>
            <Link
              href="/create"
              className="mt-8 inline-flex rounded-lg bg-registration-red px-5 py-3 text-sm font-semibold text-white"
            >
              상세페이지 만들기
            </Link>
          </div>
        </main>
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

        <main className="mx-auto w-full max-w-5xl px-6 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold">구독 플랜 선택</h1>
            <p className="mt-3 text-sm text-ink/60">
              카드 등록 후 첫 결제가 즉시 진행되며, 월 크레딧이 지급됩니다.
            </p>
          </div>

          {error ? (
            <p className="mx-auto mt-6 max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PRICING_TIERS.map((tier) => {
              const isSubmitting = submittingTier === tier.id;
              return (
                <div
                  key={tier.id}
                  className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-sm"
                >
                  <h2 className="text-xl font-bold">{tier.label}</h2>
                  <p className="mt-2 text-3xl font-bold">
                    {tier.monthlyPriceKrw.toLocaleString("ko-KR")}
                    <span className="ml-1 text-base font-medium text-ink/60">원/월</span>
                  </p>
                  <p className="mt-4 text-sm text-ink/70">
                    매월 <strong>{tier.monthlyCredits}크레딧</strong> 지급
                  </p>
                  <button
                    type="button"
                    disabled={!sdkReady || isSubmitting || submittingTier !== null}
                    onClick={() => void handleSubscribe(tier.id)}
                    className="mt-auto pt-8 w-full rounded-lg bg-registration-red px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "결제창 여는 중…" : "구독하기"}
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
