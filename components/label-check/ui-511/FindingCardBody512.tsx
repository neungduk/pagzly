"use client";

import { useState } from "react";
import type { Finding, LabelCheckResult } from "@/lib/label-check/types";
import { highlightEvidence507 } from "@/lib/label-check/ui-status-507";
import { CopyButton507 } from "@/components/label-check/ui-507/CopyButton";
import {
  classifyFinding512,
  collectFixExamples512,
  extractMeasureBaseline512,
  isVagueSuggest512,
  type FindingKind512,
} from "./finding-kind-512";

function ProblemLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="lc512-problem" style={{ margin: "10px 0 0", fontSize: 15, fontWeight: 800, lineHeight: 1.55, color: "#13201C" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#5B6B65", marginBottom: 4 }}>
        무엇이 문제인가요
      </span>
      {children}
    </p>
  );
}

function SeenLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="lc512-seen" style={{ marginTop: 12 }}>
      <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#5B6B65" }}>라벨에서 확인한 내용</p>
      {children}
    </div>
  );
}

function FixBlock({
  title,
  children,
  showExampleNote,
}: {
  title: string;
  children: React.ReactNode;
  showExampleNote?: boolean;
}) {
  return (
    <div className="lc511-fix-block">
      <p className="lc511-fix-title">{title}</p>
      {children}
      {showExampleNote ? (
        <p className="lc507-fine" style={{ margin: 0 }}>
          예시 문구입니다. 제품에 맞게 고치고, 최종 확인은 판매자가 합니다.
        </p>
      ) : null}
    </div>
  );
}

function EvidenceList({ f, hideEvidence }: { f: Finding; hideEvidence?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (hideEvidence) return null;
  const list = f.evidence || [];
  if (!list.length) {
    const raw = (f.found || "").trim();
    if (!raw) return <p className="lc507-fine" style={{ margin: 0 }}>확인한 원문을 찾지 못했어요.</p>;
    return <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>&quot;{raw}&quot;</p>;
  }
  const visible = expanded ? list.slice(0, 3) : list.slice(0, Math.min(3, list.length));
  const more = Math.max(0, list.length - 3);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {visible.map((ev, i) => {
        const h = highlightEvidence507(ev.sentence, ev.found);
        if (!h) {
          return (
            <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>
              <strong style={{ background: "rgba(214,64,43,.14)", padding: "0 2px" }}>{ev.found}</strong>
            </p>
          );
        }
        return (
          <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: 1.7, wordBreak: "break-word" }}>
            “{h.before}
            <mark className="lc512-hit" style={{ background: "rgba(214,64,43,.18)", fontWeight: 800, padding: "0 2px" }}>
              {h.hit}
            </mark>
            {h.after}”
          </p>
        );
      })}
      {more > 0 && !expanded ? (
        <button type="button" className="lc507-copy" onClick={() => setExpanded(true)}>
          더 보기 ({more})
        </button>
      ) : null}
      {expanded && list.length > 3
        ? list.slice(3).map((ev, i) => {
            const h = highlightEvidence507(ev.sentence, ev.found);
            return (
              <p key={`m-${i}`} style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>
                {h ? (
                  <>
                    “{h.before}
                    <mark className="lc512-hit" style={{ background: "rgba(214,64,43,.18)", fontWeight: 800 }}>
                      {h.hit}
                    </mark>
                    {h.after}”
                  </>
                ) : (
                  <strong>{ev.found}</strong>
                )}
              </p>
            );
          })
        : null}
    </div>
  );
}

