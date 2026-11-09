"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { LabelCheckResult } from "@/lib/label-check/types";
import { DISCLAIMER_483, MAX_PDF_BYTES_483 } from "@/lib/label-check/types";

const STATUS_KO: Record<string, string> = {
  possible: "위반 가능",
  attention: "확인 필요",
  unknown: "확인 불가",
  pass: "통과",
};

export default function LabelCheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rinseOff, setRinseOff] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabelCheckResult | null>(null);

  const onFile = useCallback((f: File | null) => {
    setResult(null);
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
    } catch {
      setError("네트워크 오류로 검수에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F4EE] text-[#1B1B18]">
      <div className="mx-auto max-w-3xl px-4 py-10 print:max-w-none print:px-0 print:py-4">
        <header className="mb-8 print:mb-4">
          <p className="text-sm font-semibold tracking-wide text-[#6B5A2E]">
            <Link href="/" className="underline-offset-2 hover:underline print:hidden">
              Pagzly
            </Link>
            <span className="print:inline hidden">Pagzly</span>
            {" · "}표시사항 사전 점검
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">화장품 표시사항 PDF 검수</h1>
          <p className="mt-3 rounded-lg border border-[#D9CBA8] bg-[#FFF9EB] px-3 py-2 text-sm leading-relaxed text-[#4A3F24]">
            {DISCLAIMER_483}
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-[#E5DCC8] bg-white p-5 shadow-sm print:hidden">
          <label className="block text-sm font-semibold">
            PDF 업로드 (최대 10MB, 1개)
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="mt-2 block w-full text-sm"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file ? <p className="text-xs text-[#666]">선택됨 · {(file.size / 1024).toFixed(1)} KB</p> : null}

          <fieldset className="space-y-2 text-sm">
            <legend className="font-semibold">제품 유형</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="rinse"
                checked={!rinseOff}
                onChange={() => setRinseOff(false)}
              />
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
          {error ? <p className="text-sm text-[#9B1C1C]">{error}</p> : null}
        </section>

        {result ? (
          <section className="mt-8 space-y-6 print:mt-0" id="label-check-print">
            <div className="flex flex-wrap items-end justify-between gap-3 print:block">
              <h2 className="text-xl font-bold">검수 결과</h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full border border-[#1B1B18] px-4 py-1.5 text-sm font-semibold print:hidden"
              >
                인쇄용으로 보기
              </button>
            </div>

            <p className="text-xs leading-relaxed text-[#555]">{result.disclaimer}</p>

            {!result.readable ? (
              <p className="rounded-lg bg-[#F3F3F3] px-3 py-2 text-sm">
                텍스트를 읽을 수 없어 확인 불가합니다. 이미지로만 된 PDF는 이번 버전에서 검수하지 않습니다.
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ["위반 가능", result.summary.possible],
                  ["확인 필요", result.summary.attention],
                  ["확인 불가", result.summary.unknown],
                  ["통과", result.summary.pass],
                  ["수동 확인", result.summary.manual],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-[#E5DCC8] bg-white px-3 py-2 text-center">
                  <div className="text-xs text-[#666]">{k}</div>
                  <div className="text-2xl font-extrabold tabular-nums">{v}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {result.findings.map((f, i) => (
                <article
                  key={`${f.label}-${i}`}
                  className="break-words rounded-xl border border-[#E5DCC8] bg-white px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-xs text-[#666]">{f.category}</span>
                    <span className="font-semibold">{f.label}</span>
                    <span className="font-semibold text-[#6B5A2E]">{STATUS_KO[f.status] ?? f.status}</span>
                  </div>
                  <p className="mt-2 text-[#333]">{f.found}</p>
                  <p className="mt-1 text-[#555]">{f.suggest}</p>
                </article>
              ))}
            </div>

            {result.manualItems.length ? (
              <div className="rounded-xl border border-dashed border-[#CDBF9A] bg-[#FFFCF5] p-4">
                <h3 className="text-sm font-bold">수동 확인 필요 (코드 미검사 · AI/수동)</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#444]">
                  {result.manualItems.map((m, i) => (
                    <li key={`${m.label}-${i}`}>
                      <span className="font-medium">
                        [{m.category}] {m.label}
                      </span>
                      — {m.suggest}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}
