"use client";

import { useState } from "react";

type BillingCycle = "monthly" | "annual";

/** 월별/연간 결제 토글 — 연간은 UI만, 클릭 시 준비 중 안내 */
export default function BillingCycleToggle() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [annualNotice, setAnnualNotice] = useState(false);

  function selectMonthly() {
    setCycle("monthly");
    setAnnualNotice(false);
  }

  function tryAnnual() {
    setAnnualNotice(true);
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3" data-testid="billing-cycle-toggle">
      <div className="inline-flex rounded-full border border-line bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={selectMonthly}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            cycle === "monthly"
              ? "bg-ink text-white"
              : "text-ink/60 hover:text-ink"
          }`}
          data-testid="billing-cycle-monthly"
        >
          월별 결제
        </button>
        <button
          type="button"
          onClick={tryAnnual}
          className="rounded-full px-5 py-2 text-sm font-medium text-ink/40"
          data-testid="billing-cycle-annual"
        >
          연간 결제
        </button>
      </div>
      {annualNotice ? (
        <p
          className="text-sm text-ink/60"
          data-testid="billing-cycle-annual-notice"
          role="status"
        >
          연간 결제는 준비 중입니다.
        </p>
      ) : null}
    </div>
  );
}
