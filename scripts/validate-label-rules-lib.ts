/**
 * 501 — 규칙 JSON 검증 코어(회귀·CLI 공용).
 */
import fs from "node:fs";
import path from "node:path";

export const LABEL_RULE_FILES = {
  kr: "kr_label_rules_draft_v0.1.json",
  adKr: "ad-phrases-kr_draft_v0.1.json",
  fixKr: "fix-suggestions-kr_draft_v0.1.json",
  us: "us_label_rules_draft_v0.1.json",
  adUs: "us-ad-phrases_draft_v0.1.json",
} as const;

const AD_CONDITIONS = new Set(["always", "non_functional"]);

export type RuleValidationIssue = { level: "error" | "warn"; msg: string };

function localRead(
  root: string,
  file: string,
): { ok: true; data: unknown } | { ok: false; error: string } {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return { ok: false, error: `파일 없음: ${file}` };
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(p, "utf8")) };
  } catch (e) {
    return {
      ok: false,
      error: `JSON 파싱 실패 ${file}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function dupIds(ids: string[], label: string, issues: RuleValidationIssue[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id) {
      issues.push({ level: "error", msg: `${label}: 빈 id` });
      continue;
    }
    if (seen.has(id)) issues.push({ level: "error", msg: `${label}: id 중복 ${id}` });
    seen.add(id);
  }
}

function checkPatterns(patterns: unknown, where: string, issues: RuleValidationIssue[]) {
  if (!Array.isArray(patterns)) {
    issues.push({ level: "error", msg: `${where}: patterns 배열 아님` });
    return;
  }
  for (const p of patterns) {
    if (typeof p !== "string") {
      issues.push({ level: "error", msg: `${where}: 패턴이 문자열 아님` });
      continue;
    }
    if (!p.trim()) issues.push({ level: "warn", msg: `${where}: 빈 패턴` });
    else if ([...p].length === 1) issues.push({ level: "warn", msg: `${where}: 한 글자 패턴 "${p}"` });
  }
}

export function validateLabelRulesAt(
  root: string = path.join(process.cwd(), "review", "data"),
): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  const F = LABEL_RULE_FILES;

  const kr = localRead(root, F.kr);
  let krIdsNonPend: string[] = [];
  if (!kr.ok) issues.push({ level: "error", msg: kr.error });
  else {
    const data = kr.data as { rules?: Array<Record<string, unknown>> };
    if (!Array.isArray(data.rules)) issues.push({ level: "error", msg: "kr: rules 배열 없음" });
    else {
      const ids: string[] = [];
      for (const r of data.rules) {
        const id = String(r.id || "");
        ids.push(id);
        if (!id.startsWith("KR-PEND-")) krIdsNonPend.push(id);
        if (!r.title) issues.push({ level: "error", msg: `kr ${id}: title 필수` });
        if (!r.check_type) issues.push({ level: "error", msg: `kr ${id}: check_type 필수` });
        if (r.rule == null) issues.push({ level: "error", msg: `kr ${id}: rule 필수` });
      }
      dupIds(ids, "kr_label_rules", issues);
    }
  }

  const adKr = localRead(root, F.adKr);
  let adKrIds: string[] = [];
  if (!adKr.ok) issues.push({ level: "error", msg: adKr.error });
  else {
    const data = adKr.data as { items?: Array<Record<string, unknown>> };
    if (!Array.isArray(data.items)) issues.push({ level: "error", msg: "ad-kr: items 배열 없음" });
    else {
      for (const it of data.items) {
        const id = String(it.id || "");
        adKrIds.push(id);
        if (!it.title) issues.push({ level: "error", msg: `ad-kr ${id}: title 필수` });
        checkPatterns(it.patterns, `ad-kr ${id}`, issues);
        const cond = String(it.condition || "");
        if (cond && !AD_CONDITIONS.has(cond)) {
          issues.push({ level: "error", msg: `ad-kr ${id}: condition 허용값 아님 (${cond})` });
        }
      }
      dupIds(adKrIds, "ad-phrases-kr", issues);
    }
  }

  const fix = localRead(root, F.fixKr);
  if (!fix.ok) issues.push({ level: "error", msg: fix.error });
  else {
    const data = fix.data as {
      suggestions?: Record<string, { fix_kind?: string; fix_ko?: string }>;
    };
    if (!data.suggestions || typeof data.suggestions !== "object") {
      issues.push({ level: "error", msg: "fix-suggestions: suggestions 객체 없음" });
    } else {
      const required = [...krIdsNonPend, ...adKrIds];
      for (const id of required) {
        if (!data.suggestions[id]) {
          issues.push({ level: "error", msg: `fix-suggestions: 커버리지 누락 ${id}` });
        } else if (!String(data.suggestions[id].fix_ko || "").trim()) {
          issues.push({ level: "error", msg: `fix-suggestions ${id}: fix_ko 필수` });
        }
      }
    }
  }

  const us = localRead(root, F.us);
  if (!us.ok) issues.push({ level: "error", msg: us.error });
  else {
    const data = us.data as { rules?: Array<Record<string, unknown>> };
    if (!Array.isArray(data.rules)) issues.push({ level: "error", msg: "us: rules 배열 없음" });
    else {
      const ids: string[] = [];
      for (const r of data.rules) {
        const id = String(r.id || "");
        ids.push(id);
        if (!r.title_ko) issues.push({ level: "error", msg: `us ${id}: title_ko 필수` });
        if (!r.check_type) issues.push({ level: "error", msg: `us ${id}: check_type 필수` });
      }
      dupIds(ids, "us_label_rules", issues);
    }
  }

  const adUs = localRead(root, F.adUs);
  if (!adUs.ok) issues.push({ level: "error", msg: adUs.error });
  else {
    const data = adUs.data as { items?: Array<Record<string, unknown>> };
    if (!Array.isArray(data.items)) issues.push({ level: "error", msg: "ad-us: items 배열 없음" });
    else {
      const ids: string[] = [];
      for (const it of data.items) {
        const id = String(it.id || "");
        ids.push(id);
        if (!it.title_ko) issues.push({ level: "error", msg: `ad-us ${id}: title_ko 필수` });
        checkPatterns(it.patterns, `ad-us ${id}`, issues);
        const cond = String(it.condition || "always");
        if (!AD_CONDITIONS.has(cond)) {
          issues.push({ level: "error", msg: `ad-us ${id}: condition 허용값 아님 (${cond})` });
        }
      }
      dupIds(ids, "us-ad-phrases", issues);
    }
  }

  return issues;
}
