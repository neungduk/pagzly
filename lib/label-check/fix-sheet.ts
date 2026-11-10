/**
 * 506 — 수정안 모두 복사(일반 텍스트).
 */
import type { Finding, LabelCheckResult, LabelMarket } from "@/lib/label-check/types";
import { DISCLAIMER_PRINT_485 } from "@/lib/label-check/types";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function marketLabel(m: LabelMarket | undefined): string {
  return m === "US" ? "미국 기준" : "한국 기준";
}

function isConfirmOnly(f: Finding): boolean {
  if (f.fix?.kind === "evidence" || f.fix?.kind === "functional_only") return true;
  if (f.fixKind === "evidence") return true;
  return false;
}

export function buildFixSheet(
  result: LabelCheckResult,
  opts?: { productName?: string | null },
): string {
  const title = (opts?.productName || "").trim() || "점검 결과";
  const header = `[${title}] · ${marketLabel(result.market)} · ${todayIso()}`;
  const issues = (result.findings || []).filter((f) => f.status !== "pass");
  const toFix = issues.filter((f) => !isConfirmOnly(f));
  const toConfirm = issues.filter((f) => isConfirmOnly(f));

  const lines: string[] = [header];
  let n = 1;

  const emit = (f: Finding, bucket: "고칠 것" | "확인할 것") => {
    const hit =
      f.evidence?.[0]?.found ||
      (f.found && !f.found.startsWith("관련") && f.found.length < 80 ? f.found : "");
    const titleLine = hit
      ? `${n}. (${bucket}) ${f.label} — "${hit.replace(/\s+/g, " ").slice(0, 40)}"`
      : `${n}. (${bucket}) ${f.label}`;
    lines.push(titleLine);

    if (f.fix?.kind === "delete") {
      lines.push(`   권장: 해당 표현 삭제(예시 안내)`);
    } else if (f.fix?.templates?.length) {
      lines.push(`   넣을 문구(예시): ${f.fix.templates[0]}`);
    } else if (f.fix?.alternatives?.length) {
      const alts = f.fix.alternatives.slice(0, 2);
      for (const a of alts) {
        lines.push(`   바꿀 문구(예시): ${a.text}`);
        if (a.basis) lines.push(`   근거: ${a.basis}`);
      }
    } else if (f.fixSuggestion) {
      lines.push(`   안내: ${f.fixSuggestion}`);
    } else if (f.suggest) {
      lines.push(`   안내: ${f.suggest}`);
    }
    if (f.basis?.law) {
      lines.push(`   근거: ${f.basis.law}${f.basis.source ? ` (${f.basis.source})` : ""}`);
    }
    n += 1;
  };

  for (const f of toFix) emit(f, "고칠 것");
  for (const f of toConfirm) emit(f, "확인할 것");

  lines.push(`※ ${DISCLAIMER_PRINT_485}`);
  return lines.join("\n");
}
