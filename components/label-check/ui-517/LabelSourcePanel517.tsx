"use client";

import { Fragment, useMemo, type ReactNode } from "react";
import type { PinHit517 } from "./pin-match-517";

export type LabelSourcePanel517Props = {
  sourceText: string;
  pins: PinHit517[];
  /** 지금 열린 행의 핀 id (없으면 null) */
  activePinId?: string | null;
  onPinClick?: (pinId: string) => void;
  fileLabel?: string | null;
  /** 523 — 참이면 "아래 목록", 미전달/거짓은 웹 문구("오른쪽 목록") */
  listBelow?: boolean;
};

/**
 * 원문을 핀 위치 기준으로 잘라 React 텍스트 노드로만 렌더링한다.
 * (HTML 삽입 없음) 겹치는 핀은 먼저 나온 것만 그린다.
 */
export function renderSourceWithPins517(
  sourceText: string,
  pins: PinHit517[],
  activePinId: string | null | undefined,
  onPinClick?: (pinId: string) => void,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const sorted = [...pins].sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const p of sorted) {
    if (p.start < cursor || p.end > sourceText.length || p.end <= p.start) continue;
    if (p.start > cursor) {
      nodes.push(<Fragment key={`t-${cursor}`}>{sourceText.slice(cursor, p.start)}</Fragment>);
    }
    const on = activePinId === p.id;
    nodes.push(
      <Fragment key={`h-${p.id}`}>
        <span
          className={`lc517-hit${on ? " on" : ""}`}
          style={on ? undefined : { background: `${p.color}22` }}
        >
          {sourceText.slice(p.start, p.end)}
        </span>
        <button
          type="button"
          className="lc517-pin"
          style={{ background: p.color }}
          aria-label={`${p.no}번 항목 열기`}
          aria-pressed={on}
          onClick={() => onPinClick?.(p.id)}
        >
          {p.no}
        </button>
      </Fragment>,
    );
    cursor = p.end;
  }
  if (cursor < sourceText.length) {
    nodes.push(<Fragment key={`t-${cursor}`}>{sourceText.slice(cursor)}</Fragment>);
  }
  return nodes;
}

export function LabelSourcePanel517({
  sourceText,
  pins,
  activePinId,
  onPinClick,
  fileLabel,
  listBelow = false,
}: LabelSourcePanel517Props) {
  const body = useMemo(
    () => renderSourceWithPins517(sourceText, pins, activePinId, onPinClick),
    [sourceText, pins, activePinId, onPinClick],
  );

  return (
    <aside className="lc517-source lc507-print-hide" aria-label="읽은 라벨">
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>읽은 라벨</h2>
      {fileLabel ? (
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#8a8d94", wordBreak: "break-all" }}>
          {fileLabel}
        </p>
      ) : null}
      <p style={{ margin: "6px 0 14px", fontSize: 12.5, color: "#4a4d54" }}>
        {pins.length > 0
          ? "번호를 누르면 해당 항목이 열려요"
          : listBelow
            ? "문구 위치를 찾지 못한 항목은 아래 목록에서 확인해 주세요"
            : "문구 위치를 찾지 못한 항목은 오른쪽 목록에서 확인해 주세요"}
      </p>
      <div
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 15,
          lineHeight: 1.9,
          color: "#111214",
        }}
      >
        {body}
      </div>
    </aside>
  );
}
