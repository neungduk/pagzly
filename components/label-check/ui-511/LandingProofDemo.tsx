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

function DemoCard({
  card,
  anim,
}: {
  card: (typeof LANDING_DEMO_CARDS_514)[number];
  anim: string;
}) {
  const color =
    card.kind === "fix" ? "var(--lc-fix)" : card.kind === "check" ? "var(--lc-check)" : "var(--lc-ok)";
  return (
    <div className={`lc514-rc ${card.kind} ${anim}`}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6 }}>{card.badge}</div>
      {card.title ? (
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5, marginBottom: 8 }}>{card.title}</div>
      ) : null}
      {card.before ? (
        <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--lc-sub)" }}>
          <span className="lc-mono" style={{ fontSize: 12, color: "var(--lc-mute)" }}>
            이 문장
          </span>
          <br />
          {card.beforeEm ? (
            <>
              {card.before.split(card.beforeEm)[0]}
              <b style={{ color: "var(--lc-fix)" }}>{card.beforeEm}</b>
              {card.before.split(card.beforeEm)[1] || ""}
            </>
          ) : (
            card.before
          )}
          <br />
          <span className="lc-mono" style={{ fontSize: 12, color: "var(--lc-mute)" }}>
            이렇게
          </span>
          <br />
          {card.after}{" "}
          {card.afterNote ? (
            <span style={{ color: "var(--lc-mute)", fontSize: 12 }}>{card.afterNote}</span>
          ) : null}
        </div>
      ) : (
        <div style={{ fontSize: card.kind === "ok" ? 14 : 13.5, lineHeight: 1.7, color: "var(--lc-sub)" }}>
          {card.body}
        </div>
      )}
    </div>
  );
}

function beltTagClass(kind: "fix" | "check" | "ok"): string {
  if (kind === "fix") return "lc515-tag fix";
  if (kind === "check") return "lc515-tag check";
  return "lc515-tag ok";
}

/** 514/515 — 제품 화면(예시 라벨 + 판정 카드) + 문구 띠 */
export function LandingProofDemo511() {
  const chips = landingDemoChipCounts514();

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
                <span className="lc515-mk bad">{LANDING_DEMO_PHRASE_BAD_514}</span> 앰플. 비타민C 함유로{" "}
                <span className="lc515-mk warn">{LANDING_DEMO_PHRASE_WARN_514}</span>을 돕고 칙칙함을 개선합니다.
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
                </span>
                <span>제조번호 {LANDING_DEMO_LOT_514}</span>
              </div>
            </div>
          </div>

          <div className="lc514-cards">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>점검 결과</span>
              <span className="lc-mono" style={{ fontSize: 12, color: "var(--lc-mute)" }}>
                {LANDING_DEMO_SUMMARY_514}
              </span>
            </div>
            {LANDING_DEMO_CARDS_514.map((c, i) => (
              <DemoCard key={`${c.badge}-${c.title}-${i}`} card={c} anim={`lc514-r${Math.min(i + 1, 4)}`} />
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
