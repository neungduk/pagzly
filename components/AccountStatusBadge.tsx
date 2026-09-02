"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BillingMe = {
  balance: number;
  activeTierLabel: string | null;
};

export type AccountStatusUser = {
  email?: string | null;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  } | null;
};

type AccountStatusBadgeProps = {
  user: AccountStatusUser;
};

function formatTokenPill(balance: number): string {
  if (balance >= 10000) {
    const k = balance / 1000;
    return k >= 100 ? `${Math.round(k)}K` : `${k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return balance.toLocaleString("ko-KR");
}

function resolveDisplayName(user: AccountStatusUser): string {
  const meta = user.user_metadata;
  const fromMeta = meta?.full_name?.trim() || meta?.name?.trim();
  if (fromMeta) return fromMeta;
  const email = user.email?.trim();
  if (email?.includes("@")) return email.split("@")[0] ?? email;
  return email ?? "사용자";
}

function SparkleIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-violet-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.2 4.2L17 7l-4.2 1.2L12 12l-1.2-3.8L7 7l3.8-1.2L12 2zm7 9l.9 3.1L23 15l-3.1.9L19 19l-.9-3.1L15 15l3.1-.9L19 11zm-14 0l.9 3.1L9 15l-3.1.9L5 19l-.9-3.1L1 15l3.1-.9L5 11z" />
    </svg>
  );
}

export default function AccountStatusBadge({ user }: AccountStatusBadgeProps) {
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

  const displayName = resolveDisplayName(user);
  const tierLabel = data.activeTierLabel ?? "무료";
  const avatarUrl = user.user_metadata?.avatar_url?.trim();

  return (
    <div
      className="flex items-center gap-2 sm:gap-3"
      data-testid="account-status-badge"
    >
      <Link
        href="/billing/packs"
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-line/20 sm:px-3"
        title={`토큰 ${data.balance.toLocaleString("ko-KR")}개 — 충전`}
        data-testid="account-token-pill"
      >
        <SparkleIcon />
        <span>{formatTokenPill(data.balance)}</span>
      </Link>

      <Link
        href="/billing/subscribe"
        className="inline-flex max-w-[9rem] items-center gap-2 rounded-full border border-line/80 bg-white py-1 pl-1 pr-2.5 shadow-sm transition-colors hover:bg-line/15 sm:max-w-[11rem] sm:pr-3"
        title={`${displayName} · ${tierLabel}`}
        data-testid="account-status-chip"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 rounded-full bg-ink/75" aria-hidden />
        )}
        <span className="min-w-0 text-left leading-tight">
          <span className="block truncate text-xs font-semibold text-ink">{displayName}</span>
          <span className="block truncate text-[10px] font-medium text-ink/45">{tierLabel}</span>
        </span>
      </Link>
    </div>
  );
}
