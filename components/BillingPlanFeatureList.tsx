import {
  PAGZLY_CORE_FEATURES,
  getPricingTier,
  type PricingTier,
} from "@/lib/cost/saas-pricing-config";

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-registration-red"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 8.5L6.5 12L13 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type BillingPlanFeatureListProps = {
  tier: PricingTier;
};

/** 구독 플랜 카드 하단 기능 체크리스트 */
export default function BillingPlanFeatureList({ tier }: BillingPlanFeatureListProps) {
  const tokenLine = `매월 ${tier.monthlyTokens.toLocaleString("ko-KR")}토큰 제공`;

  if (tier.id === "starter") {
    return (
      <ul className="space-y-2.5 text-sm text-ink/75" data-testid={`billing-tier-features-${tier.id}`}>
        {PAGZLY_CORE_FEATURES.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
        <li className="flex gap-2.5 font-semibold text-ink">
          <CheckIcon />
          <span>{tokenLine}</span>
        </li>
      </ul>
    );
  }

  const parentLabel = tier.inheritsFrom ? getPricingTier(tier.inheritsFrom).label : null;

  return (
    <ul className="space-y-2.5 text-sm text-ink/75" data-testid={`billing-tier-features-${tier.id}`}>
      {parentLabel ? (
        <li className="flex gap-2.5">
          <CheckIcon />
          <span>{parentLabel}의 모든 기능 포함</span>
        </li>
      ) : null}
      <li className="flex gap-2.5 font-semibold text-ink">
        <CheckIcon />
        <span>{tokenLine}</span>
      </li>
    </ul>
  );
}
