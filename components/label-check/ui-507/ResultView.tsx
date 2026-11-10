"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import type { Finding, LabelCheckResult } from "@/lib/label-check/types";
import { NOTICE_RECHECK_EMPTY_506 } from "@/lib/label-check/types";
import {
  bucketLabel507,
  buildVerdict507,
  compareBanner507,
  defaultTab507,
  fixKindHeading507,
  highlightEvidence507,
  sortFindings507,
  statusToBucket507,
  type UiBucket507,
} from "@/lib/label-check/ui-status-507";
import { CopyButton507 } from "./CopyButton";

export type ResultView507Props = {
  result: LabelCheckResult;
  productName?: string | null;
  checkedOn?: string;
  /** 저장본: 찾은 문구 숨김 */
  hideEvidence?: boolean;
  isMember?: boolean;
  savedId?: string | null;
  showBottomBar?: boolean;
  recheckText?: string;
  onRecheckText?: (t: string) => void;
  onRecheck?: () => void;
  recheckBusy?: boolean;
};

function chipClass(b: UiBucket507): string {
  if (b === "fix") return "lc507-chip lc507-c-bad";
  if (b === "check" || b === "manual") return "lc507-chip lc507-c-warn";
  if (b === "unknown") return "lc507-chip lc507-c-unk";
  return "lc507-chip lc507-c-ok";
}

function itemClass(b: UiBucket507): string {
  if (b === "fix") return "lc507-item bad";
  if (b === "check" || b === "manual") return "lc507-item warn";
  if (b === "unknown") return "lc507-item unk";
  return "lc507-item";
}

