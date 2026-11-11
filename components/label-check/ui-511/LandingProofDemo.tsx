import {
  LANDING_BELT_CHIPS_515,
  LANDING_BELT_NOTE_515,
  LANDING_DEMO_CARDS_514,
  LANDING_DEMO_DISCLAIMER_514,
  LANDING_DEMO_EXPIRY_WARN_514,
  LANDING_DEMO_FILE_514,
  LANDING_DEMO_INGREDIENTS_514,
  LANDING_DEMO_LOT_514,
  LANDING_DEMO_NET_514,
  LANDING_DEMO_PHRASE_BAD_514,
  LANDING_DEMO_PHRASE_WARN_514,
  LANDING_DEMO_PRODUCT_514,
  LANDING_DEMO_SUMMARY_514,
  landingDemoChipCounts514,
} from "./landing-demo-514";

function beltTagClass(kind: "fix" | "check" | "ok"): string {
  if (kind === "fix") return "lc515-tag fix";
  if (kind === "check") return "lc515-tag check";
  return "lc515-tag ok";
}

function Pin({ n, color }: { n: number; color: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: 9,
        background: color,
        color: "#fff",
        fontSize: 10.5,
        fontWeight: 700,
        marginLeft: 3,
        verticalAlign: 2,
      }}
    >
      {n}
    </span>
  );
}

/** 514/515/517 — 제품 화면(예시 라벨 + v4b 결과 열) + 문구 띠 */
export function LandingProofDemo511() {
  const chips = landingDemoChipCounts514();
  const fix = LANDING_DEMO_CARDS_514.find((c) => c.kind === "fix");
  const rows = LANDING_DEMO_CARDS_514.filter((c) => c.kind !== "fix");

  return (
    <>
      <section id="demo" className="lc514-demo" aria-label="점검 결과 예시">
        <div className="lc514-demo-grid">
          <div className="lc515-label-wrap">
            <div className="lc515-float1" aria-hidden>
              <span className="lc515-dot" />
              고칠 것 {chips.fix}
            </div>
            <div className="lc515-float2" aria-hidden>
              <span className="lc515-dot" />
              확인할 것 {chips.check}
            </div>
            <div className="lc514-label-card lc515-tilt">
              <div className="lc-scan514" aria-hidden />
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--lc-mute)",
                }}
              >
                예시 화면입니다
              </p>
              <div
                className="lc-mono"
                style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--lc-mute)", marginBottom: 14 }}
              >
                {LANDING_DEMO_FILE_514}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 4 }}>
                {LANDING_DEMO_PRODUCT_514}
              </div>
              <div style={{ fontSize: 13, color: "var(--lc-mute)", marginBottom: 16 }}>{LANDING_DEMO_NET_514}</div>
              <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.85 }}>
                <span className="lc515-mk bad">{LANDING_DEMO_PHRASE_BAD_514}</span>
                <Pin n={1} color="#FF5A42" /> 앰플. 비타민C 함유로{" "}
                <span className="lc515-mk warn">{LANDING_DEMO_PHRASE_WARN_514}</span>
                <Pin n={3} color="#B7791F" />을 돕고 칙칙함을 개선합니다.
              </p>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--lc-sub)" }}>전성분</div>
              <p className="lc-mono" style={{ margin: "0 0 14px", fontSize: 11.5, lineHeight: 1.7, color: "var(--lc-sub)" }}>
                {LANDING_DEMO_INGREDIENTS_514}
              </p>
              <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--lc-mute)", flexWrap: "wrap" }}>
                <span>
                  사용기한{" "}
                  <span className="lc515-mk bad2" style={{ borderBottom: "2px solid #B7791F", borderRadius: 3, padding: "0 2px" }}>
                    {LANDING_DEMO_EXPIRY_WARN_514}
                  </span>
                  <Pin n={2} color="#B7791F" />
                </span>
                <span>제조번호 {LANDING_DEMO_LOT_514}</span>
              </div>
            </div>
          </div>

          <div className="lc514-cards" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 4px" }}>
              <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.02em" }}>점검 결과</span>
              <span className="lc-mono" style={{ fontSize: 12, color: "var(--lc-mute)" }}>
                {LANDING_DEMO_SUMMARY_514}
              </span>
            </div>

            {fix ? (
              <div className="lc517-land-hero lc514-r1">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      background: "#FF5A42",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    1
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#FF8A78" }}>{fix.badge}</span>
                </div>
                <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.4, marginBottom: 16 }}>
                  {fix.title}이에요
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "rgba(255,90,66,.14)", borderRadius: 12, padding: "12px 14px" }}>
                    <div className="lc-mono" style={{ fontSize: 10.5, color: "#FF8A78", letterSpacing: "0.08em", marginBottom: 4 }}>
                      BEFORE
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.6 }}>
                      {fix.beforeEm && fix.before ? (
                        <>
                          {fix.before.split(fix.beforeEm)[0]}
                          <b
                            style={{
                              textDecoration: "underline",
                              textDecorationColor: "#FF5A42",
                              textUnderlineOffset: 4,
                              textDecorationThickness: 2,
                            }}
                          >
                            {fix.beforeEm}
                          </b>
                          {fix.before.split(fix.beforeEm)[1] || ""}
                        </>
                      ) : (
                        fix.before
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", color: "#8A8D94", fontSize: 14, lineHeight: 1 }}>↓</div>
                  <div style={{ background: "rgba(127,162,255,.16)", borderRadius: 12, padding: "12px 14px" }}>
                    <div className="lc-mono" style={{ fontSize: 10.5, color: "#9DB6FF", letterSpacing: "0.08em", marginBottom: 4 }}>
                      AFTER
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.6 }}>{fix.after}</div>
                    {fix.afterNote ? (
                      <div style={{ fontSize: 12, color: "#9A9DA4", marginTop: 4 }}>{fix.afterNote}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {rows.map((c, i) => (
              <div key={`${c.badge}-${c.title}-${i}`} className={`lc517-land-row lc514-r${Math.min(i + 2, 4)}`}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: c.kind === "ok" ? "#2FB67E" : "#B7791F",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  {i + 2}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{c.title || c.body}</div>
                  {c.title && c.body ? (
                    <div style={{ fontSize: 12.5, color: "#6A6D74", marginTop: 2 }}>{c.body}</div>
                  ) : null}
                </div>
                <span
                  style={{
                    flex: "none",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: c.kind === "ok" ? "#1F7A56" : "#8A5A12",
                    background: c.kind === "ok" ? "#E8F6EF" : "#FFF1CC",
                    borderRadius: 999,
                    padding: "4px 10px",
                  }}
                >
                  {c.badge}
                </span>
              </div>
            ))}

            <p style={{ margin: 0, fontSize: 12, color: "var(--lc-mute)" }}>{LANDING_DEMO_DISCLAIMER_514}</p>
          </div>
        </div>
      </section>

      <section className="lc515-belt-section" aria-label="예시 문구 띠">
        <p className="lc515-belt-note">{LANDING_BELT_NOTE_515}</p>
        <div className="lc515-belt-viewport">
          <div className="lc515-belt" aria-hidden>
            {[0, 1].map((copy) => (
              <span key={copy} className="lc515-belt-copy">
                {LANDING_BELT_CHIPS_515.map((chip) => (
                  <span key={`${copy}-${chip.caught}`} className="lc515-chip">
                    {chip.caught}
                    <span className={beltTagClass(chip.kind)}>{chip.badge}</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
