import { getPricingTier, type PricingTierId } from "@/lib/cost/saas-pricing-config";

type BillingAccountSummaryProps = {
  balance: number;
  activeTier: PricingTierId | null;
};

/** 구독·팩 결제 페이지 상단 — 보유 토큰 / 현재 요금제 스탯 카드 */
export default function BillingAccountSummary({
  balance,
  activeTier,
}: BillingAccountSummaryProps) {
  const tierLabel = activeTier ? getPricingTier(activeTier).label : "구독 없음";

  return (
    <div
      className="mx-auto mt-8 max-w-2xl rounded-xl border border-line bg-white shadow-sm"
      data-testid="billing-account-summary"
    >
      <div className="grid grid-cols-2 divide-x divide-line">
        <div className="px-5 py-5 text-center sm:px-8">
          <p className="text-xs font-medium text-ink/50">보유 토큰</p>
          <p className="mt-1 tabular-nums text-3xl font-bold text-ink">
            {balance.toLocaleString("ko-KR")}
            <span className="ml-1 text-base font-medium text-ink/50">개</span>
          </p>
        </div>
        <div className="px-5 py-5 text-center sm:px-8">
          <p className="text-xs font-medium text-ink/50">현재 요금제</p>
          <p className="mt-1 text-2xl font-bold text-ink">{tierLabel}</p>
        </div>
      </div>
    </div>
  );
}
