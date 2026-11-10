"use client";

import { useCallback, useMemo, useState } from "react";
import type { Finding, LabelCheckResult } from "@/lib/label-check/types";
import {
  DISCLAIMER_PRINT_485,
  FIX_EXAMPLE_NOTE_494,
  SAMPLE_BANNER_486,
} from "@/lib/label-check/types";
import { fixKindHeading496 } from "@/lib/label-check/fix-kind-label";

const STATUS_KO: Record<string, string> = {
  possible: "고칠 것",
  attention: "확인할 것",
  unknown: "확인 못 함",
  pass: "문제 없음",
};

/** 496 — fix_ko(fixSuggestion) 있을 때만 표시. 빈 문구 금지 */
function needsFixPanel(f: Finding): boolean {
  if (f.status === "pass") return false;
  return Boolean(f.fixSuggestion && f.fixSuggestion.trim());
}

function formatFixBlock(f: Finding): string {
  const heading = fixKindHeading496(f.fixKind);
  const lines: string[] = [`[${f.label}]`, `${heading}: ${f.fixSuggestion}`];
  if (f.fixExample) lines.push(f.fixExample);
  lines.push(FIX_EXAMPLE_NOTE_494);
  return lines.join("\n");
}

export type ResultPanelProps = {
  result: LabelCheckResult;
  printTitle: string;
  checkedOn: string;
  isSample?: boolean;
  /** history 요약 전용: found/수정제안 숨기고 안내 */
  summaryOnly?: boolean;
  summaryNotice?: string;
};

export function ResultPanel({
  result,
  printTitle,
  checkedOn,
  isSample,
  summaryOnly,
  summaryNotice,
}: ResultPanelProps) {
  const [fixCopied, setFixCopied] = useState(false);

  const fixBundle = useMemo(() => {
    if (!result || result.skipJudgment || summaryOnly) return "";
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
  }, [result, summaryOnly]);

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

  return (
    <section className="lc-print space-y-5" id="label-check-print">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <h2 className="text-xl font-bold">검수 결과</h2>
        {!summaryOnly ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full border border-[#1B1B18] px-4 py-1.5 text-sm font-semibold"
          >
            인쇄/PDF로 저장
          </button>
        ) : null}
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
          점검일 {checkedOn}
          {result.market ? ` · 시장 ${result.market === "US" ? "미국" : "한국"}` : ""}
        </p>
      </header>

      {summaryNotice ? (
        <p className="break-words rounded-lg border border-[#D9CBA8] bg-[#FFF9EB] px-3 py-3 text-sm leading-relaxed text-[#4A3F24]" role="status">
          {summaryNotice}
        </p>
      ) : null}

      {result.notice ? (
        <p
          className="break-words rounded-lg border border-[#D9CBA8] bg-[#FFF9EB] px-3 py-3 text-sm leading-relaxed text-[#4A3F24]"
          role="alert"
        >
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
                {!summaryOnly && f.found ? <p className="mt-1 text-[#333]">{f.found}</p> : null}
                <p className="mt-0.5 text-[#555]">{summaryOnly ? f.suggest : f.suggest}</p>
                {!summaryOnly && f.exceptionNote ? (
                  <details className="mt-2 rounded-md border border-[#EDE4CF] bg-[#FFFCF5] px-2 py-1">
                    <summary className="cursor-pointer text-xs font-semibold text-[#6B5A2E]">예외</summary>
                    <p className="mt-1 text-xs leading-relaxed text-[#444]">예외: {f.exceptionNote}</p>
                  </details>
                ) : null}
                {!summaryOnly && needsFixPanel(f) ? (
                  <details className="mt-2 rounded-md border border-[#EDE4CF] bg-[#FFFCF5] px-2 py-1">
                    <summary className="cursor-pointer text-xs font-semibold text-[#6B5A2E]">
                      {fixKindHeading496(f.fixKind)}
                    </summary>
                    <div className="mt-1 space-y-1 text-xs leading-relaxed text-[#444]">
                      <p>{f.fixSuggestion}</p>
                      {f.fixExample ? <p>{f.fixExample}</p> : null}
                      {f.fixExample ? <p className="text-[#6B5A2E]">{FIX_EXAMPLE_NOTE_494}</p> : null}
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

          {!summaryOnly && result.evidenceCheckpoints?.length ? (
            <div className="rounded-lg border border-[#EDE4CF] bg-[#FFFCF5] p-3 print:break-inside-avoid">
              <h3 className="text-sm font-bold">근거 자료 확인</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-[#444]">
                {result.evidenceCheckpoints.map((p, i) => (
                  <li key={`ev-${i}`}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      <footer className="lc-print-foot border-t border-[#E5DCC8] pt-3 text-xs leading-relaxed text-[#555]">
        <p>{result.disclaimer || DISCLAIMER_PRINT_485}</p>
        {result.rulesBasis ? <p className="mt-1 text-[11px] text-[#888]">{result.rulesBasis}</p> : null}
      </footer>
    </section>
  );
}
