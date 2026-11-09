"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Finding, LabelCheckResult, LabelMarket } from "@/lib/label-check/types";
import {
  DISCLAIMER_483,
  DISCLAIMER_PRINT_485,
  FIX_EXAMPLE_NOTE_494,
  INTRO_LINES_486,
  INTRO_ONE_LINE_486,
  MAX_PDF_PAGES_485,
  SAMPLE_BANNER_486,
} from "@/lib/label-check/types";
import {
  assertClientPdfSize,
  submitLabelCheckClient,
} from "@/lib/label-check/client-submit";
import sampleResultA from "@/lib/label-check/sample-result-a.json";
import { labelContactEmail } from "@/lib/label-check/contact";
import { fixKindHeading496 } from "@/lib/label-check/fix-kind-label";

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

function needsFixPanel(f: Finding): boolean {
  if (f.status === "pass") return false;
  return Boolean(f.fixSuggestion && f.fixSuggestion.trim());
}

function formatFixBlock(f: Finding): string {
  const lines: string[] = [`[${f.label}]`, `${fixKindHeading496(f.fixKind)}: ${f.fixSuggestion}`];
  if (f.fixExample) lines.push(f.fixExample);
  if (f.fixExample) lines.push(FIX_EXAMPLE_NOTE_494);
  return lines.join("\n");
}

