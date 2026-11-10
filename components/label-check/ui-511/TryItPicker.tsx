"use client";

import { useState } from "react";

const R = "#D6402B";
const A = "#8A5A10";
const G = "#1F7A56";

const ITEMS = [
  {
    text: "피부 재생, 아토피 치료에 효과",
    label: "고칠 것",
    color: R,
    title: "의약품으로 오해할 수 있는 효능 표현",
    why: "질병의 치료·예방을 뜻하는 표현은 화장품 광고에서 쓸 수 없는 것으로 정리되어 있어요. 아토피처럼 질병 이름이 붙으면 더 그렇습니다.",
    fix: "피부 보습에 도움을 주는 크림",
  },
  {
    text: "사용기한: 별도 표기 없음",
    label: "확인할 것",
    color: A,
    title: "사용기한 또는 개봉 후 사용기간 값",
    why: "사용기한이나 개봉 후 사용기간의 값을 찾지 못했어요. 날짜나 \"개봉 후 12M\" 같은 기간이 적혀 있는지 확인해 주세요.",
    fix: "사용기한: 제조일로부터 36개월",
  },
  {
    text: "Cures acne. Reduces wrinkles permanently.",
    label: "고칠 것",
    color: R,
    title: "Drug claim (미국)",
    why: "\"Cures\"처럼 질병을 치료한다는 표현과 \"permanently\"처럼 영구적 효과를 말하는 표현은 화장품 광고에서 문제가 될 수 있어요.",
    fix: "Helps reduce the appearance of fine lines.",
  },
  {
    text: "내용량 100 ml",
    label: "문제 없음",
    color: G,
    title: "내용량 표시",
    why: "숫자와 단위가 함께 표시되어 있어요. 점검한 범위에서는 걸리는 것이 없습니다. 법에 맞는다는 뜻은 아닙니다.",
    fix: "(그대로 두세요)",
  },
];

export function TryItPicker511() {
  const [pick, setPick] = useState(0);
  const sel = ITEMS[pick]!;
  const anim = pick % 2 === 0 ? "lc-slideA" : "lc-slideB";

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "stretch" }}>
      <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }} role="group" aria-label="예시 문구">
        {ITEMS.map((it, i) => (
          <button
            key={it.text}
            type="button"
            className="lc-pick"
            aria-pressed={i === pick}
            onClick={() => setPick(i)}
            style={{
              textAlign: "left",
              minHeight: 64,
              padding: "14px 20px",
              borderRadius: 12,
              border: `2px solid ${i === pick ? "#0F3D36" : "transparent"}`,
              background: i === pick ? "#FFFFFF" : "#E9EFEC",
              color: "#13201C",
              fontSize: 17,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{it.text}</span>
            <span style={{ flex: "none", width: 12, height: 12, borderRadius: 6, background: it.color }} aria-hidden />
          </button>
        ))}
      </div>
      <div
        key={pick}
        className={anim}
        style={{
          flex: "1.3 1 400px",
          minWidth: 0,
          background: "#FFFFFF",
          border: "1px solid #CBD5CF",
          borderTop: `6px solid ${sel.color}`,
          borderRadius: 12,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <span style={{ height: 32, padding: "0 16px", borderRadius: 16, background: sel.color, color: "#fff", fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center" }}>
            {sel.label}
          </span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{sel.title}</span>
        </div>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: "#3E4F49" }}>{sel.why}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #E3E9E5", paddingTop: 18 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0F3D36" }}>이렇게 고쳐 보세요</span>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.7, display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center" }}>
            <span style={{ textDecoration: "line-through", textDecorationColor: "#D6402B", color: "#8A968F" }}>{sel.text}</span>
            <span style={{ color: "#0F3D36", fontWeight: 700, background: "rgba(31,122,86,.12)", padding: "2px 10px", borderRadius: 6 }}>{sel.fix}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
