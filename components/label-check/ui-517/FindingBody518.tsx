"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { Finding, LabelCheckResult } from "@/lib/label-check/types";
import { highlightEvidence507 } from "@/lib/label-check/ui-status-507";
import {
  classifyFinding512,
  collectFixExamples512,
  extractMeasureBaseline512,
  isVagueSuggest512,
  type FindingKind512,
} from "@/components/label-check/ui-511/finding-kind-512";

/** 518 — 펼친 결과 카드 본문(시안 v5). 표현만 바꾸고 512 분류·데이터는 그대로 쓴다. */

export const EXAMPLE_DISCLAIMER_518 = "예시 문구입니다. 제품에 맞게 고치고, 최종 확인은 판매자가 합니다.";

export type FindingBody518Props = {
  f: Finding;
  /** 검정 카드(고칠 것 펼침)일 때 true — 블록을 반투명 색으로 */
  dark?: boolean;
  hideEvidence?: boolean;
  readStatus?: LabelCheckResult["readStatus"];
  done?: boolean;
  /** 있으면 하단 오른쪽에 "고쳤어요" 버튼 */
  onToggleDone?: () => void;
};

type Block518 = {
  label: string;
  /** "before" 톤(붉은) / "after" 톤(푸른) */
  tone: "before" | "after";
  content: ReactNode;
};

function copyText(text: string): Promise<boolean> {
  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    });
}

