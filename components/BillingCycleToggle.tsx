"use client";

import type { BillingCycle } from "@/lib/cost/saas-pricing-config";

type BillingCycleToggleProps = {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
};

export default function BillingCycleToggle({ value, onChange }: BillingCycleToggleProps) {
  return (
    <div className="mt-8 flex flex-col items-center gap-2" data-testid="billing-cycle-toggle">
      <div className="inline-flex rounded-full border border-line bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            value === "monthly" ? "bg-ink text-white" : "text-ink/60 hover:text-ink"
          }`}
          data-testid="billing-cycle-monthly"
        >
          월별 결제
        </button>
        <button
          type="button"
          onClick={() => onChange("annual")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            value === "annual" ? "bg-ink text-white" : "text-ink/60 hover:text-ink"
          }`}
          data-testid="billing-cycle-annual"
        >
          연간 결제
        </button>
      </div>
      {value === "annual" ? (
        <p
          className="text-xs font-medium text-registration-red"
          data-testid="billing-cycle-annual-badge"
        >
          2개월 무료 혜택 적용 중
        </p>
      ) : null}
    </div>
  );
}
