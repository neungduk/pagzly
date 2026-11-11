import {
  LANDING_BELT_CHIPS_515,
  LANDING_BELT_NOTE_515,
} from "@/components/label-check/ui-511/landing-demo-514";

function beltTagClass(kind: "fix" | "check" | "ok"): string {
  if (kind === "fix") return "lc515-tag fix";
  if (kind === "check") return "lc515-tag check";
  return "lc515-tag ok";
}

/** 515 — 예시 문구 띠(내용·모양 유지). ProofDemo에서 분리. */
export function LandingBelt515() {
  return (
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
  );
}
