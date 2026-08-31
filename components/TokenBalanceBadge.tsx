"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BillingMe = {
  balance: number;
  activeTierLabel: string | null;
};

/**
 * 사이드바 하단 — 보유 토큰·요금제 한 줄 배지 (/billing/subscribe 링크).
 */
export default function TokenBalanceBadge() {
  const [data, setData] = useState<BillingMe | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/billing/me");
        if (!res.ok) return;
        const json = (await res.json()) as BillingMe;
        if (!cancelled) setData(json);
      } catch {
        /* 조용히 숨김 */
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const tierPart = data.activeTierLabel ?? "구독 없음";
  const label = `토큰 ${data.balance.toLocaleString("ko-KR")}개 · ${tierPart}`;

  return (
    <Link
      href="/billing/subscribe"
      className="mb-2 flex items-center gap-2 rounded-lg border border-line/80 bg-line/20 px-2 py-2 text-xs text-ink/70 transition-colors hover:bg-line/35 hover:text-ink"
      title={label}
    >
      <svg
        className="h-5 w-5 shrink-0 text-registration-red/80"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.172-.879-1.172-2.303 0-3.182.553-.44 1.278-.659 2.003-.659.725 0 1.45.22 2.003.659 1.172.879 1.172 2.303 0 3.182Z"
        />
      </svg>
      <span className="truncate opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
        {label}
      </span>
    </Link>
  );
}
