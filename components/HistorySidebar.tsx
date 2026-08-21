"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SESSION_KEY } from "@/components/CreateProductForm";
import { createClient } from "@/lib/supabase";
import type { DetailSection, GenerateResponse } from "@/lib/types/generate";

type HistoryRow = {
  id: string;
  category: string;
  product_name: string;
  brand_name: string | null;
  price: number | string;
  target_customer: string | null;
  key_features: string | null;
  ingredients: string | null;
  certifications: string | null;
  competitor_url: string | null;
  wholesale_url: string | null;
  image_urls: string[] | null;
  headlines: string[] | null;
  description: string | null;
  features: string[] | null;
  how_to_use: string | null;
  caution: string | null;
  image_analysis: string | null;
  mfds_reviewed: boolean | null;
  replacements: GenerateResponse["replacements"];
  sections: DetailSection[] | null;
  created_at: string;
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return "방금 전";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatPrice(price: number | string): string {
  const n = Number(price);
  if (!Number.isFinite(n)) return String(price);
  return `₩${n.toLocaleString("ko-KR")}`;
}

function rowToSession(row: HistoryRow) {
  return {
    category: row.category,
    imageUrls: row.image_urls ?? [],
    productName: row.product_name,
    brandName: row.brand_name ?? null,
    price: Number(row.price),
    targetCustomer: row.target_customer ?? null,
    keyFeatures: row.key_features ?? null,
    ingredients: row.ingredients,
    certifications: row.certifications,
    competitorUrl: row.competitor_url ?? null,
    wholesaleUrl: row.wholesale_url ?? null,
    createdAt: row.created_at,
    generated: {
      sections: row.sections ?? [],
      headlines: row.headlines ?? [],
      description: row.description ?? "",
      features: row.features ?? [],
      howToUse: row.how_to_use ?? "",
      caution: row.caution ?? "",
      imageAnalysis: row.image_analysis ?? "",
      mfdsReviewed: row.mfds_reviewed ?? false,
      replacements: row.replacements ?? [],
      productId: row.id,
      theme: null,
      imageUrls: row.image_urls ?? [],
    },
  };
}

type HistorySidebarProps = {
  userId: string;
};

/**
 * 홈 화면 가장자리 호버(·탭) 작업내역 패널.
 * 데스크톱: 탭 hover → 패널 슬라이드, leave 지연으로 패널 이동 허용.
 * 모바일: 탭 클릭으로 열고 닫기.
 */
export default function HistorySidebar({ userId }: HistorySidebarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 280);
  }, [clearCloseTimer]);

  const openPanel = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data, error: qErr } = await supabase
        .from("products")
        .select(
          "id, category, product_name, brand_name, price, target_customer, key_features, ingredients, certifications, competitor_url, wholesale_url, image_urls, headlines, description, features, how_to_use, caution, image_analysis, mfds_reviewed, replacements, sections, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (cancelled) return;
      if (qErr) {
        console.error("[HistorySidebar]", qErr);
        setError("작업 내역을 불러오지 못했습니다.");
        setRows([]);
        return;
      }
      setRows((data ?? []) as HistoryRow[]);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleItemClick(row: HistoryRow) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(rowToSession(row)));
    setOpen(false);
    router.push("/create/result");
  }

  return (
    <div className="fixed inset-y-0 right-0 z-[60]">
      {/* 패널 */}
      <div
        ref={panelRef}
        onMouseEnter={openPanel}
        onMouseLeave={scheduleClose}
        className={`absolute inset-y-0 right-0 flex h-full w-[min(100vw,20rem)] flex-col border-l border-line bg-paper shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-registration-red">
              History
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-ink">작업 내역</h2>
          </div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-ink/50 hover:bg-line/40 hover:text-ink md:hidden"
            onClick={() => setOpen(false)}
          >
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rows === null && (
            <p className="px-4 py-8 text-center text-sm text-ink/45">불러오는 중…</p>
          )}
          {error && <p className="px-4 py-6 text-center text-sm text-red-600">{error}</p>}
          {rows && rows.length === 0 && !error && (
            <p className="px-4 py-10 text-center text-sm text-ink/50">
              아직 만든 상세페이지가 없어요
            </p>
          )}
          {rows && rows.length > 0 && (
            <ul className="divide-y divide-line">
              {rows.map((row) => {
                const thumb = row.image_urls?.[0];
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(row)}
                      className="flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-line/25"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-line/30">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-[10px] text-ink/35">
                            No img
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{row.product_name}</p>
                        <p className="mt-0.5 truncate text-xs text-ink/50">{row.category}</p>
                        <p className="mt-1 font-mono text-[11px] text-ink/45">
                          {formatPrice(row.price)} · {formatRelativeTime(row.created_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* 가장자리 탭 — 호버(데스크탑) + 클릭(모바일) */}
      <button
        type="button"
        aria-expanded={open}
        aria-label="작업 내역 열기"
        onMouseEnter={openPanel}
        onFocus={openPanel}
        onMouseLeave={scheduleClose}
        onClick={() => {
          clearCloseTimer();
          setOpen((v) => !v);
        }}
        className={`absolute top-1/2 right-0 z-10 flex h-28 w-7 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-l-lg border border-r-0 border-line bg-paper text-ink/55 shadow-sm transition-opacity transition-colors hover:bg-line/30 hover:text-ink ${
          open ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
        <span
          className="text-[10px] font-medium tracking-wide"
          style={{ writingMode: "vertical-rl" }}
        >
          작업내역
        </span>
      </button>
    </div>
  );
}
