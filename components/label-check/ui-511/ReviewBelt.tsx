"use client";

const BELT = [
  { text: "피부 재생, 아토피 치료에 효과", label: "고칠 것", bg: "#D6402B" },
  { text: "사용기한: 별도 표기 없음", label: "확인할 것", bg: "#8A5A10" },
  { text: "Cures acne. Reduces wrinkles permanently.", label: "고칠 것", bg: "#D6402B" },
  { text: "내용량 100 ml", label: "문제 없음", bg: "#1F7A56" },
  { text: "주름 완전 제거", label: "고칠 것", bg: "#D6402B" },
  { text: "리날룰, 리모넨 포함", label: "확인할 것", bg: "#8A5A10" },
  { text: "Net Wt. 1 fl oz (30 mL)", label: "문제 없음", bg: "#1F7A56" },
];

export function ReviewBelt511() {
  const items = [...BELT, ...BELT];
  return (
    <div style={{ background: "#111214", color: "#F7F7F5", overflow: "hidden", padding: "20px 0", borderBottom: "4px solid #1D4ED8" }}>
      <div className="lc-belt" aria-hidden>
        {items.map((b, i) => (
          <span key={`${b.text}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "0 28px", fontSize: 17, whiteSpace: "nowrap" }}>
            <span style={{ color: "#C6D8D0" }}>&quot;{b.text}&quot;</span>
            <span style={{ height: 26, padding: "0 12px", borderRadius: 13, background: b.bg, color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center" }}>
              {b.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