export default function LabelCheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [productName, setProductName] = useState("");
  const [market, setMarket] = useState<LabelMarket>("KR");
  const [rinseOff, setRinseOff] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [imported, setImported] = useState(false);
  const [professionalUse, setProfessionalUse] = useState(false);
  const [hazardous, setHazardous] = useState(false);
  const [otcDrugLike, setOtcDrugLike] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabelCheckResult | null>(null);
  const [checkedOn, setCheckedOn] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fixCopied, setFixCopied] = useState(false);

  const contactEmail = labelContactEmail();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("market");
    if (q && q.toUpperCase() === "US") setMarket("US");
  }, []);

  const onFile = useCallback((f: File | null) => {
    setResult(null);
    setCheckedOn(null);
    setIsSample(false);
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const sizeErr = assertClientPdfSize(f);
    if (sizeErr) {
      setError(sizeErr);
      setFile(null);
      return;
    }
    setFile(f);
  }, []);

  const showSample = useCallback(() => {
    setError(null);
    setFile(null);
    setIsSample(true);
    setMarket("KR");
    setProductName(sampleResultA.meta.product);
    setResult(sampleResultA.result as LabelCheckResult);
    setCheckedOn(todayKo());
  }, []);

  const copyContact = useCallback(async () => {
    if (!contactEmail) return;
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [contactEmail]);

  const fixBundle = useMemo(() => {
    if (!result || result.skipJudgment) return "";
    const parts: string[] = [];
    for (const f of result.findings) {
      if (!needsFixPanel(f)) continue;
      parts.push(formatFixBlock(f));
    }
    for (const m of result.manualItems) {
      if (!m.fixSuggestion && !m.fixExample) continue;
      parts.push(
        `[${m.label}]\n${m.fixSuggestion || ""}\n${m.fixExample || ""}\n${FIX_EXAMPLE_NOTE_494}`.trim(),
      );
    }
    return parts.filter(Boolean).join("\n\n");
  }, [result]);

  const copyFixes = useCallback(async () => {
    if (!fixBundle) return;
    try {
      await navigator.clipboard.writeText(fixBundle);
      setFixCopied(true);
      window.setTimeout(() => setFixCopied(false), 1500);
    } catch {
      setFixCopied(false);
    }
  }, [fixBundle]);

  const submit = async () => {
    if (!file) {
      setError("PDF를 선택하세요.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setIsSample(false);
    try {
      const out = await submitLabelCheckClient(
        file,
        {
          rinseOff,
          functional,
          market,
          imported,
          professionalUse,
          hazardous,
          otcDrugLike,
          productTypes,
        },
        setProgress,
      );
      if (!out.ok) {
        setError(out.error);
        return;
      }
      setResult(out.result);
      setCheckedOn(todayKo());
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  const printTitle = useMemo(() => {
    if (isSample) return sampleResultA.meta.product;
    const n = productName.trim();
    return n || "제품명 미입력";
  }, [productName, isSample]);

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
          <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight">화장품 표시사항 PDF 검수</h1>
          <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[#6B5A2E]">
            <Link href="/login?next=%2Flabel-check%2Fnew" className="underline-offset-2 hover:underline">
              로그인
            </Link>
            <Link href="/label-check/new" className="underline-offset-2 hover:underline">
              검수 신청
            </Link>
            <Link href="/label-check/history" className="underline-offset-2 hover:underline">
              내 결과
            </Link>
          </nav>
          <p className="mt-3 break-words text-base leading-relaxed text-[#3A3428]">{INTRO_ONE_LINE_486}</p>
          <ol className="mt-3 list-decimal space-y-1.5 break-words pl-5 text-sm leading-relaxed text-[#4A3F24]">
            {INTRO_LINES_486.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="mt-3 rounded-lg border border-[#D9CBA8] bg-[#FFF9EB] px-3 py-2 text-sm leading-relaxed text-[#4A3F24]">
            {DISCLAIMER_483}
          </p>
          {contactEmail ? (
            <div className="lc-contact mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="break-all text-[#3A3428]">문의: {contactEmail}</span>
              <button
                type="button"
                onClick={() => void copyContact()}
                className="rounded-full border border-[#1B1B18] px-3 py-1 text-xs font-semibold"
              >
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
          ) : null}
        </header>

        <section className="space-y-4 rounded-2xl border border-[#E5DCC8] bg-white p-5 shadow-sm print:hidden">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={showSample}
              className="rounded-full border border-[#1B1B18] px-4 py-2 text-sm font-semibold"
            >
              샘플 결과 먼저 보기
            </button>
          </div>

          <fieldset className="space-y-2 text-sm">
            <legend className="font-semibold">시장</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="market"
                checked={market === "KR"}
                onChange={() => setMarket("KR")}
              />
              한국
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="market"
                checked={market === "US"}
                onChange={() => setMarket("US")}
              />
              미국
            </label>
          </fieldset>

          <label className="block text-sm font-semibold" htmlFor="lc-guest-name">
            제품명 (선택 · 인쇄 상단에 표시)
            <input
              id="lc-guest-name"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예: 모아리 수분 토너"
              className="mt-2 block w-full rounded-lg border border-[#E5DCC8] px-3 py-2 text-sm font-normal"
              maxLength={80}
            />
          </label>

          <label className="block text-sm font-semibold" htmlFor="lc-guest-pdf">
            PDF 업로드 (최대 100MB · {MAX_PDF_PAGES_485}쪽, 1개 · 글자만 전송)
            <input
              id="lc-guest-pdf"
              type="file"
              accept="application/pdf,.pdf"
              className="mt-2 block w-full text-sm font-normal"
              aria-label="PDF 파일 선택"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file ? <p className="text-xs text-[#666]">선택됨 · {(file.size / 1024).toFixed(1)} KB</p> : null}

          {market === "KR" ? (
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
              <details className="rounded-md border border-[#E5DCC8] bg-white px-3 py-2">
                <summary className="cursor-pointer text-sm font-semibold text-[#6B5A2E]">
                  세부 유형(주의사항) — 해당 시에만
                </summary>
                <div className="mt-2 grid gap-1.5 text-sm">
                  {(
                    [
                      ["scrub", "스크럽"],
                      ["pack", "팩"],
                      ["shampoo", "샴푸"],
                      ["vulva", "외음부세정제"],
                      ["softener", "손발연화"],
                      ["deodorant", "체취방지"],
                      ["spray_sunscreen", "분무형 자외선차단"],
                      ["aerosol", "에어로졸"],
                    ] as const
                  ).map(([id, label]) => (
                    <label key={id} className="flex items-center gap-2 font-normal">
                      <input
                        type="checkbox"
                        checked={productTypes.includes(id)}
                        onChange={(e) => {
                          setProductTypes((prev) =>
                            e.target.checked ? [...prev, id] : prev.filter((x) => x !== id),
                          );
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </details>
            </fieldset>
          ) : (
            <fieldset className="space-y-2 text-sm">
              <legend className="font-semibold">미국 추가 입력</legend>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={imported} onChange={(e) => setImported(e.target.checked)} />
                수입품
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={professionalUse}
                  onChange={(e) => setProfessionalUse(e.target.checked)}
                />
                전문가용
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={hazardous} onChange={(e) => setHazardous(e.target.checked)} />
                에어로졸/아동용 등 위험 제품
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={otcDrugLike}
                  onChange={(e) => setOtcDrugLike(e.target.checked)}
                />
                자외선차단·여드름 등 OTC 의약품 성격
              </label>
            </fieldset>
          )}

          <button
            type="button"
            disabled={busy || !file}
            onClick={() => void submit()}
            className="rounded-full bg-[#1B1B18] px-5 py-2.5 text-sm font-semibold text-[#FAF8F3] disabled:opacity-40"
          >
            {busy ? progress || "검수 중…" : "검수 시작"}
          </button>
          {error ? (
            <p className="break-words text-sm text-[#9B1C1C]" role="alert">
              {error}
            </p>
          ) : null}
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
              {isSample ? (
                <p className="mt-2 break-words rounded-md bg-[#FFF9EB] px-2 py-1 text-sm font-semibold text-[#6B5A2E]">
                  {SAMPLE_BANNER_486}
                </p>
              ) : null}
              <h2 className="mt-1 break-words text-2xl font-extrabold leading-tight">{printTitle}</h2>
              <p className="mt-1 text-sm text-[#555]">
                점검일 {checkedOn ?? todayKo()}
                {result.market ? ` · 시장 ${result.market === "US" ? "미국" : "한국"}` : ""}
              </p>
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
                      {needsFixPanel(f) ? (
                        <details className="mt-2 rounded-md border border-[#EDE4CF] bg-[#FFFCF5] px-2 py-1">
                          <summary className="cursor-pointer text-xs font-semibold text-[#6B5A2E]">
                            {fixKindHeading496(f.fixKind)}
                          </summary>
                          <div className="mt-1 space-y-1 text-xs leading-relaxed text-[#444]">
                            <p>{f.fixSuggestion}</p>
                            {f.fixExample ? <p>{f.fixExample}</p> : null}
                            {f.fixExample ? (
                              <p className="text-[#6B5A2E]">{FIX_EXAMPLE_NOTE_494}</p>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </article>
                  ))}
                </div>

                {result.manualItems.length ? (
                  <div className="rounded-lg border border-dashed border-[#CDBF9A] bg-[#FFFCF5] p-3 print:break-inside-avoid">
                    <h3 className="text-sm font-bold">확인 필요 질문</h3>
                    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[#444]">
                      {result.manualItems.map((m, i) => (
                        <li key={`${m.label}-${i}`} className="break-words">
                          <span className="font-medium">
                            [{m.category}] {m.label}
                          </span>
                          — {m.suggest}
                          {m.fixSuggestion || m.fixExample ? (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-xs font-semibold text-[#6B5A2E]">
                                수정 제안
                              </summary>
                              <div className="mt-1 text-xs">
                                {m.fixSuggestion ? <p>{m.fixSuggestion}</p> : null}
                                {m.fixExample ? <p>{m.fixExample}</p> : null}
                                <p className="text-[#6B5A2E]">{FIX_EXAMPLE_NOTE_494}</p>
                              </div>
                            </details>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {fixBundle ? (
                  <div className="rounded-lg border border-[#E5DCC8] bg-white p-3 print:hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold">수정 제안 모아 보기</h3>
                      <button
                        type="button"
                        onClick={() => void copyFixes()}
                        className="rounded-full border border-[#1B1B18] px-3 py-1 text-xs font-semibold"
                      >
                        {fixCopied ? "복사됨" : "텍스트 복사"}
                      </button>
                    </div>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#FFFCF5] p-2 text-xs text-[#333]">
                      {fixBundle}
                    </pre>
                  </div>
                ) : null}
              </>
            ) : null}

            <footer className="lc-print-foot border-t border-[#E5DCC8] pt-3 text-xs leading-relaxed text-[#555]">
              <p>{result.disclaimer || DISCLAIMER_PRINT_485}</p>
              {result.rulesBasis ? (
                <p className="mt-1 text-[11px] text-[#888]">{result.rulesBasis}</p>
              ) : null}
            </footer>
          </section>
        ) : null}

        <nav
          className="lc-legal mt-10 flex flex-wrap gap-x-4 gap-y-1 break-words text-xs text-[#6B5A2E] print:hidden"
          aria-label="약관"
        >
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="underline-offset-2 hover:underline">
            이용약관
          </Link>
        </nav>
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