function CopyBtn518({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const onCopy = useCallback(async () => {
    const ok = await copyText(text);
    if (!ok) return;
    setDone(true);
    window.setTimeout(() => setDone(false), 1500);
  }, [text]);
  return (
    <button type="button" className="lc518-copy" onClick={() => void onCopy()} aria-live="polite">
      {done ? "복사했어요" : "복사"}
    </button>
  );
}

function BlockView({ b }: { b: Block518 }) {
  return (
    <div className={`lc518-block ${b.tone}`}>
      <div className="lc518-block-label lc517-mono">{b.label}</div>
      {b.content}
    </div>
  );
}

function ExampleRows({ examples }: { examples: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? examples : examples.slice(0, 3);
  const more = Math.max(0, examples.length - 3);
  return (
    <>
      {visible.map((ex, i) => (
        <div key={i} className="lc518-after-row">
          <span className="lc518-after-text">{ex}</span>
          <CopyBtn518 text={ex} />
        </div>
      ))}
      {more > 0 && !expanded ? (
        <button type="button" className="lc518-more" onClick={() => setExpanded(true)}>
          더 보기 ({more})
        </button>
      ) : null}
    </>
  );
}

function EvidenceView({ f }: { f: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const list = f.evidence || [];
  if (!list.length) {
    const raw = (f.found || "").trim();
    return raw ? <div className="lc518-text">{raw}</div> : null;
  }
  const visible = expanded ? list : list.slice(0, 3);
  const more = Math.max(0, list.length - 3);
  return (
    <>
      {visible.map((ev, i) => {
        const h = highlightEvidence507(ev.sentence, ev.found);
        return (
          <div key={i} className="lc518-text">
            {h ? (
              <>
                {h.before}
                <u className="lc518-hit">{h.hit}</u>
                {h.after}
              </>
            ) : (
              <u className="lc518-hit">{ev.found}</u>
            )}
          </div>
        );
      })}
      {more > 0 && !expanded ? (
        <button type="button" className="lc518-more" onClick={() => setExpanded(true)}>
          더 보기 ({more})
        </button>
      ) : null}
    </>
  );
}

function usefulText(...cands: Array<string | null | undefined>): string | null {
  for (const c of cands) {
    if (c && !isVagueSuggest512(c)) return c;
  }
  return null;
}

type Built518 = {
  why: string;
  blocks: Block518[];
  hasExample: boolean;
  note?: string | null;
};

function exceptionText(f: Finding): string | null {
  return f.exception?.text || f.exceptionNote || null;
}

function buildWording(f: Finding, hideEvidence?: boolean): Built518 {
  const why = usefulText(f.suggest) ?? `"${f.label}"에 해당할 수 있는 표현이에요.`;
  const examples = collectFixExamples512(f);
  const isDelete = f.fix?.kind === "delete";
  const note = usefulText(f.fix?.note, f.fix?.headline, f.suggest);
  const blocks: Block518[] = [];
  if (!hideEvidence) {
    blocks.push({ label: "BEFORE", tone: "before", content: <EvidenceView f={f} /> });
  }
  let hasExample = false;
  if (isDelete) {
    blocks.push({
      label: "AFTER",
      tone: "after",
      content: <div className="lc518-text strong">이 문구는 빼는 것을 권해요</div>,
    });
  } else if (examples.length) {
    hasExample = true;
    blocks.push({ label: "AFTER", tone: "after", content: <ExampleRows examples={examples} /> });
  } else if (note && note !== why) {
    blocks.push({
      label: "이렇게 확인해 보세요",
      tone: "after",
      content: <div className="lc518-text">{note}</div>,
    });
  }
  return { why, blocks, hasExample, note: exceptionText(f) };
}

function buildMissing(f: Finding, readStatus?: LabelCheckResult["readStatus"]): Built518 {
  const partial = readStatus === "partial";
  const examples = collectFixExamples512(f);
  const how = usefulText(f.suggest, f.fix?.note, f.fix?.headline);
  const blocks: Block518[] = [
    {
      label: "라벨에서",
      tone: "before",
      content: (
        <div className="lc518-text">
          찾지 못했어요
          {partial ? " (일부만 읽어서 놓쳤을 수도 있어요. 읽은 글자를 확인해 주세요)" : ""}
        </div>
      ),
    },
  ];
  let hasExample = false;
  if (examples.length) {
    hasExample = true;
    blocks.push({ label: "이렇게 넣어 보세요", tone: "after", content: <ExampleRows examples={examples} /> });
  } else if (how) {
    blocks.push({
      label: "이렇게 넣어 보세요",
      tone: "after",
      content: <div className="lc518-text">{how}</div>,
    });
  }
  return {
    why: `"${f.label}"을(를) 라벨에서 찾지 못했어요.`,
    blocks,
    hasExample,
  };
}

function buildMeasure(f: Finding): Built518 {
  const why = usefulText(f.suggest) ?? "기준보다 작거나 확인이 필요해요.";
  const baseline = extractMeasureBaseline512(f.found || "");
  const how = usefulText(f.suggest, f.fix?.note);
  const blocks: Block518[] = [
    {
      label: "읽은 값",
      tone: "before",
      content: <div className="lc518-text">{f.found}</div>,
    },
  ];
  if (baseline) {
    blocks.push({
      label: "기준",
      tone: "after",
      content: <div className="lc518-text lc517-mono">{baseline}</div>,
    });
  } else if (how && how !== why) {
    blocks.push({
      label: "이렇게 확인해 보세요",
      tone: "after",
      content: <div className="lc518-text">{how}</div>,
    });
  }
  return { why, blocks, hasExample: false };
}

function buildOther(f: Finding, hideEvidence?: boolean): Built518 {
  const why =
    usefulText(f.suggest, f.fix?.headline) ?? `"${f.label}"을(를) 한 번 더 확인해 주세요.`;
  const examples = collectFixExamples512(f);
  const how = usefulText(f.fix?.note, f.suggest);
  const blocks: Block518[] = [];
  if (!hideEvidence && (f.found || f.evidence?.length)) {
    blocks.push({ label: "라벨에서", tone: "before", content: <EvidenceView f={f} /> });
  }
  let hasExample = false;
  if (examples.length) {
    hasExample = true;
    blocks.push({ label: "이렇게 수정해 보세요", tone: "after", content: <ExampleRows examples={examples} /> });
  } else if (how && how !== why) {
    blocks.push({
      label: "이렇게 수정해 보세요",
      tone: "after",
      content: <div className="lc518-text">{how}</div>,
    });
  }
  return { why, blocks, hasExample };
}

export function FindingBody518({
  f,
  dark = false,
  hideEvidence,
  readStatus,
  done = false,
  onToggleDone,
}: FindingBody518Props) {
  const kind: FindingKind512 = classifyFinding512(f);
  const built =
    kind === "missing"
      ? buildMissing(f, readStatus)
      : kind === "wording"
        ? buildWording(f, hideEvidence)
        : kind === "measure"
          ? buildMeasure(f)
          : buildOther(f, hideEvidence);

  const law = f.basis?.law
    ? `기준: ${f.basis.law}${f.basis.source ? ` · ${f.basis.source}` : ""}`
    : "";

  return (
    <div className={`lc518-body${dark ? " dark" : ""}`} data-kind={kind}>
      <p className="lc518-why">{built.why}</p>

      {built.blocks.length ? (
        <div className="lc518-blocks">
          {built.blocks.map((b, i) => (
            <BlockView key={i} b={b} />
          ))}
        </div>
      ) : null}

      {built.note ? <p className="lc518-fine">예외가 될 수 있어요: {built.note}</p> : null}
      {built.hasExample ? <p className="lc518-fine">{EXAMPLE_DISCLAIMER_518}</p> : null}

      {law || onToggleDone ? (
        <div className="lc518-bottom">
          <span className="lc518-law">{law}</span>
          {onToggleDone ? (
            <button
              type="button"
              className={`lc518-done${done ? " on" : ""}`}
              aria-pressed={done}
              onClick={onToggleDone}
            >
              {done ? "고쳤어요 ✓" : "고쳤어요"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { classifyFinding512 };