function FindingCard({
  f,
  hideEvidence,
}: {
  f: Finding;
  hideEvidence?: boolean;
}) {
  const bucket = statusToBucket507(f.status);
  const showFix =
    Boolean(f.fix) &&
    (Boolean(f.fix?.templates?.length) ||
      Boolean(f.fix?.alternatives?.length) ||
      f.fix?.kind === "delete" ||
      Boolean(f.fix?.headline));

  return (
    <article className={itemClass(bucket)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={chipClass(bucket)}>{bucketLabel507(bucket)}</span>
        <h3>{f.label}</h3>
      </div>

      {!hideEvidence && f.evidence?.length ? (
        <div className="lc507-quote">
          {f.evidence.slice(0, 3).map((ev, i) => {
            const h = highlightEvidence507(ev.sentence, ev.found);
            if (!h) return <p key={i}>{ev.found}</p>;
            return (
              <p key={i}>
                “{h.before}
                <mark>{h.hit}</mark>
                {h.after}”
              </p>
            );
          })}
        </div>
      ) : null}

      {f.exception ? (
        <p className="lc507-fine">
          예외에 해당할 수 있어요: {f.exception.text}
        </p>
      ) : f.exceptionNote ? (
        <p className="lc507-fine">예외에 해당할 수 있어요: {f.exceptionNote}</p>
      ) : null}

      {showFix && f.fix ? (
        <div className="lc507-fix">
          <b>{fixKindHeading507(f.fix.kind)}</b>
          {(f.fix.templates || []).map((t, i) => (
            <div key={`t-${i}`} className="lc507-alt">
              <span>{t}</span>
              <CopyButton507 text={t} />
            </div>
          ))}
          {(f.fix.alternatives || []).map((a, i) => (
            <div key={`a-${i}`} className="lc507-alt">
              <span>
                {a.text}{" "}
                {a.kind === "guideline_exception" ? (
                  <span className="lc507-tag">지침 예외 조건</span>
                ) : null}
              </span>
              <CopyButton507 text={a.text} />
            </div>
          ))}
          {f.fix.kind === "delete" && !f.fix.alternatives?.length ? (
            <p className="lc507-fine">{f.fix.note || f.fix.headline}</p>
          ) : null}
          {f.fix.note && f.fix.kind !== "delete" ? (
            <p className="lc507-fine">{f.fix.note}</p>
          ) : null}
        </div>
      ) : null}

      {f.status === "unknown" ? (
        <p className="lc507-fine">
          {f.found || f.suggest}
          {f.suggest && f.found ? ` · ${f.suggest}` : ""}
        </p>
      ) : null}

      {f.basis?.law ? (
        <details>
          <summary>왜 필요한가요? (근거)</summary>
          <p className="mt-1">
            {f.basis.law}
            {f.basis.source ? ` — ${f.basis.source}` : ""}
          </p>
        </details>
      ) : null}
    </article>
  );
}

export function ResultView507({
  result,
  productName,
  checkedOn,
  hideEvidence,
  isMember,
  savedId,
  showBottomBar = true,
  recheckText = "",
  onRecheckText,
  onRecheck,
  recheckBusy,
}: ResultView507Props) {
  const verdictRef = useRef<HTMLParagraphElement>(null);
  const counts = useMemo(() => {
    const fix = result.summary.possible || 0;
    const check = (result.summary.attention || 0) + (result.summary.manual || 0);
    const unknown = result.summary.unknown || 0;
    const pass = result.summary.pass || 0;
    return { fix, check, unknown, pass };
  }, [result.summary]);

  const [tab, setTab] = useState<UiBucket507>(() => defaultTab507(counts));
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    setTab(defaultTab507(counts));
  }, [counts.fix, counts.check, counts.unknown, counts.pass]);

  useEffect(() => {
    verdictRef.current?.focus();
  }, [result]);

  const verdict = buildVerdict507(result.summary);
  const sorted = useMemo(() => sortFindings507(result.findings), [result.findings]);

  const byTab = useMemo(() => {
    const fix = sorted.filter((f) => f.status === "possible");
    const check = sorted.filter((f) => f.status === "attention");
    const unknown = sorted.filter((f) => f.status === "unknown");
    const pass = sorted.filter((f) => f.status === "pass");
    return { fix, check, unknown, pass };
  }, [sorted]);

  const tabs: Array<{ id: UiBucket507; count: number }> = [
    { id: "fix", count: counts.fix },
    { id: "check", count: counts.check },
    { id: "unknown", count: counts.unknown },
    { id: "pass", count: counts.pass },
  ];

  const onTabKey = (e: KeyboardEvent) => {
    const ids = tabs.map((t) => t.id);
    const i = ids.indexOf(tab);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setTab(ids[(i + 1) % ids.length]!);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setTab(ids[(i - 1 + ids.length) % ids.length]!);
    }
  };

  const copyAll = async () => {
    const text = result.fixSheet || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const metaLine = [
    productName || null,
    result.market === "US" ? "미국 기준" : "한국 기준",
    result.rulesBasis || null,
    checkedOn ? `점검일 ${checkedOn}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section className="lc507-card">
        {result.scopeNotice ? <p className="lc507-fine">{result.scopeNotice}</p> : null}

        {result.compare ? (
          <div className="lc507-compare" role="status">
            {compareBanner507(result.compare)}
            {result.compare.remaining.length === 0 && result.compare.added.length === 0
              ? ` — ${NOTICE_RECHECK_EMPTY_506}`
              : ""}
          </div>
        ) : null}

        <p className="lc507-verdict" ref={verdictRef} tabIndex={-1}>
          {verdict.headline}
          {verdict.subNote ? <small>{verdict.subNote}</small> : null}
          {metaLine ? <small>{metaLine}</small> : null}
        </p>

        {result.notice ? (
          <p className="lc507-fine" role="status">
            {result.notice}
          </p>
        ) : null}

        {!result.skipJudgment ? (
          <>
            <div className="lc507-score" aria-label="요약 숫자">
              <button type="button" className="lc507-s-bad" onClick={() => setTab("fix")}>
                <b>{counts.fix}</b>고칠 것
              </button>
              <button type="button" className="lc507-s-warn" onClick={() => setTab("check")}>
                <b>{counts.check}</b>확인할 것
              </button>
              <button type="button" className="lc507-s-unk" onClick={() => setTab("unknown")}>
                <b>{counts.unknown}</b>확인 못 함
              </button>
              <button type="button" className="lc507-s-ok" onClick={() => setTab("pass")}>
                <b>{counts.pass}</b>문제 없음
              </button>
            </div>

            <div className="lc507-tabs" role="tablist" aria-label="결과 탭" onKeyDown={onTabKey}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`lc507-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`lc507-panel-${t.id}`}
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                >
                  {bucketLabel507(t.id)} {t.count}
                </button>
              ))}
            </div>

            <div
              role="tabpanel"
              id={`lc507-panel-${tab}`}
              aria-labelledby={`lc507-tab-${tab}`}
              className="flex flex-col gap-3"
            >
              {tab === "fix"
                ? byTab.fix.map((f, i) => (
                    <FindingCard key={`f-${i}`} f={f} hideEvidence={hideEvidence} />
                  ))
                : null}
              {tab === "check" ? (
                <>
                  {byTab.check.map((f, i) => (
                    <FindingCard key={`c-${i}`} f={f} hideEvidence={hideEvidence} />
                  ))}
                  {result.manualItems.length ? (
                    <div className="lc507-item" style={{ borderStyle: "dashed" }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="lc507-chip lc507-c-unk">직접 확인</span>
                        <h3>추가로 직접 확인할 항목</h3>
                      </div>
                      <ul className="list-disc space-y-1 pl-5 text-sm">
                        {result.manualItems.map((m, i) => (
                          <li key={i}>
                            {m.label} — {m.suggest}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
              {tab === "unknown"
                ? byTab.unknown.map((f, i) => (
                    <FindingCard key={`u-${i}`} f={f} hideEvidence={hideEvidence} />
                  ))
                : null}
              {tab === "pass"
                ? byTab.pass.map((f, i) => (
                    <div key={`p-${i}`} className="lc507-pass-line">
                      {f.label}
                    </div>
                  ))
                : null}
              {tab === "fix" && !byTab.fix.length ? (
                <p className="lc507-fine">이 탭에 해당하는 항목이 없어요.</p>
              ) : null}
            </div>
          </>
        ) : null}

        {onRecheck && onRecheckText ? (
          <div className="lc507-card lc507-print-hide" style={{ padding: 12, marginTop: 4 }}>
            <p className="text-sm font-bold">고친 문구를 붙여넣고 다시 점검</p>
            <textarea
              className="lc507-textarea"
              aria-label="고친 문구 붙여넣기"
              value={recheckText}
              onChange={(e) => onRecheckText(e.target.value)}
            />
            <button
              type="button"
              className="lc507-cta"
              style={{ fontSize: 14, padding: "10px" }}
              disabled={recheckBusy || !recheckText.trim()}
              onClick={onRecheck}
            >
              {recheckBusy ? "다시 점검 중…" : "다시 점검"}
            </button>
          </div>
        ) : null}

        {isMember ? (
          <p className="lc507-fine">
            {savedId ? "이 결과 저장됨 · " : null}
            <Link href="/label-check/history" className="underline-offset-2 hover:underline">
              내 결과
            </Link>
          </p>
        ) : (
          <p className="lc507-fine">
            가입하면 결과를 다시 볼 수 있어요.{" "}
            <Link href="/signup" className="underline-offset-2 hover:underline">
              가입
            </Link>
          </p>
        )}

        <p className="lc507-fine lc507-print-hide">
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => window.print()}
          >
            인쇄/PDF로 저장
          </button>
        </p>
      </section>

      {showBottomBar && !result.skipJudgment && result.fixSheet ? (
        <div className="lc507-bar lc507-print-hide" aria-live="polite">
          <div className="lc507-bar-inner">
            <span>고칠 문구를 한 번에 복사하고, 고친 뒤 다시 점검하세요</span>
            <button type="button" onClick={() => void copyAll()}>
              {copiedAll ? "복사됨" : "수정안 모두 복사"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
