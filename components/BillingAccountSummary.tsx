import { getPricingTier, type PricingTierId } from "@/lib/cost/saas-pricing-config";

type BillingAccountSummaryProps = {
  balance: number;
  activeTier: PricingTierId | null;
};

/** 구독·팩 결제 페이지 상단 — 보유 토큰·현재 요금제 카드 */
export default function BillingAccountSummary({
  balance,
  activeTier,
}: BillingAccountSummaryProps) {
  const tierLabel = activeTier ? getPricingTier(activeTier).label : "구독 없음";

  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-line bg-white px-5 py-4 text-center shadow-sm">
      <p className="text-sm text-ink/70">
        현재 보유 토큰:{" "}
        <strong className="text-ink">{balance.toLocaleString("ko-KR")}개</strong>
        {" · "}
        현재 요금제: <strong className="text-ink">{tierLabel}</strong>
      </p>
    </div>
  );
}
