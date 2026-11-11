"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "글자를 읽는 중",
  "필수 표시사항 확인",
  "광고 문구 확인",
  "결과 정리",
] as const;

/**
 * 517 — 흰 카드 오버레이. 단계 수 기준으로만 진행 바를 채움(가짜 % 금지).
 * 기존 CheckBusyOverlay511와 같은 단계 문구·순환 간격을 씀.
 */
export function CheckBusyOverlay517({
  busy,
  useIcons = false,
}: {
  busy: boolean;
  /** 523 — 참이면 ✓/· 글자 대신 SVG. 기본(미전달)은 웹과 동일 */
  useIcons?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [since, setSince] = useState(0);

  useEffect(() => {
    if (!busy) {
      setStep(0);
      setSince(0);
      return;
    }
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
      setSince(Math.floor((Date.now() - t0) / 1000));
    }, 1400);
    return () => window.clearInterval(id);
  }, [busy]);

  if (!busy) return null;

  const filled = Math.min(step + 1, STEPS.length);
  const pct = (filled / STEPS.length) * 100;
  const hint =
    since >= 30 ? "연결이 느려요. 잠시만 기다려 주세요" : since >= 8 ? "사진이 크면 조금 더 걸려요" : null;

  return (
    <div className="lc517-ov" role="status" aria-live="polite" aria-busy="true">
      <div className="lc517-ov-card">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="lc517-spin" aria-hidden />
          <span style={{ fontSize: 19, fontWeight: 700 }}>점검하는 중</span>
        </div>
        <div style={{ height: 6, background: "#E8EBF3", borderRadius: 3, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "#1D4ED8",
              borderRadius: 3,
              transition: "width .5s",
            }}
          />
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
          {STEPS.map((text, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li
                key={text}
                style={{
                  display: "flex",
                  gap: 10,
                  fontSize: 14.5,
                  color: active ? "#111214" : "#6A6D74",
                  ...(useIcons ? { alignItems: "center" as const } : null),
                }}
              >
                {useIcons ? (
                  <span
                    className={`lc517-step-ico${done ? " done" : ""}${active ? " active" : ""}`}
                    aria-hidden
                    style={{ width: 16, height: 16, flex: "none" }}
                  />
                ) : (
                  <span style={{ width: 16, fontWeight: 700, color: done || active ? "#1F7A56" : "#8A8D94" }}>
                    {done ? "✓" : "·"}
                  </span>
                )}
                {text}
              </li>
            );
          })}
        </ul>
        {useIcons && hint ? (
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6A6D74" }}>{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
