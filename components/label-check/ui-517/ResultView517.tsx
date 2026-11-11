"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
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
import type { ResultView507Props } from "@/components/label-check/ui-507/ResultView";
import { FindingCardBody512 } from "@/components/label-check/ui-511/FindingCardBody512";
import { useLawBaseline516 } from "@/components/label-check/LawBaselineClient516";
import { collectPins517, type PinSpec517 } from "./pin-match-517";
import { LabelSourcePanel517 } from "./LabelSourcePanel517";

export type ResultView517Props = ResultView507Props & {
  /** 읽은 라벨 원문 — 없으면(저장본) 왼쪽 패널 숨김 */
  sourceText?: string | null;
  fileLabel?: string | null;
};

type FilterId517 = "all" | "fix" | "check" | "manual" | "pass";

type Row517 =
  | { id: string; no: number; kind: "finding"; f: Finding; bucket: UiBucket507 }
  | { id: string; no: number; kind: "manual"; m: LabelCheckResult["manualItems"][number]; bucket: "manual" };

const PIN_COLOR: Record<UiBucket507, string> = {
  fix: "#FF5A42",
  check: "#E0A12B",
  manual: "#8A9A94",
  unknown: "#8A9A94",
  pass: "#2FB67E",
};

const FILTER_LABEL: Record<FilterId517, string> = {
  all: "전체",
  fix: "고칠 것",
  check: "확인할 것",
  manual: "직접 확인",
  pass: "문제 없음",
};

const FILTER_ORDER: FilterId517[] = ["all", "fix", "check", "manual", "pass"];

