"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "글자를 읽는 중",
  "필수 표시사항 확인",
  "광고 문구 확인",
  "결과 정리",
] as const;

/**
 * 점검 busy 동안만 표시. 실제 진행 신호가 없으면 단계 문구를 고정 순환.
 * busy가 false가 되면 즉시 닫는다(가짜로 붙잡지 않음).
 */
export function CheckBusyOverlay511({ busy }: { busy: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!busy) {
      setStep(0);
      return;
    }
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, [busy]);

  if (!busy) return null;

  return (
    <div
      className="lc-ov"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,18,20,.94)",
        color: "#F7F7F5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 80,
      }}
    >
      <div className="lc-w-full" style={{ maxWidth: 460, display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            className="lc-spin"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              border: "4px solid #2E3036",
              borderTopColor: "#1D4ED8",
              display: "inline-block",
            }}
            aria-hidden
          />
          <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em" }}>점검하는 중</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {STEPS.map((text, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <div
                key={text}
                className="lc-rw"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 17,
                  color: active ? "#F7F7F5" : done ? "#B4B7BE" : "#6A6D74",
                }}
              >
                <span
                  style={{
                    flex: "none",
                    width: 24,
                    height: 24,
                    borderRadius: 10,
                    background: active || done ? "#1D4ED8" : "#2E3036",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#FFFFFF",
                  }}
                >
                  {done ? "✓" : i + 1}
                </span>
                {text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