function WordingFix({ f }: { f: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const examples = collectFixExamples512(f);
  const hit = f.evidence?.[0]?.found?.trim() || "";
  const isDelete = f.fix?.kind === "delete";
  const usefulSuggest = !isVagueSuggest512(f.suggest) ? f.suggest : null;
  const note = f.fix?.note || f.fix?.headline || usefulSuggest;

  if (isDelete) {
    return (
      <FixBlock title="이렇게 고쳐 보세요">
        <p style={{ margin: 0, fontSize: 15 }}>이 문구는 빼는 것을 권해요</p>
        {f.exception?.text ? (
          <p className="lc507-fine" style={{ margin: 0 }}>
            예외가 될 수 있어요: {f.exception.text}
          </p>
        ) : f.exceptionNote ? (
          <p className="lc507-fine" style={{ margin: 0 }}>
            예외가 될 수 있어요: {f.exceptionNote}
          </p>
        ) : null}
      </FixBlock>
    );
  }

  if (!examples.length && !note) return null;

  const visible = expanded ? examples : examples.slice(0, Math.min(3, examples.length));
  const more = Math.max(0, examples.length - 3);

  return (
    <FixBlock title="이렇게 고쳐 보세요" showExampleNote={examples.length > 0}>
      {visible.map((ex, i) => (
        <div key={`w-${i}`} className="lc511-pair">
          {hit ? <span className="before">{hit}</span> : null}
          {hit ? <span aria-hidden>→</span> : null}
          <span className="after">{ex}</span>
          <CopyButton507 text={ex} />
        </div>
      ))}
      {more > 0 && !expanded ? (
        <button type="button" className="lc507-copy" onClick={() => setExpanded(true)}>
          더 보기 ({more})
        </button>
      ) : null}
      {expanded && examples.length > 3
        ? examples.slice(3).map((ex, i) => (
            <div key={`wm-${i}`} className="lc511-pair">
              {hit ? <span className="before">{hit}</span> : null}
              {hit ? <span aria-hidden>→</span> : null}
              <span className="after">{ex}</span>
              <CopyButton507 text={ex} />
            </div>
          ))
        : null}
      {!examples.length && note ? (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{note}</p>
      ) : null}
      {f.exception?.text ? (
        <p className="lc507-fine" style={{ margin: 0 }}>
          예외가 될 수 있어요: {f.exception.text}
        </p>
      ) : f.exceptionNote ? (
        <p className="lc507-fine" style={{ margin: 0 }}>
          예외가 될 수 있어요: {f.exceptionNote}
        </p>
      ) : null}
    </FixBlock>
  );
}

function MissingFix({ f }: { f: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const examples = collectFixExamples512(f);
  const usefulSuggest = !isVagueSuggest512(f.suggest) ? f.suggest : null;
  const how = usefulSuggest || (!isVagueSuggest512(f.fix?.note) ? f.fix?.note : null) || (!isVagueSuggest512(f.fix?.headline) ? f.fix?.headline : null);

  if (!examples.length && !how) return null;

  const visible = expanded ? examples : examples.slice(0, Math.min(3, examples.length));
  const more = Math.max(0, examples.length - 3);

  return (
    <FixBlock title="이렇게 넣어 보세요" showExampleNote={examples.length > 0}>
      {visible.map((ex, i) => (
        <div key={`m-${i}`} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 15 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#5B6B65" }}>추가할 문구</span>
          <span className="after" style={{ background: "rgba(31,122,86,.14)", color: "#1F7A56", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
            {ex}
          </span>
          <CopyButton507 text={ex} />
        </div>
      ))}
      {more > 0 && !expanded ? (
        <button type="button" className="lc507-copy" onClick={() => setExpanded(true)}>
          더 보기 ({more})
        </button>
      ) : null}
      {!examples.length && how ? (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>
          <b>넣는 방법</b> · {how}
        </p>
      ) : null}
    </FixBlock>
  );
}

function MeasureFix({ f }: { f: Finding }) {
  const text =
    (!isVagueSuggest512(f.suggest) && f.suggest) ||
    (!isVagueSuggest512(f.fix?.note) && f.fix?.note) ||
    null;
  if (!text) return null;
  return (
    <FixBlock title="이렇게 확인해 보세요">
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{text}</p>
    </FixBlock>
  );
}

function BasisLine({ f }: { f: Finding }) {
  if (!f.basis?.law) return null;
  return (
    <p className="lc507-fine lc512-basis" style={{ marginTop: 10, fontSize: 12 }}>
      기준: {f.basis.law}
      {f.basis.source ? ` — ${f.basis.source}` : ""}
    </p>
  );
}

function MissingBody({
  f,
  readStatus,
}: {
  f: Finding;
  readStatus?: LabelCheckResult["readStatus"];
}) {
  const partial = readStatus === "partial";
  return (
    <>
      <ProblemLine>
        &quot;{f.label}&quot;을(를) 라벨에서 찾지 못했어요.
      </ProblemLine>
      <SeenLine>
        <p className="lc507-fine" style={{ margin: 0, fontSize: 14, color: "#5B6B65" }}>
          사진/PDF에서 읽은 글자 안에는 이 표기가 없어요.
          {partial ? " 일부만 읽어서 놓쳤을 수도 있어요. 읽은 글자를 확인해 주세요." : ""}
        </p>
      </SeenLine>
      <MissingFix f={f} />
      <BasisLine f={f} />
    </>
  );
}

function WordingBody({ f, hideEvidence }: { f: Finding; hideEvidence?: boolean }) {
  const problem =
    !isVagueSuggest512(f.suggest) && f.suggest
      ? f.suggest
      : `"${f.label}"에 해당할 수 있는 표현이에요.`;
  return (
    <>
      <ProblemLine>{problem}</ProblemLine>
      <SeenLine>
        <EvidenceList f={f} hideEvidence={hideEvidence} />
      </SeenLine>
      <WordingFix f={f} />
      <BasisLine f={f} />
    </>
  );
}

function MeasureBody({ f }: { f: Finding }) {
  const problem =
    (!isVagueSuggest512(f.suggest) && f.suggest) || "기준보다 작거나 확인이 필요해요.";
  const baseline = extractMeasureBaseline512(f.found || "");
  return (
    <>
      <ProblemLine>{problem}</ProblemLine>
      <SeenLine>
        <div className="lc512-measure" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8, fontSize: 14 }}>
          <div style={{ background: "#F8FAF9", border: "1px solid #E3E9E5", borderRadius: 8, padding: 10, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#5B6B65", marginBottom: 4 }}>읽은 값</div>
            <div style={{ wordBreak: "break-word", color: "#13201C" }}>{f.found}</div>
          </div>
          {baseline ? (
            <div style={{ background: "#F8FAF9", border: "1px solid #E3E9E5", borderRadius: 8, padding: 10, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#5B6B65", marginBottom: 4 }}>기준</div>
              <div className="lc-mono" style={{ color: "#13201C" }}>
                {baseline}
              </div>
            </div>
          ) : null}
        </div>
      </SeenLine>
      <MeasureFix f={f} />
      <BasisLine f={f} />
    </>
  );
}

function OtherBody({ f, hideEvidence }: { f: Finding; hideEvidence?: boolean }) {
  const problem =
    (!isVagueSuggest512(f.suggest) && f.suggest) ||
    (!isVagueSuggest512(f.fix?.headline) && f.fix?.headline) ||
    `"${f.label}"을(를) 한 번 더 확인해 주세요.`;
  const examples = collectFixExamples512(f);
  const how =
    (!isVagueSuggest512(f.fix?.note) && f.fix?.note) ||
    (!isVagueSuggest512(f.suggest) && f.suggest) ||
    null;
  return (
    <>
      <ProblemLine>{problem}</ProblemLine>
      {!hideEvidence && (f.found || f.evidence?.length) ? (
        <SeenLine>
          {f.evidence?.length ? (
            <EvidenceList f={f} />
          ) : (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, wordBreak: "break-word" }}>{f.found}</p>
          )}
        </SeenLine>
      ) : null}
      {examples.length || how ? (
        <FixBlock title="이렇게 수정해 보세요" showExampleNote={examples.length > 0}>
          {examples.map((ex, i) => (
            <div key={i} className="lc511-pair">
              <span className="after">{ex}</span>
              <CopyButton507 text={ex} />
            </div>
          ))}
          {!examples.length && how ? <p style={{ margin: 0, fontSize: 15 }}>{how}</p> : null}
        </FixBlock>
      ) : null}
      <BasisLine f={f} />
    </>
  );
}

export function FindingCardBody512({
  f,
  hideEvidence,
  readStatus,
}: {
  f: Finding;
  hideEvidence?: boolean;
  readStatus?: LabelCheckResult["readStatus"];
}) {
  const kind: FindingKind512 = classifyFinding512(f);
  if (kind === "missing") return <MissingBody f={f} readStatus={readStatus} />;
  if (kind === "wording") return <WordingBody f={f} hideEvidence={hideEvidence} />;
  if (kind === "measure") return <MeasureBody f={f} />;
  return <OtherBody f={f} hideEvidence={hideEvidence} />;
}

export { classifyFinding512 };
