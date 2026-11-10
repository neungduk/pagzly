"use client";

import { useEffect, useState } from "react";

const SCENES = [
  {
    file: "라벨 시안.pdf",
    market: "판매국 한국",
    tab: "한국 · 크림 라벨",
    title: "미라클 리페어 크림",
    body: (
      <>
        <span style={{ position: "relative", display: "inline-block", alignSelf: "flex-start" }}>
          <span className="lc-mk1" style={{ display: "inline-block", background: "rgba(214,64,43,.14)", borderBottom: "3px solid #D6402B" }}>
            피부 재생, 아토피 치료에 효과
          </span>
          <span className="lc-tg1" style={{ position: "absolute", top: -17, right: -30, height: 26, borderRadius: 13, background: "#D6402B", color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", padding: "0 10px", whiteSpace: "nowrap" }}>
            고칠 것
          </span>
        </span>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E3E9E5", paddingTop: 12, color: "#3E4F49" }}>
          <span>내용량</span>
          <span className="lc-mono" style={{ color: "#13201C" }}>100 ml</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E3E9E5", paddingTop: 12, color: "#3E4F49" }}>
          <span>사용기한</span>
          <span style={{ position: "relative", display: "inline-block" }}>
            <span className="lc-mk2" style={{ display: "inline-block", background: "rgba(183,121,31,.18)", borderBottom: "3px solid #B7791F", color: "#13201C" }}>
              별도 표기 없음
            </span>
            <span className="lc-tg2" style={{ position: "absolute", top: -24, right: -8, height: 24, borderRadius: 12, background: "#8A5A10", color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", padding: "0 10px", whiteSpace: "nowrap" }}>
              확인할 것
            </span>
          </span>
        </div>
      </>
    ),
    summary: (
      <>
        <span style={{ color: "#B3321F" }}>고칠 것 1</span>
        <span style={{ color: "#8A5A10" }}>확인할 것 1</span>
        <span style={{ color: "#1F7A56" }}>문제 없음 1</span>
      </>
    ),
  },
  {
    file: "serum-label.png",
    market: "Market: US",
    tab: "미국 · 세럼 사진",
    title: "Glow Serum 30 mL",
    body: (
      <>
        <span style={{ position: "relative", display: "inline-block", alignSelf: "flex-start" }}>
          <span className="lc-mk1" style={{ display: "inline-block", background: "rgba(214,64,43,.14)", borderBottom: "3px solid #D6402B" }}>
            Reduces wrinkles permanently. Cures acne.
          </span>
          <span className="lc-tg1" style={{ position: "absolute", top: -17, right: -30, height: 26, borderRadius: 13, background: "#D6402B", color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", padding: "0 10px", whiteSpace: "nowrap" }}>
            고칠 것
          </span>
        </span>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E3E9E5", paddingTop: 12, color: "#3E4F49" }}>
          <span>Net content</span>
          <span className="lc-mono" style={{ color: "#13201C" }}>1 fl oz (30 mL)</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E3E9E5", paddingTop: 12, color: "#3E4F49" }}>
          <span>Distributed by</span>
          <span style={{ color: "#13201C" }}>Example Beauty Inc.</span>
        </div>
      </>
    ),
    summary: (
      <>
        <span style={{ color: "#B3321F" }}>고칠 것 1</span>
        <span style={{ color: "#8A5A10" }}>확인할 것 0</span>
        <span style={{ color: "#1F7A56" }}>문제 없음 2</span>
      </>
    ),
  },
  {
    file: "앰플 상세페이지.pdf",
    market: "판매국 한국",
    tab: "한국 · 앰플 상세페이지",
    title: "클리어 앰플 50ml",
    body: (
      <>
        <span style={{ position: "relative", display: "inline-block", alignSelf: "flex-start" }}>
          <span className="lc-mk1" style={{ display: "inline-block", background: "rgba(214,64,43,.14)", borderBottom: "3px solid #D6402B" }}>
            주름 완전 제거, 흉터 영구 개선
          </span>
          <span className="lc-tg1" style={{ position: "absolute", top: -17, right: -30, height: 26, borderRadius: 13, background: "#D6402B", color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", padding: "0 10px", whiteSpace: "nowrap" }}>
            고칠 것
          </span>
        </span>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E3E9E5", paddingTop: 12, color: "#3E4F49" }}>
          <span>전성분</span>
          <span style={{ position: "relative", display: "inline-block" }}>
            <span className="lc-mk2" style={{ display: "inline-block", background: "rgba(183,121,31,.18)", borderBottom: "3px solid #B7791F", color: "#13201C" }}>
              …리날룰, 리모넨…
            </span>
            <span className="lc-tg2" style={{ position: "absolute", top: -24, right: -8, height: 24, borderRadius: 12, background: "#8A5A10", color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", padding: "0 10px", whiteSpace: "nowrap" }}>
              확인할 것
            </span>
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E3E9E5", paddingTop: 12, color: "#3E4F49" }}>
          <span>제조번호</span>
          <span className="lc-mono" style={{ color: "#13201C" }}>LOT 2611A</span>
        </div>
      </>
    ),
    summary: (
      <>
        <span style={{ color: "#B3321F" }}>고칠 것 1</span>
        <span style={{ color: "#8A5A10" }}>확인할 것 1</span>
        <span style={{ color: "#1F7A56" }}>문제 없음 1</span>
      </>
    ),
  },
];

export function LandingProofDemo511() {
  const [s, setS] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (!paused) {
        setS((v) => (v + 1) % 3);
        setTick((n) => n + 1);
      }
    }, 5200);
    return () => window.clearInterval(t);
  }, [paused]);

  const scene = SCENES[s]!;

  return (
    <div style={{ flex: "1 1 460px", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
      <div
        key={`${s}-${tick}`}
        className="lc-sheet lc-w-full"
        style={{
          position: "relative",
          maxWidth: 500,
          background: "#FFFFFF",
          color: "#13201C",
          borderRadius: 8,
          padding: "34px 36px 30px",
          boxShadow: "0 40px 60px -30px rgba(0,0,0,.6)",
          minHeight: 372,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid #E3E9E5", paddingBottom: 12 }}>
          <span className="lc-mono" style={{ fontSize: 13, color: "#5B6B65" }}>{scene.file}</span>
          <span style={{ fontSize: 13, color: "#5B6B65" }}>{scene.market}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>{scene.title}</span>
          <div style={{ fontSize: 15, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 16 }}>{scene.body}</div>
          <div className="lc-sm" style={{ display: "flex", gap: 14, flexWrap: "wrap", borderTop: "2px solid #13201C", paddingTop: 14, fontSize: 14, fontWeight: 700 }}>
            {scene.summary}
          </div>
        </div>
        <div className="lc-prog lc-w-full" style={{ position: "absolute", left: 0, bottom: 0, height: 3, background: "#FF6B52", transformOrigin: "left" }} aria-hidden />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }} role="tablist" aria-label="샘플 라벨">
        {SCENES.map((sc, i) => (
          <button
            key={sc.tab}
            type="button"
            role="tab"
            aria-selected={i === s}
            className="lc-tab"
            onClick={() => {
              setS(i);
              setPaused(true);
              setTick((n) => n + 1);
            }}
            style={{
              position: "relative",
              overflow: "hidden",
              minHeight: 44,
              padding: "0 18px",
              borderRadius: 22,
              border: "1px solid #5E8379",
              background: i === s ? "#F2F5F3" : "transparent",
              color: i === s ? "#0F3D36" : "#C6D8D0",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {sc.tab}
          </button>
        ))}
      </div>
    </div>
  );
}
