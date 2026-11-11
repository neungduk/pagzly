import type { Finding, LabelCheckResult } from "@/lib/label-check/types";
import { statusToBucket507, type UiBucket507 } from "@/lib/label-check/ui-status-507";

function dotClass(bucket: UiBucket507): string {
  if (bucket === "fix") return "dot-fix";
  if (bucket === "check") return "dot-check";
  if (bucket === "pass") return "dot-pass";
  return "dot-manual";
}

function oneLineBasis(f: Finding): string {
  if (f.basis?.law) return f.basis.law;
  if (f.found) return f.found.length > 80 ? `${f.found.slice(0, 80)}…` : f.found;
  return "";
}

function fixExample(f: Finding): string | null {
  if (f.fixExample) return f.fixExample;
  if (f.fix?.templates?.[0]) return f.fix.templates[0];
  if (f.suggest) return f.suggest;
  return null;
}

export function SimpleResult({
  result,
  limitMessage,
  onFocusPaste,
}: {
  result: LabelCheckResult | null;
  limitMessage?: string | null;
  onFocusPaste?: () => void;
}) {
  if (limitMessage) {
    return (
      <div className="limit" role="alert">
        <p style={{ margin: 0 }}>{limitMessage}</p>
        {onFocusPaste ? (
          <button type="button" className="primary" style={{ marginTop: 8 }} onClick={onFocusPaste}>
            문구 붙여넣기로 점검
          </button>
        ) : null}
      </div>
    );
  }

  if (!result) return null;

  const findings = result.findings || [];
  const manuals = result.manualItems || [];
  let no = 0;

  return (
    <section className="section">
      <h2>결과</h2>
      <p className="muted">
        가능 {result.summary?.possible ?? 0} · 확인 {result.summary?.attention ?? 0} · 통과{" "}
        {result.summary?.pass ?? 0}
      </p>

      {findings.map((f, i) => {
        no += 1;
        const bucket = statusToBucket507(f.status);
        const fix = fixExample(f);
        return (
          <div className="finding" key={`f-${i}-${f.checkKey || f.label}`}>
            <span className={`dot ${dotClass(bucket)}`} aria-hidden />
            <div>
              <strong>
                {no}. {f.label || f.category}
              </strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {oneLineBasis(f)}
              </p>
              {fix ? (
                <p style={{ margin: "4px 0 0" }}>
                  고칠 문구 예시: {fix.length > 120 ? `${fix.slice(0, 120)}…` : fix}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}

      {manuals.map((m, i) => {
        no += 1;
        return (
          <div className="finding" key={`m-${i}-${m.label}`}>
            <span className={`dot ${dotClass("manual")}`} aria-hidden />
            <div>
              <strong>
                {no}. {m.label}
              </strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {m.whyManual || m.suggest || "직접 확인이 필요해요."}
              </p>
            </div>
          </div>
        );
      })}

      {findings.length === 0 && manuals.length === 0 ? (
        <p className="muted">표시할 항목이 없습니다.</p>
      ) : null}

      <p className="disclaimer">법적 판단이 아닌 사전 점검 도구입니다</p>
    </section>
  );
}
