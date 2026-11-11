"use client";

import { useEffect, useState } from "react";
import { labelApiUrl } from "@/lib/label-check/api-base-520";

/**
 * 516 — 서버에서 기준일을 못 넘긴 클라이언트 화면용.
 * prop이 있으면 그대로 쓰고, 없으면 /api/law-watch/baseline 조회.
 * 실패·없음·7일 초과는 렌더하지 않음.
 */
export function useLawBaseline516(lawBaseline?: string | null): string | null {
  const [line, setLine] = useState<string | null>(
    lawBaseline === undefined ? null : lawBaseline,
  );

  useEffect(() => {
    if (lawBaseline !== undefined) {
      setLine(lawBaseline);
      return;
    }
    let cancelled = false;
    fetch(labelApiUrl("/api/law-watch/baseline"), { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { line?: string | null }) => {
        if (!cancelled && typeof j.line === "string" && j.line.trim()) {
          setLine(j.line);
        }
      })
      .catch(() => {
        /* 숨김 */
      });
    return () => {
      cancelled = true;
    };
  }, [lawBaseline]);

  return line;
}

export function LawBaselineText516({
  lawBaseline,
  className,
  style,
}: {
  lawBaseline?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const line = useLawBaseline516(lawBaseline);
  if (!line) return null;
  return (
    <p className={className} style={style}>
      {line}
    </p>
  );
}
