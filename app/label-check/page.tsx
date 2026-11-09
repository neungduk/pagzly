"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { LabelCheckResult } from "@/lib/label-check/types";
import {
  DISCLAIMER_483,
  DISCLAIMER_PRINT_485,
  MAX_PDF_BYTES_483,
} from "@/lib/label-check/types";

const STATUS_KO: Record<string, string> = {
  possible: "위반 가능",
  attention: "확인 필요",
  unknown: "확인 불가",
  pass: "통과",
};

function todayKo(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function LabelCheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [productName, setProductName] = useState("");
  const [rinseOff, setRinseOff] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabelCheckResult | null>(null);
  const [checkedOn, setCheckedOn] = useState<string | null>(null);

  const onFile = useCallback((f: File | null) => {
    setResult(null);
    setCheckedOn(null);
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_PDF_BYTES_483) {
      setError("파일은 최대 10MB까지 가능합니다.");
      setFile(null);
      return;
    }
    setFile(f);
  }, []);

  const submit = async () => {
    if (!file) {
      setError("PDF를 선택하세요.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("rinseOff", String(rinseOff));
      fd.set("functional", String(functional));
      const res = await fetch("/api/label-check", { method: "POST", body: fd });
      const json = (await res.json()) as LabelCheckResult & { error?: string };
      if (!res.ok) {
        setError(json.error || "검수에 실패했습니다.");
        return;
      }
      setResult(json);
      setCheckedOn(todayKo());
    } catch {
      setError("네트워크 오류로 검수에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const printTitle = useMemo(() => {
    const n = productName.trim();
    return n || "제품명 미입력";
  }, [productName]);

  return (
    <main className="lc-page min-h-screen bg-[#F7F4EE] text-[#1B1B18]">
      <div className="lc-shell mx-auto w-full max-w-3xl px-4 py-10">
        <header className="mb-8 print:hidden">
          <p className="text-sm font-semibold tracking-wide text-[#6B5A2E]">
            <Link href="/" className="underline-offset-2 hover:underline">
              Pagzly
            </Link>
            {" · "}표시사항 사전 점검
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">화장품 표시사항 PDF 검수</h1>
          <p className="mt-3 rounded-lg border border-[#D9CBA8] bg-[#FFF9EB] px-3 py-2 text-sm leading-relaxed text-[#4A3F24]">
            {DISCLAIMER_483}
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-[#E5DCC8] bg-white p-5 shadow-sm print:hidden">
          <label className="block text-sm font-semibold">
            제품명 (선택 · 인쇄 상단에 표시)
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예: 모아리 수분 토너"
              className="mt-2 block w-full rounded-lg border border-[#E5DCC8] px-3 py-2 text-sm font-normal"
              maxLength={80}
            />
          </label>

          <label className="block text-sm font-semibold">
            PDF 업로드 (최대 10MB · 10쪽, 1개)
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="mt-2 block w-full text-sm font-normal"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file ? <p className="text-xs text-[#666]">선택됨 · {(file.size / 1024).toFixed(1)} KB</p> : null}

          <fieldset className="space-y-2 text-sm">
            <legend className="font-semibold">제품 유형</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="rinse" checked={!rinseOff} onChange={() => setRinseOff(false)} />
              안 씻어내는 제품
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="rinse" checked={rinseOff} onChange={() => setRinseOff(true)} />
              씻어내는 제품
            </label>
            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={functional}
                onChange={(e) => setFunctional(e.target.checked)}
              />
              기능성화장품
            </label>
          </fieldset>

          <button
            type="button"
            disabled={busy || !file}
            onClick={() => void submit()}
            className="rounded-full bg-[#1B1B18] px-5 py-2.5 text-sm font-semibold text-[#FAF8F3] disabled:opacity-40"
          >
            {busy ? "검수 중…" : "검수 시작"}
          </button>
          {error ? <p className="break-words text-sm text-[#9B1C1C]">{error}</p> : null}
        </section>

        {result ? (
          <section className="lc-print mt-8 space-y-5" id="label-check-print">
            <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
              <h2 className="text-xl font-bold">검수 결과</h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full border border-[#1B1B18] px-4 py-1.5 text-sm font-semibold"
              >
                인쇄/PDF로 저장
              </button>
            </div>

            <header className="lc-print-head border-b border-[#E5DCC8] pb-3">
              <p className="text-xs font-semibold tracking-wide text-[#6B5A2E]">Pagzly · 표시사항 사전 점검</p>
              <h2 className="mt-1 break-words text-2xl font-extrabold leading-tight">{printTitle}</h2>
              <p className="mt-1 text-sm text-[#555]">점검일 {checkedOn ?? todayKo()}</p>
            </header>

            {result.notice ? (
              <p className="break-words rounded-lg border border-[#D9CBA8] bg-[#FFF9EB] px-3 py-3 text-sm leading-relaxed text-[#4A3F24]">
                {result.notice}
              </p>
            ) : null}

            {!result.skipJudgment ? (
              <>
                <div className="lc-summary grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["위반 가능", result.summary.possible],
                      ["확인 필요", result.summary.attention],
                      ["확인 불가", result.summary.unknown],
                      ["통과", result.summary.pass],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-[#E5DCC8] bg-white px-3 py-2 text-center">
                      <div className="text-xs text-[#666]">{k}</div>
                      <div className="text-2xl font-extrabold tabular-nums">{v}</div>
                    </div>
                  ))}
                </div>

                <div className="lc-findings space-y-2">
                  <h3 className="text-sm font-bold">항목</h3>
                  {result.findings.map((f, i) => (
                    <article
                      key={`${f.label}-${i}`}
                      className="break-words rounded-lg border border-[#E5DCC8] bg-white px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-xs text-[#666]">{f.category}</span>
                        <span className="font-semibold">{f.label}</span>
                        <span className="font-semibold text-[#6B5A2E]">{STATUS_KO[f.status] ?? f.status}</span>
                      </div>
                      <p className="mt-1 text-[#333]">{f.found}</p>
                      <p className="mt-0.5 text-[#555]">{f.suggest}</p>
                    </article>
                  ))}
                </div>

                {result.manualItems.length ? (
                  <div className="rounded-lg border border-dashed border-[#CDBF9A] bg-[#FFFCF5] p-3 print:break-inside-avoid">
                    <h3 className="text-sm font-bold">수동 확인 필요</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#444]">
                      {result.manualItems.map((m, i) => (
                        <li key={`${m.label}-${i}`} className="break-words">
                          <span className="font-medium">
                            [{m.category}] {m.label}
                          </span>
                          — {m.suggest}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}

            <footer className="lc-print-foot border-t border-[#E5DCC8] pt-3 text-xs leading-relaxed text-[#555]">
              {DISCLAIMER_PRINT_485}
            </footer>
          </section>
        ) : null}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            background: white !important;
          }
          .lc-page {
            min-height: 0 !important;
            background: white !important;
          }
          .lc-shell {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print\\:hidden,
          .lc-page a[href="/"] {
            display: none !important;
          }
          .lc-print {
            margin-top: 0 !important;
          }
          .lc-print-head h2 {
            font-size: 18pt;
          }
          .lc-summary {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          .lc-findings article {
            break-inside: avoid;
            box-shadow: none !important;
            padding: 6px 8px !important;
          }
          .lc-print-foot {
            break-inside: avoid;
            margin-top: 12px;
          }
        }
      `}</style>
    </main>
  );
}
