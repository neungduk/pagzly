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
  sortFindings507,
  statusToBucket507,
  type UiBucket507,
} from "@/lib/label-check/ui-status-507";
import { CopyButton507 } from "./CopyButton";
import { FindingCardBody512 } from "@/components/label-check/ui-511/FindingCardBody512";

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
  /** 508 — OCR 가능 시 버튼 표시 */
  ocrAvailable?: boolean;
  onStartOcr?: () => void;
  onFocusPaste?: () => void;
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

function findingKey(f: Finding): string {
  return f.checkKey || `${f.status}:${f.label}:${f.found || ""}`;
}

function FindingCard({
  f,
  index,
  hideEvidence,
  done,
  onToggleDone,
  animClass,
  readStatus,
}: {
  f: Finding;
  index: number;
  hideEvidence?: boolean;
  done?: boolean;
  onToggleDone?: () => void;
  animClass?: string;
  readStatus?: LabelCheckResult["readStatus"];
}) {
  const bucket = statusToBucket507(f.status);
  const showFix =
    Boolean(f.fix) &&
    (Boolean(f.fix?.templates?.length) ||
      Boolean(f.fix?.alternatives?.length) ||
      f.fix?.kind === "delete" ||
      Boolean(f.fix?.headline));
  const wantsBody512 = f.status === "possible" || f.status === "attention";
  // showFix·f.fix 는 507 회귀 가드용으로 유지.

  return (
    <article
      className={`${itemClass(bucket)} ${done ? "lc511-done" : ""} ${animClass || ""}`.trim()}
      style={done ? { opacity: 0.6 } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={chipClass(done ? "pass" : bucket)}>{done ? "고쳤어요" : bucketLabel507(bucket)}</span>
        <h3>{f.label}</h3>
      </div>

      {wantsBody512 ? (
        <FindingCardBody512 f={f} hideEvidence={hideEvidence} readStatus={readStatus} />
      ) : null}

      {/* 기존 showFix 경로 흔적(회귀 가드) — 고칠 것/확인할 것 밖 */}
      {!wantsBody512 && showFix && f.fix ? (
        <div className="lc507-fix">
          {(f.fix.templates || []).map((t, i) => (
            <div key={`t-${i}`} className="lc507-alt">
              <span>{t}</span>
              <CopyButton507 text={t} />
            </div>
          ))}
        </div>
      ) : null}

      {f.status === "unknown" ? (
        <FindingCardBody512 f={f} hideEvidence={hideEvidence} readStatus={readStatus} />
      ) : null}

      {onToggleDone && (f.status === "possible" || f.status === "attention") ? (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            className="lc507-copy"
            style={{
              minHeight: 44,
              padding: "8px 16px",
              borderRadius: 8,
              background: done ? "#FFFFFF" : "#0F3D36",
              color: done ? "#0F3D36" : "#F2F5F3",
              border: done ? "1px solid #0F3D36" : "0",
              fontWeight: 700,
            }}
            onClick={onToggleDone}
          >
            {done ? "되돌리기" : "고쳤어요"}
          </button>
        </div>
      ) : null}
      {index < 0 ? null : null}
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
  ocrAvailable,
  onStartOcr,
  onFocusPaste,
}: ResultView507Props) {
  const verdictRef = useRef<HTMLParagraphElement>(null);
  const unreadable = result.readStatus === "unreadable";
  const counts = useMemo(() => {
    const fix = result.summary.possible || 0;
    const check = (result.summary.attention || 0) + (result.summary.manual || 0);
    const unknown = result.summary.unknown || 0;
    const pass = result.summary.pass || 0;
    return { fix, check, unknown, pass };
  }, [result.summary]);

  const [tab, setTab] = useState<UiBucket507>(() => defaultTab507(counts));
  const [copiedAll, setCopiedAll] = useState(false);
  /** 화면 전용 — 저장·결과 데이터에 섞이지 않음 */
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [doneTick, setDoneTick] = useState(0);

  useEffect(() => {
    setTab(defaultTab507(counts));
    setDoneMap({});
    setDoneTick(0);
  }, [counts.fix, counts.check, counts.unknown, counts.pass, result]);

  useEffect(() => {
    verdictRef.current?.focus();
  }, [result]);

  const verdict = buildVerdict507(result.summary, {
    readStatus: result.readStatus,
    skipJudgment: result.skipJudgment,
  });
  const sorted = useMemo(() => sortFindings507(result.findings), [result.findings]);

  const byTab = useMemo(() => {
    const fix = sorted.filter((f) => f.status === "possible");
    const check = sorted.filter((f) => f.status === "attention");
    const unknown = sorted.filter((f) => f.status === "unknown");
    const pass = sorted.filter((f) => f.status === "pass");
    return { fix, check, unknown, pass };
  }, [sorted]);

  const actionable = useMemo(
    () => sorted.filter((f) => f.status === "possible" || f.status === "attention"),
    [sorted],
  );
  const resolved = actionable.filter((f) => doneMap[findingKey(f)]).length;
  const remaining = Math.max(0, actionable.length - resolved);
  const progressPct = actionable.length ? Math.round((resolved / actionable.length) * 100) : 0;
  const numAnim = doneTick % 2 === 0 ? "lc-numA" : "lc-numB";

  const displayFix = Math.max(0, counts.fix - byTab.fix.filter((f) => doneMap[findingKey(f)]).length);
  const displayCheck = Math.max(
    0,
    counts.check - byTab.check.filter((f) => doneMap[findingKey(f)]).length,
  );

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

  const toggleDone = (key: string) => {
    setDoneMap((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
    setDoneTick((n) => n + 1);
  };

  const metaLine = [
    productName || null,
    result.market === "US" ? "미국 기준" : "한국 기준",
    result.rulesBasis || null,
    checkedOn ? `점검일 ${checkedOn}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const progressText =
    resolved === 0
      ? `고칠 것 ${counts.fix}건과 확인할 것 ${counts.check}건이 남아 있어요`
      : remaining === 0
        ? "모두 고쳤다고 표시했어요. 다시 점검해 확인해 보세요"
        : `${remaining}건이 남아 있어요`;

  return (
    <>
      <section className="lc507-card lc-r0">
        <ol
          className="lc507-steps lc507-print-hide"
          aria-label="진행 단계"
          style={{ listStyle: "none", margin: 0, padding: 0, gap: 10 }}
        >
          <li className="lc-pill lc-pill-off">1 올리기</li>
          <li className="lc-pill lc-pill-on">2 결과 보기</li>
          <li className="lc-pill lc-pill-off">3 고쳐서 다시 점검</li>
        </ol>

        {result.ocrFromPhoto ? (
          <p className="lc507-fine">사진에서 읽은 글자 기준</p>
        ) : null}

        {result.scopeNotice ? <p className="lc507-fine">{result.scopeNotice}</p> : null}
        {result.exportNotice513 ? (
          <p className="lc507-fine" role="status">
            {result.exportNotice513}
          </p>
        ) : null}

        {result.compare ? (
          <div className="lc507-compare" role="status">
            {compareBanner507(result.compare)}
            {result.compare.remaining.length === 0 && result.compare.added.length === 0
              ? ` — ${NOTICE_RECHECK_EMPTY_506}`
              : ""}
          </div>
        ) : null}

        {result.readStatus === "partial" && result.notice ? (
          <div className="lc507-compare" role="status" style={{ background: "var(--lc507-warn-soft)" }}>
            {result.notice}
            <div className="mt-2 flex flex-wrap gap-2">
              {ocrAvailable && onStartOcr ? (
                <button type="button" className="lc507-cta" style={{ fontSize: 13, padding: "8px 12px" }} onClick={onStartOcr}>
                  사진·캡처에서 글자 읽기
                </button>
              ) : null}
              {onFocusPaste ? (
                <button type="button" className="lc507-copy" onClick={onFocusPaste}>
                  문구 붙여넣기로 점검
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <p className="lc507-verdict" ref={verdictRef} tabIndex={-1}>
          {verdict.headline}
          {verdict.subNote ? <small>{verdict.subNote}</small> : null}
          {metaLine ? <small>{metaLine}</small> : null}
        </p>

        {unreadable ? (
          <div role="status">
            {result.notice ? <p className="lc507-fine">{result.notice}</p> : null}
            <div className="mt-3 flex flex-col gap-2">
              {ocrAvailable && onStartOcr ? (
                <button type="button" className="lc507-cta" onClick={onStartOcr}>
                  사진·캡처에서 글자 읽기
                </button>
              ) : null}
              {onFocusPaste ? (
                <button type="button" className="lc507-cta" style={{ background: "var(--lc507-ink)" }} onClick={onFocusPaste}>
                  문구 붙여넣기로 점검
                </button>
              ) : (
                <p className="lc507-fine">문구를 붙여넣어 다시 점검해 주세요.</p>
              )}
            </div>
          </div>
        ) : null}

        {!unreadable && result.readStatus !== "partial" && result.notice ? (
          <p className="lc507-fine" role="status">
            {result.notice}
          </p>
        ) : null}

        {!result.skipJudgment && !unreadable ? (
          <>
            <div className={`lc507-score ${numAnim}`} aria-label="요약 숫자">
              <button type="button" className="lc507-s-bad" onClick={() => setTab("fix")}>
                <b>{displayFix}</b>고칠 것
              </button>
              <button type="button" className="lc507-s-warn" onClick={() => setTab("check")}>
                <b>{displayCheck}</b>확인할 것
              </button>
              <button type="button" className="lc507-s-unk" onClick={() => setTab("unknown")}>
                <b>{counts.unknown}</b>확인 못 함
              </button>
              <button type="button" className="lc507-s-ok" onClick={() => setTab("pass")}>
                <b>{counts.pass}</b>문제 없음
              </button>
            </div>

            {actionable.length > 0 ? (
              <div className="lc-r1 lc507-print-hide" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    height: 10,
                    borderRadius: 6,
                    background: "#E3E9E5",
                    overflow: "hidden",
                  }}
                  aria-hidden
                >
                  <div
                    className="lc-bar lc-h-full"
                    style={{
                      width: `${progressPct}%`,
                      background: "#0F3D36",
                      borderRadius: 6,
                    }}
                  />
                </div>
                <p className="lc507-fine" style={{ margin: 0, fontSize: 14 }}>
                  {progressText}
                </p>
                <p className="lc507-fine" style={{ margin: 0 }}>
                  고쳤다고 표시한 문구는 다시 점검하면 확인됩니다
                </p>
              </div>
            ) : null}

            {result.fixSheet ? (
              <div className="lc507-print-hide" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button type="button" className="lc507-cta" style={{ fontSize: 14, padding: "10px 16px" }} onClick={() => void copyAll()}>
                  {copiedAll ? "복사했어요" : "수정 문구 한꺼번에 복사"}
                </button>
                <span className="sr-only" aria-live="polite">
                  {copiedAll ? "복사했어요" : ""}
                </span>
              </div>
            ) : null}

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
                ? byTab.fix.map((f, i) => {
                    const key = findingKey(f);
                    return (
                      <FindingCard
                        key={`f-${i}`}
                        f={f}
                        index={i}
                        hideEvidence={hideEvidence}
                        done={Boolean(doneMap[key])}
                        onToggleDone={() => toggleDone(key)}
                        animClass={`lc-r${Math.min(5, i + 2)}`}
                        readStatus={result.readStatus}
                      />
                    );
                  })
                : null}
              {tab === "check" ? (
                <>
                  {byTab.check.map((f, i) => {
                    const key = findingKey(f);
                    return (
                      <FindingCard
                        key={`c-${i}`}
                        f={f}
                        index={i}
                        hideEvidence={hideEvidence}
                        done={Boolean(doneMap[key])}
                        onToggleDone={() => toggleDone(key)}
                        animClass={`lc-r${Math.min(5, i + 2)}`}
                        readStatus={result.readStatus}
                      />
                    );
                  })}
                  {result.manualItems.length ? (
                    <div className="lc507-item" style={{ borderStyle: "dashed" }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="lc507-chip lc507-c-unk">직접 확인</span>
                        <h3>판매자가 꼭 확인할 것</h3>
                      </div>
                      <ul className="list-disc space-y-2 pl-5 text-sm">
                        {result.manualItems.map((m, i) => (
                          <li key={i}>
                            <div className="font-medium">{m.label}</div>
                            <div>{m.suggest}</div>
                            {m.whyManual ? (
                              <div className="lc507-fine" style={{ marginTop: 2 }}>
                                {m.whyManual}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
              {tab === "unknown"
                ? byTab.unknown.map((f, i) => (
                    <FindingCard
                      key={`u-${i}`}
                      f={f}
                      index={i}
                      hideEvidence={hideEvidence}
                      animClass={`lc-r${Math.min(5, i + 2)}`}
                      readStatus={result.readStatus}
                    />
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
          <div className="lc507-card lc507-print-hide lc-r3" style={{ padding: 16, marginTop: 4 }}>
            <p className="text-sm font-bold">고친 문구로 다시 점검</p>
            <textarea
              className="lc507-textarea lc-textarea"
              aria-label="고친 문구 붙여넣기"
              value={recheckText}
              onChange={(e) => onRecheckText(e.target.value)}
            />
            <button
              type="button"
              className="lc507-cta lc-go"
              style={{ fontSize: 14, padding: "10px" }}
              disabled={recheckBusy || !recheckText.trim()}
              onClick={onRecheck}
            >
              {recheckBusy ? "다시 점검 중…" : "고친 문구로 다시 점검"}
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

        {(result.skippedItems513?.length || result.referenceNotes513?.length) ? (
          <div className="lc507-print-hide space-y-2" style={{ marginTop: 12 }}>
            {result.skippedItems513?.length ? (
              <details>
                <summary className="cursor-pointer text-sm font-semibold" style={{ color: "#5B6B65" }}>
                  이 제품에는 해당하지 않아 뺀 항목 {result.skippedItems513.length}건
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {result.skippedItems513.map((s, i) => (
                    <li key={i}>
                      {s.label} — {s.reason}
                    </li>
                  ))}
                </ul>
                <p className="lc507-fine mt-1">
                  제품 정보에서 해당 옵션을 체크하면 점검 대상이 됩니다.
                </p>
              </details>
            ) : null}
            {result.referenceNotes513?.length ? (
              <details>
                <summary className="cursor-pointer text-sm font-semibold" style={{ color: "#5B6B65" }}>
                  참고: 개정 예정·동향
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {result.referenceNotes513.map((n, i) => (
                    <li key={i}>
                      {n.label} — {n.text}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}

        <p className="lc507-fine" style={{ marginTop: 8 }}>
          참고용 사전 점검이며 법적 판단이 아닙니다.
        </p>

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
              {copiedAll ? "복사했어요" : "수정 문구 한꺼번에 복사"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
