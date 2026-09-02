type BillingRecommendedBadgeProps = {
  label?: string;
};

/** 팩·구독 카드 우측 상단 강조 배지 */
export default function BillingRecommendedBadge({ label = "추천" }: BillingRecommendedBadgeProps) {
  return (
    <span
      className="absolute right-4 top-4 rounded-full bg-registration-red px-2.5 py-0.5 text-[10px] font-semibold text-white"
      data-testid="billing-recommended-badge"
    >
      {label}
    </span>
  );
}
