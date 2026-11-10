/**
 * 506 — finding에 fix/templates/rewrite alternatives 부착.
 * 규칙 id 문자열(KR-LBL-*)은 응답에 넣지 않음 → label·checkKey로 매핑.
 */
import {
  actionToFixKind506,
  headlineForAction506,
  loadRequiredTemplates506,
  loadRewriteMapKr506,
  loadRewriteMapUs506,
} from "@/lib/label-check/rewrite-map";
import type { Finding, FindingFix506, LabelMarket } from "@/lib/label-check/types";

/** 필수항목 label → template (rule_id는 서버 내부만) */
const KR_LABEL_TO_RULE: Record<string, string> = {
  제품명: "KR-LBL-001",
  "화장품의 명칭": "KR-LBL-001",
  영업자: "KR-LBL-002",
  "책임판매업자": "KR-LBL-002",
  "화장품책임판매업자": "KR-LBL-002",
  전성분: "KR-LBL-003",
  내용량: "KR-LBL-004",
  "용량 또는 중량": "KR-LBL-004",
  제조번호: "KR-LBL-005",
  사용기한: "KR-LBL-006",
  "사용할 때의 주의사항": "KR-LBL-009",
};

const US_LABEL_TO_RULE: Record<string, string> = {
  Identity: "US-002",
  "Net quantity": "US-003",
  Business: "US-004",
  Origin: "US-005",
  Ingredients: "US-006",
  Contact: "US-010",
};

function resolveRuleId(f: Finding, market: LabelMarket): string | null {
  if (f.checkKey && /^(MFDS-|USAD-|US-)/.test(f.checkKey)) return f.checkKey;
  const map = market === "US" ? US_LABEL_TO_RULE : KR_LABEL_TO_RULE;
  for (const [labelPart, id] of Object.entries(map)) {
    if (f.label === labelPart || f.label.includes(labelPart)) return id;
  }
  return null;
}

function attachRewrite(
  f: Finding,
  market: LabelMarket,
): FindingFix506 | undefined {
  const id = f.checkKey;
  if (!id || (!id.startsWith("MFDS-") && !id.startsWith("USAD-"))) return undefined;
  const pack = market === "US" ? loadRewriteMapUs506() : loadRewriteMapKr506();
  const item = pack.byId.get(id);
  if (!item) return undefined;
  const kind = actionToFixKind506(item.action);
  const headline = headlineForAction506(
    item.action,
    pack.actions,
    f.fixSuggestion || f.suggest || "",
  );
  const alternatives = item.alternatives.slice(0, 4).map((a) => ({
    text: a.text,
    basis: a.basis,
    kind: a.kind,
  }));
  return {
    kind,
    headline,
    alternatives: alternatives.length ? alternatives : undefined,
    note: item.note,
  };
}

function attachTemplate(
  f: Finding,
  market: LabelMarket,
): FindingFix506 | undefined {
  if (f.status === "pass") return undefined;
  const ruleId = resolveRuleId(f, market);
  if (!ruleId || ruleId.startsWith("MFDS-") || ruleId.startsWith("USAD-")) {
    return undefined;
  }
  const tpls = loadRequiredTemplates506()[market === "US" ? "US" : "KR"];
  const hit = tpls.find((t) => t.rule_id === ruleId);
  if (!hit) return undefined;
  return {
    kind: "fill",
    headline: f.fixSuggestion || f.suggest || "누락 항목을 채워 주세요",
    templates: [hit.template],
  };
}

function manualFix(f: Finding): FindingFix506 | undefined {
  if (f.status === "pass") return undefined;
  if (!f.fixSuggestion && !f.suggest) return undefined;
  return {
    kind: "manual",
    headline: f.fixSuggestion || f.suggest,
    note: f.exceptionNote,
  };
}

export function enrichFindings506(
  findings: Finding[],
  market: LabelMarket = "KR",
): Finding[] {
  return findings.map((f) => {
    if (!f.checkKey) {
      // 필수 누락 등: lbl:제목 (KR-LBL 문자열 미사용)
      f = { ...f, checkKey: `lbl:${f.label}` };
    }
    if (f.status === "pass") return f;

    let fix = attachRewrite(f, market);
    if (f.exception?.result === "needs_disclaimer" && fix) {
      fix = { ...fix, kind: "fill" };
    }
    if (f.exception?.result === "evidence_required") {
      fix = fix
        ? { ...fix, kind: "evidence" }
        : {
            kind: "evidence",
            headline: f.suggest || "근거 자료 확인",
            note: f.exception.text,
          };
    }
    if (!fix) fix = attachTemplate(f, market);
    if (!fix) fix = manualFix(f);
    if (!fix) return f;
    return { ...f, fix };
  });
}
