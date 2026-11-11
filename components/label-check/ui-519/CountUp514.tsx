"use client";

import { useEffect, useState } from "react";

/** 519 — 제목 숫자만 클라이언트. reduced-motion이면 최종값 즉시. */
export function CountUp514({
  to,
  durationMs = 900,
  className,
}: {
  to: number;
  durationMs?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      setN(to);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || to <= 0) {
      setN(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs]);

  return <span className={className}>{n}</span>;
}