const fineStyle: CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.6, color: "#4a4d54" };
const noticeStyle: CSSProperties = {
  margin: 0,
  padding: "12px 16px",
  borderRadius: 16,
  background: "#fff",
  border: "1px solid #e3e6ee",
  fontSize: 14,
  lineHeight: 1.6,
};
const outlineBtn: CSSProperties = {
  minHeight: 44,
  padding: "8px 16px",
  borderRadius: 12,
  border: "1.5px solid #111214",
  background: "#fff",
  color: "#111214",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
const solidBtn: CSSProperties = {
  ...outlineBtn,
  background: "#111214",
  color: "#fff",
};

function findingKey(f: Finding): string {
  return f.checkKey || `${f.status}:${f.label}:${f.found || ""}`;
}

function rowTone(bucket: UiBucket507, done: boolean): "fix" | "check" | "manual" | "ok" {
  if (done) return "ok";
  if (bucket === "fix") return "fix";
  if (bucket === "check") return "check";
  if (bucket === "pass") return "ok";
  return "manual";
}

function pillStyle(tone: "fix" | "check" | "manual" | "ok", onDark: boolean): CSSProperties {
  const base: CSSProperties = {
    flex: "none",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
  if (onDark) return { ...base, background: "#FF5A42", color: "#fff" };
  if (tone === "fix") return { ...base, background: "#fdecea", color: "#d6402b" };
  if (tone === "check") return { ...base, background: "#fff4dc", color: "#b7791f" };
  if (tone === "ok") return { ...base, background: "#e4f5ec", color: "#1f7a56" };
  return { ...base, background: "#edf0ee", color: "#4f5c56" };
}

function Num({ children, color }: { children: number; color: string }) {
  return <span style={{ color }}>{children}</span>;
}

export function ResultView517({
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
  lawBaseline,
  sourceText,
  fileLabel,
}: ResultView517Props) {
  const lawBaselineLine = useLawBaseline516(lawBaseline);
  const verdictRef = useRef<HTMLHeadingElement>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollToId = useRef<string | null>(null);
  const unreadable = result.readStatus === "unreadable";
  const judged = !result.skipJudgment && !unreadable;
  const source = (sourceText || "").trim() ? (sourceText as string) : "";
  const hasSource = Boolean(source);

  const counts = useMemo(() => {
    const fix = result.summary.possible || 0;
    const check = (result.summary.attention || 0) + (result.summary.manual || 0);
    const unknown = result.summary.unknown || 0;
    const pass = result.summary.pass || 0;
    return { fix, check, unknown, pass };
  }, [result.summary]);

  const sorted = useMemo(() => sortFindings507(result.findings), [result.findings]);

  const rows = useMemo<Row517[]>(() => {
    const out: Row517[] = sorted.map((f, i) => ({
      id: `f-${i}`,
      no: i + 1,
      kind: "finding" as const,
      f,
      bucket: statusToBucket507(f.status),
    }));
    (result.manualItems || []).forEach((m, i) => {
      out.push({ id: `m-${i}`, no: out.length + 1, kind: "manual", m, bucket: "manual" });
    });
    return out;
  }, [sorted, result.manualItems]);

  const rowsFor = useCallback(
    (filter: FilterId517): Row517[] => {
      if (filter === "all") return rows;
      if (filter === "manual") return rows.filter((r) => r.bucket === "manual");
      return rows.filter((r) => r.bucket === filter);
    },
    [rows],
  );

  /** 기본 열림: 가장 심각한 버킷의 첫 행 */
  const firstSevereId = useCallback(
    (list: Row517[]): string | null => {
      const bucket = defaultTab507(counts);
      return (list.find((r) => r.bucket === bucket) ?? list[0])?.id ?? null;
    },
    [counts],
  );

  const [filter, setFilter] = useState<FilterId517>("all");
  const [openId, setOpenId] = useState<string | null>(() => firstSevereId(rows));
  const [copiedAll, setCopiedAll] = useState(false);
  /** 화면 전용 — 저장·결과 데이터에 섞이지 않음 */
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [doneTick, setDoneTick] = useState(0);

  useEffect(() => {
    setFilter("all");
    setOpenId(firstSevereId(rows));
    setDoneMap({});
    setDoneTick(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    verdictRef.current?.focus();
  }, [result]);

  useEffect(() => {
    const id = scrollToId.current;
    if (!id || openId !== id) return;
    scrollToId.current = null;
    rowRefs.current[id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [openId, filter]);

  const verdict = buildVerdict507(result.summary, {
    readStatus: result.readStatus,
    skipJudgment: result.skipJudgment,
  });

  const actionable = useMemo(
    () => sorted.filter((f) => f.status === "possible" || f.status === "attention"),
    [sorted],
  );
  const resolved = actionable.filter((f) => doneMap[findingKey(f)]).length;
  const remaining = Math.max(0, actionable.length - resolved);
  const progressPct = actionable.length ? Math.round((resolved / actionable.length) * 100) : 0;
  const numAnim = doneTick % 2 === 0 ? "lc-numA" : "lc-numB";

  const displayFix = Math.max(
    0,
    counts.fix - sorted.filter((f) => f.status === "possible" && doneMap[findingKey(f)]).length,
  );
  const displayCheck = Math.max(
    0,
    counts.check - sorted.filter((f) => f.status === "attention" && doneMap[findingKey(f)]).length,
  );

  const filterCounts: Record<FilterId517, number> = {
    all: rows.length,
    fix: rows.filter((r) => r.bucket === "fix").length,
    check: rows.filter((r) => r.bucket === "check").length,
    manual: rows.filter((r) => r.bucket === "manual").length,
    pass: rows.filter((r) => r.bucket === "pass").length,
  };

  const visibleRows = rowsFor(filter);

  const selectFilter = (next: FilterId517) => {
    setFilter(next);
    setOpenId(rowsFor(next)[0]?.id ?? null);
  };

  const onFilterKey = (e: KeyboardEvent) => {
    const i = FILTER_ORDER.indexOf(filter);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      selectFilter(FILTER_ORDER[(i + 1) % FILTER_ORDER.length]!);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectFilter(FILTER_ORDER[(i - 1 + FILTER_ORDER.length) % FILTER_ORDER.length]!);
    }
  };

  const toggleRow = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  const onPinClick = useCallback((id: string) => {
    scrollToId.current = id;
    setFilter("all");
    setOpenId(id);
  }, []);

  const pins = useMemo(() => {
    if (!hasSource) return [];
    const specs: PinSpec517[] = [];
    for (const r of rows) {
      if (r.kind !== "finding" || r.f.status === "pass") continue;
      const needle = (r.f.evidence?.[0]?.found || r.f.found || "").trim();
      if (!needle) continue;
      specs.push({ id: r.id, no: r.no, needle, color: PIN_COLOR[r.bucket] });
    }
    return collectPins517(source, specs);
  }, [hasSource, rows, source]);

  const toggleDone = (key: string) => {
    setDoneMap((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
    setDoneTick((n) => n + 1);
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
    fileLabel || null,
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

  const ratioTotal = counts.fix + counts.check + counts.unknown + counts.pass;
  const ratioParts: Array<{ n: number; color: string }> = [
    { n: counts.fix, color: "#FF5A42" },
    { n: counts.check, color: "#FFC857" },
    { n: counts.unknown, color: "#8A9A94" },
    { n: counts.pass, color: "#2FB67E" },
  ];

  const showCounts = judged && (counts.fix > 0 || counts.check > 0);

  const stats: Array<{ label: string; n: number; color: string; onClick: () => void }> = [
    { label: "고칠 것", n: displayFix, color: "#FF7A66", onClick: () => selectFilter("fix") },
    { label: "확인할 것", n: displayCheck, color: "#FFC857", onClick: () => selectFilter("check") },
    {
      label: "확인 못 함",
      n: counts.unknown,
      color: "#B4BDB8",
      onClick: () => {
        setFilter("all");
        setOpenId(rows.find((r) => r.bucket === "unknown")?.id ?? rows[0]?.id ?? null);
      },
    },
    { label: "문제 없음", n: counts.pass, color: "#5FD3A0", onClick: () => selectFilter("pass") },
  ];

  const renderRow = (r: Row517, idx: number) => {
    const open = openId === r.id;
    const finding = r.kind === "finding" ? r.f : null;
    const key = finding ? findingKey(finding) : r.id;
    const done = Boolean(finding && doneMap[key]);
    const tone = rowTone(r.bucket, done);
    const openFix = open && tone === "fix";
    const title = finding ? finding.label : r.kind === "manual" ? r.m.label : "";
    const pillText = done ? "고쳤어요" : bucketLabel507(r.bucket);
    const bodyId = `lc517-body-${r.id}`;
    const btnId = `lc517-row-${r.id}`;
    const actionableRow =
      finding && (finding.status === "possible" || finding.status === "attention");
    const wantsBody =
      finding &&
      (finding.status === "possible" ||
        finding.status === "attention" ||
        finding.status === "unknown");

    return (
      <div
        key={r.id}
        ref={(el) => {
          rowRefs.current[r.id] = el;
        }}
        className={`lc517-row${open ? " open" : ""} ${tone}`}
        style={{
          animationDelay: `${Math.min(idx, 6) * 40}ms`,
          opacity: done && !open ? 0.65 : undefined,
          cursor: "default",
        }}
      >
        <button
          type="button"
          id={btnId}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => toggleRow(r.id)}
          style={{
            all: "unset",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            minHeight: 44,
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden
            style={{
              flex: "none",
              width: 30,
              height: 30,
              borderRadius: 15,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              background: openFix ? "#fff" : PIN_COLOR[r.bucket],
              color: openFix ? "#111214" : "#fff",
            }}
          >
            {r.no}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.4, wordBreak: "keep-all" }}>
            {title}
          </span>
          <span style={pillStyle(tone, openFix)}>{pillText}</span>
          <span
            aria-hidden
            style={{
              flex: "none",
              fontSize: 14,
              transition: "transform .2s",
              transform: open ? "rotate(90deg)" : "none",
            }}
          >
            →
          </span>
        </button>

        {open ? (
          <div
            id={bodyId}
            role="region"
            aria-labelledby={btnId}
            style={{
              marginTop: 12,
              padding: "4px 16px 16px",
              borderRadius: 14,
              background: "#fff",
              color: "#111214",
            }}
          >
            {finding && wantsBody ? (
              <FindingCardBody512
                f={finding}
                hideEvidence={hideEvidence}
                readStatus={result.readStatus}
              />
            ) : null}
            {finding && finding.status === "pass" ? (
              <p style={{ ...fineStyle, marginTop: 12 }}>이번 점검에서는 문제가 보이지 않았어요.</p>
            ) : null}
            {r.kind === "manual" ? (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{r.m.suggest}</p>
                {r.m.whyManual ? <p style={{ ...fineStyle, marginTop: 6 }}>{r.m.whyManual}</p> : null}
              </div>
            ) : null}
            {actionableRow ? (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  style={done ? outlineBtn : solidBtn}
                  onClick={() => toggleDone(key)}
                >
                  {done ? "되돌리기" : "고쳤어요"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <section
        className="lc517-result"
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div className="lc517-summary" style={judged ? undefined : { gridTemplateColumns: "minmax(0, 1fr)" }}>
          <div style={{ minWidth: 0 }}>
            {metaLine ? (
              <p style={{ margin: 0, fontSize: 13, color: "#b9bcc4", wordBreak: "break-word" }}>{metaLine}</p>
            ) : null}
            <h2
              ref={verdictRef}
              tabIndex={-1}
              style={{
                margin: "10px 0 0",
                fontSize: "clamp(26px, 4vw, 38px)",
                lineHeight: 1.3,
                fontWeight: 800,
                wordBreak: "keep-all",
                outline: "none",
              }}
            >
              {showCounts ? (
                <>
                  고칠 것 <Num color="#FF7A66">{counts.fix}</Num>개, 확인할 것{" "}
                  <Num color="#FFC857">{counts.check}</Num>개가 있어요
                </>
              ) : (
                verdict.headline
              )}
            </h2>
            {verdict.subNote && !showCounts ? (
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#b9bcc4" }}>{verdict.subNote}</p>
            ) : null}

            {judged && ratioTotal > 0 ? (
              <div className="lc517-ratio" style={{ marginTop: 22 }} aria-hidden>
                {ratioParts
                  .filter((p) => p.n > 0)
                  .map((p, i) => (
                    <span key={i} style={{ flex: p.n, background: p.color }} />
                  ))}
              </div>
            ) : null}

            {judged && actionable.length > 0 ? (
              <div className="lc507-print-hide" style={{ marginTop: 18 }}>
                <div
                  style={{ height: 10, borderRadius: 10, background: "rgba(255,255,255,.14)", overflow: "hidden" }}
                  role="progressbar"
                  aria-label="고친 항목 진행률"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPct}
                >
                  <div
                    className="lc-bar lc-h-full"
                    style={{
                      width: `${progressPct}%`,
                      height: "100%",
                      background: "#5FD3A0",
                      borderRadius: 10,
                      transition: "width .35s ease",
                    }}
                  />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "#e3e6ee" }}>{progressText}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#9ea1a9" }}>
                  고쳤다고 표시한 문구는 다시 점검하면 확인됩니다
                </p>
              </div>
            ) : null}
          </div>

          {judged ? (
            <div
              className={numAnim}
              aria-label="요약 숫자"
              style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}
            >
              {stats.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={s.onClick}
                  style={{
                    border: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    padding: "16px 18px",
                    minHeight: 44,
                    borderRadius: 20,
                    background: "rgba(255,255,255,.07)",
                    color: "#e3e6ee",
                    fontSize: 13.5,
                    fontWeight: 700,
                  }}
                >
                  <b style={{ display: "block", fontSize: 40, lineHeight: 1.1, fontWeight: 800, color: s.color }}>
                    {s.n}
                  </b>
                  {s.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {(result.ocrFromPhoto ||
          result.scopeNotice ||
          result.exportNotice513 ||
          result.compare ||
          (result.notice && !unreadable) ||
          unreadable) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.ocrFromPhoto ? <p style={fineStyle}>사진에서 읽은 글자 기준</p> : null}
            {result.scopeNotice ? <p style={fineStyle}>{result.scopeNotice}</p> : null}
            {result.exportNotice513 ? (
              <p style={fineStyle} role="status">
                {result.exportNotice513}
              </p>
            ) : null}
            {result.compare ? (
              <div style={noticeStyle} role="status">
                {compareBanner507(result.compare)}
                {result.compare.remaining.length === 0 && result.compare.added.length === 0
                  ? ` — ${NOTICE_RECHECK_EMPTY_506}`
                  : ""}
              </div>
            ) : null}
            {result.readStatus === "partial" && result.notice ? (
              <div style={{ ...noticeStyle, background: "#fff9e8" }} role="status">
                {result.notice}
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ocrAvailable && onStartOcr ? (
                    <button type="button" style={solidBtn} onClick={onStartOcr}>
                      사진·캡처에서 글자 읽기
                    </button>
                  ) : null}
                  {onFocusPaste ? (
                    <button type="button" style={outlineBtn} onClick={onFocusPaste}>
                      문구 붙여넣기로 점검
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {unreadable ? (
              <div role="status" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.notice ? <p style={fineStyle}>{result.notice}</p> : null}
                {ocrAvailable && onStartOcr ? (
                  <button type="button" style={solidBtn} onClick={onStartOcr}>
                    사진·캡처에서 글자 읽기
                  </button>
                ) : null}
                {onFocusPaste ? (
                  <button type="button" style={outlineBtn} onClick={onFocusPaste}>
                    문구 붙여넣기로 점검
                  </button>
                ) : (
                  <p style={fineStyle}>문구를 붙여넣어 다시 점검해 주세요.</p>
                )}
              </div>
            ) : null}
            {!unreadable && result.readStatus !== "partial" && result.notice ? (
              <p style={fineStyle} role="status">
                {result.notice}
              </p>
            ) : null}
          </div>
        ) : null}

        {judged ? (
          <div className={hasSource ? "lc517-result-grid" : "lc517-result-grid solo"}>
            {hasSource ? (
              <LabelSourcePanel517
                sourceText={source}
                pins={pins}
                activePinId={openId}
                onPinClick={onPinClick}
                fileLabel={fileLabel}
              />
            ) : null}

            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {result.fixSheet ? (
                <div className="lc507-print-hide" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button type="button" style={solidBtn} onClick={() => void copyAll()}>
                    {copiedAll ? "복사했어요" : "수정 문구 한꺼번에 복사"}
                  </button>
                  <span className="sr-only" aria-live="polite">
                    {copiedAll ? "복사했어요" : ""}
                  </span>
                </div>
              ) : null}

              <div className="lc517-filters" role="tablist" aria-label="결과 필터" onKeyDown={onFilterKey}>
                {FILTER_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`lc517-tab-${id}`}
                    aria-selected={filter === id}
                    aria-controls="lc517-list"
                    tabIndex={filter === id ? 0 : -1}
                    onClick={() => selectFilter(id)}
                  >
                    {FILTER_LABEL[id]} {filterCounts[id]}
                  </button>
                ))}
              </div>

              <div
                id="lc517-list"
                role="tabpanel"
                aria-labelledby={`lc517-tab-${filter}`}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {visibleRows.map((r, i) => renderRow(r, i))}
                {visibleRows.length === 0 ? <p style={fineStyle}>이 필터에 해당하는 항목이 없어요.</p> : null}
              </div>

              {result.skippedItems513?.length ? (
                <section
                  className="lc507-print-hide"
                  style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}
                  aria-label="뺀 항목"
                >
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#4a4d54" }}>
                    이 제품에는 해당하지 않아 뺀 항목 {result.skippedItems513.length}건
                  </h3>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.skippedItems513.map((s, i) => (
                      <li
                        key={i}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 16,
                          border: "1.5px solid #e3e6ee",
                          background: "#fff",
                          fontSize: 14,
                          lineHeight: 1.6,
                        }}
                      >
                        <b>{s.label}</b> — {s.reason}
                      </li>
                    ))}
                  </ul>
                  <p style={fineStyle}>제품 정보에서 해당 옵션을 체크하면 점검 대상이 됩니다.</p>
                </section>
              ) : null}

              {result.referenceNotes513?.length ? (
                <section
                  className="lc507-print-hide"
                  style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}
                  aria-label="참고"
                >
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#4a4d54" }}>
                    참고: 개정 예정·동향
                  </h3>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.referenceNotes513.map((n, i) => (
                      <li
                        key={i}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 16,
                          border: "1.5px solid #e3e6ee",
                          background: "#fff",
                          fontSize: 14,
                          lineHeight: 1.6,
                        }}
                      >
                        <b>{n.label}</b> — {n.text}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        ) : null}

        {onRecheck && onRecheckText ? (
          <div
            className="lc507-print-hide"
            style={{
              padding: 20,
              borderRadius: 24,
              background: "#fff",
              border: "1px solid #e3e6ee",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>고친 문구로 다시 점검</p>
            <textarea
              className="lc-textarea"
              aria-label="고친 문구 붙여넣기"
              value={recheckText}
              onChange={(e) => onRecheckText(e.target.value)}
              style={{
                minHeight: 120,
                padding: 12,
                borderRadius: 14,
                border: "1.5px solid #e3e6ee",
                font: "inherit",
                fontSize: 15,
                resize: "vertical",
              }}
            />
            <button
              type="button"
              className="lc-go"
              style={{ ...solidBtn, opacity: recheckBusy || !recheckText.trim() ? 0.5 : 1 }}
              disabled={recheckBusy || !recheckText.trim()}
              onClick={onRecheck}
            >
              {recheckBusy ? "다시 점검 중…" : "고친 문구로 다시 점검"}
            </button>
          </div>
        ) : null}

        <footer style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
          {isMember ? (
            <p style={fineStyle}>
              {savedId ? "이 결과 저장됨 · " : null}
              <Link href="/label-check/history" className="underline-offset-2 hover:underline">
                내 결과
              </Link>
            </p>
          ) : (
            <p style={fineStyle}>
              가입하면 결과를 다시 볼 수 있어요.{" "}
              <Link href="/signup" className="underline-offset-2 hover:underline">
                가입
              </Link>
            </p>
          )}

          {lawBaselineLine ? (
            <p style={fineStyle} className="lc516-law-baseline">
              {lawBaselineLine}
            </p>
          ) : null}

          <p style={fineStyle}>참고용 사전 점검이며 법적 판단이 아닙니다.</p>

          <p className="lc507-print-hide" style={fineStyle}>
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
              onClick={() => window.print()}
            >
              인쇄/PDF로 저장
            </button>
          </p>
        </footer>
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
