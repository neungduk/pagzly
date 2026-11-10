/**
 * 506 — rewrite-map / required-templates 로더(읽기 전용).
 */
import fs from "node:fs";
import path from "node:path";

export type RewriteAlt506 = {
  text: string;
  basis: string;
  kind: "general" | "guideline_exception";
};

export type RewriteItem506 = {
  target_id: string;
  action: string;
  alternatives: RewriteAlt506[];
  note?: string;
};

export type RequiredTemplate506 = {
  rule_id: string;
  label: string;
  template: string;
};

type RewriteFile = {
  meta?: { actions?: Record<string, string> };
  items?: Array<{
    target_id: string;
    action: string;
    alternatives?: Array<{ text?: string; basis?: string; kind?: string }>;
    note?: string;
  }>;
};

let cacheKr: { actions: Record<string, string>; byId: Map<string, RewriteItem506> } | null =
  null;
let cacheUs: { actions: Record<string, string>; byId: Map<string, RewriteItem506> } | null =
  null;
let cacheTpl: { KR: RequiredTemplate506[]; US: RequiredTemplate506[] } | null = null;

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

function mapAlts(
  raw: Array<{ text?: string; basis?: string; kind?: string }> | undefined,
): RewriteAlt506[] {
  const out: RewriteAlt506[] = [];
  for (const a of raw || []) {
    const text = String(a.text || "").trim();
    if (!text) continue;
    const kind =
      a.kind === "guideline_exception" ? "guideline_exception" : "general";
    out.push({
      text,
      basis: String(a.basis || "").trim() || "일반 제안",
      kind,
    });
  }
  return out;
}

function loadRewrite(file: string): {
  actions: Record<string, string>;
  byId: Map<string, RewriteItem506>;
} {
  const raw = fs.readFileSync(dataPath(file), "utf8");
  const json = JSON.parse(raw) as RewriteFile;
  const byId = new Map<string, RewriteItem506>();
  for (const it of json.items || []) {
    if (!it?.target_id) continue;
    byId.set(it.target_id, {
      target_id: it.target_id,
      action: String(it.action || "fix"),
      alternatives: mapAlts(it.alternatives),
      note: it.note?.trim() || undefined,
    });
  }
  return { actions: json.meta?.actions || {}, byId };
}

export function loadRewriteMapKr506() {
  if (!cacheKr) cacheKr = loadRewrite("rewrite-map-kr_draft_v0.1.json");
  return cacheKr;
}

export function loadRewriteMapUs506() {
  if (!cacheUs) cacheUs = loadRewrite("rewrite-map-us_draft_v0.1.json");
  return cacheUs;
}

export function loadRequiredTemplates506() {
  if (cacheTpl) return cacheTpl;
  const raw = fs.readFileSync(dataPath("required-templates_draft_v0.1.json"), "utf8");
  const json = JSON.parse(raw) as {
    KR?: Array<{ rule_id: string; label: string; template: string }>;
    US?: Array<{ rule_id: string; label: string; template: string }>;
  };
  cacheTpl = {
    KR: (json.KR || []).filter((t) => t.rule_id && t.template),
    US: (json.US || []).filter((t) => t.rule_id && t.template),
  };
  return cacheTpl;
}

export function resetRewriteMapCache506() {
  cacheKr = null;
  cacheUs = null;
  cacheTpl = null;
}

/** rewrite action → FindingFix506.kind */
export function actionToFixKind506(
  action: string,
): "fill" | "replace" | "delete" | "evidence" | "functional_only" | "manual" {
  switch (action) {
    case "delete":
      return "delete";
    case "soften":
    case "fix":
      return "replace";
    case "evidence":
    case "functional_or_evidence":
      return "evidence";
    case "functional_only":
      return "functional_only";
    default:
      return "manual";
  }
}

export function headlineForAction506(
  action: string,
  actionsMeta: Record<string, string>,
  fallback: string,
): string {
  const fromMeta = actionsMeta[action];
  if (fromMeta && fromMeta.trim()) return fromMeta.trim();
  if (fallback.trim()) return fallback.trim();
  return action || "확인";
}

/** 괄호 안 설명 제거(자기 검증용) — 예: "잡티를 가려줍니다(색조 제품)" */
export function stripParenNote506(text: string): string {
  return text.replace(/[（(][^）)]*[）)]/g, "").trim();
}
