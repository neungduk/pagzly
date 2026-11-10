/**
 * 501 — 규칙 JSON 검증 코어(회귀·CLI 공용).
 */
import fs from "node:fs";
import path from "node:path";

export const LABEL_RULE_FILES = {
  kr: "kr_label_rules_draft_v0.1.json",
  adKr: "ad-phrases-kr_draft_v0.2.json",
  fixKr: "fix-suggestions-kr_draft_v0.1.json",
  us: "us_label_rules_draft_v0.1.json",
  adUs: "us-ad-phrases_draft_v0.1.json",
  cautionsKr: "kr-cautions_draft_v0.2.json",
  addendaKr: "kr-label-addenda_draft_v0.1.json",
  allergensKr: "allergens-kr-25_v1.json",
  rewriteKr: "rewrite-map-kr_draft_v0.1.json",
  rewriteUs: "rewrite-map-us_draft_v0.1.json",
  adExcKr: "ad-exceptions-kr_draft_v0.1.json",
  templates: "required-templates_draft_v0.1.json",
} as const;

const CAS_RE = /^\d{2,7}-\d{2}-\d$/;

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
        const patterns = it.patterns;
        const regexPatterns = it.regex_patterns;
        if (!Array.isArray(patterns) && !Array.isArray(regexPatterns)) {
          issues.push({ level: "error", msg: `ad-kr ${id}: patterns 또는 regex_patterns 필요` });
        } else if (Array.isArray(patterns)) {
          checkPatterns(patterns, `ad-kr ${id}`, issues);
        }
        if (Array.isArray(regexPatterns)) {
          for (const rp of regexPatterns) {
            if (typeof rp !== "string") {
              issues.push({ level: "error", msg: `ad-kr ${id}: regex_patterns 문자열 아님` });
              continue;
            }
            try {
              // eslint-disable-next-line no-new
              new RegExp(rp, "iu");
            } catch {
              issues.push({ level: "error", msg: `ad-kr ${id}: 정규식 컴파일 실패 ${rp}` });
            }
          }
        }
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
      // 504: 광고는 항목 fix_ko 사용 → KR 규칙만 커버리지 필수
      const required = [...krIdsNonPend];
      for (const id of required) {
        if (!data.suggestions[id]) {
          issues.push({ level: "error", msg: `fix-suggestions: 커버리지 누락 ${id}` });
        } else if (!String(data.suggestions[id].fix_ko || "").trim()) {
          issues.push({ level: "error", msg: `fix-suggestions ${id}: fix_ko 필수` });
        }
      }
    }
  }

  const cau = localRead(root, F.cautionsKr);
  if (!cau.ok) issues.push({ level: "error", msg: cau.error });
  else {
    const data = cau.data as {
      ingredient_cautions?: Array<Record<string, unknown>>;
      type_cautions?: Array<Record<string, unknown>>;
      common_cautions?: {
        items?: Array<Record<string, unknown>>;
      };
    };
    const ids: string[] = [];
    for (const row of data.ingredient_cautions || []) {
      const id = String(row.id || "");
      ids.push(id);
      if (!row.required_text_ko) issues.push({ level: "error", msg: `cautions ${id}: required_text_ko 필수` });
      const trig = row.trigger_ingredients_ko;
      if (!Array.isArray(trig) || trig.length === 0) {
        issues.push({ level: "error", msg: `cautions-ing ${id}: trigger_ingredients_ko 비어 있음` });
      }
    }
    for (const row of data.type_cautions || []) {
      const id = String(row.id || "");
      ids.push(id);
      if (!row.required_text_ko) issues.push({ level: "error", msg: `cautions ${id}: required_text_ko 필수` });
      if (!row.condition_note) issues.push({ level: "warn", msg: `cautions-type ${id}: condition_note 없음` });
    }
    const commons = data.common_cautions?.items;
    if (!Array.isArray(commons) || commons.length !== 4) {
      issues.push({
        level: "error",
        msg: `cautions common_cautions: 4개 필요(현재 ${Array.isArray(commons) ? commons.length : 0})`,
      });
    } else {
      for (const row of commons) {
        const id = String(row.id || "");
        ids.push(id);
        if (!row.required_text_ko) {
          issues.push({ level: "error", msg: `cautions-common ${id}: required_text_ko 필수` });
        }
        const keys = row.match_keys_ko;
        if (!Array.isArray(keys) || keys.length === 0) {
          issues.push({ level: "error", msg: `cautions-common ${id}: match_keys_ko 비어 있음` });
        }
      }
    }
    dupIds(ids, "kr-cautions", issues);
  }

  const alg = localRead(root, F.allergensKr);
  if (!alg.ok) issues.push({ level: "error", msg: alg.error });
  else {
    const data = alg.data as {
      items?: Array<{ no?: number; ko?: string; cas?: string; inci?: string }>;
    };
    const items = data.items || [];
    if (items.length !== 25) {
      issues.push({ level: "error", msg: `allergens v1: 25개 필요(현재 ${items.length})` });
    }
    const nos = items.map((it) => Number(it.no));
    for (let i = 1; i <= 25; i++) {
      if (!nos.includes(i)) {
        issues.push({ level: "error", msg: `allergens v1: no ${i} 누락` });
      }
    }
    for (const it of items) {
      const id = `no${it.no ?? "?"}`;
      if (!it.ko || !String(it.ko).trim()) {
        issues.push({ level: "error", msg: `allergens v1 ${id}: ko 필수` });
      }
      if (!it.cas || !String(it.cas).trim()) {
        issues.push({ level: "error", msg: `allergens v1 ${id}: cas 필수` });
      } else if (!CAS_RE.test(String(it.cas).trim())) {
        issues.push({ level: "error", msg: `allergens v1 ${id}: CAS 형식 아님 (${it.cas})` });
      }
    }
  }

  const add = localRead(root, F.addendaKr);
  if (!add.ok) issues.push({ level: "error", msg: add.error });
  else {
    const data = add.data as { addenda?: Array<Record<string, unknown>> };
    if (!Array.isArray(data.addenda)) issues.push({ level: "error", msg: "addenda: addenda 배열 없음" });
    else {
      const ids: string[] = [];
      for (const row of data.addenda) {
        const id = String(row.id || "");
        ids.push(id);
        if (!row.title) issues.push({ level: "error", msg: `addenda ${id}: title 필수` });
        if (!row.check_type) issues.push({ level: "error", msg: `addenda ${id}: check_type 필수` });
      }
      dupIds(ids, "kr-label-addenda", issues);
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

  // 506 — rewrite-map / exceptions / templates
  for (const [key, label] of [
    [F.rewriteKr, "rewrite-kr"],
    [F.rewriteUs, "rewrite-us"],
  ] as const) {
    const rw = localRead(root, key);
    if (!rw.ok) issues.push({ level: "error", msg: rw.error });
    else {
      const data = rw.data as { items?: Array<Record<string, unknown>> };
      if (!Array.isArray(data.items)) issues.push({ level: "error", msg: `${label}: items 없음` });
      else {
        const ids: string[] = [];
        for (const it of data.items) {
          const id = String(it.target_id || "");
          ids.push(id);
          if (!it.action) issues.push({ level: "error", msg: `${label} ${id}: action 필수` });
          if (!Array.isArray(it.alternatives)) {
            issues.push({ level: "error", msg: `${label} ${id}: alternatives 배열 필요` });
          }
        }
        dupIds(ids, label, issues);
      }
    }
  }

  const exc = localRead(root, F.adExcKr);
  if (!exc.ok) issues.push({ level: "error", msg: exc.error });
  else {
    const data = exc.data as { rules?: Array<Record<string, unknown>> };
    if (!Array.isArray(data.rules) || data.rules.length !== 10) {
      issues.push({
        level: "error",
        msg: `ad-exceptions: 10개 필요(현재 ${Array.isArray(data.rules) ? data.rules.length : 0})`,
      });
    } else {
      const ids: string[] = [];
      for (const r of data.rules) {
        const id = String(r.id || "");
        ids.push(id);
        if (!r.target_id) issues.push({ level: "error", msg: `ad-exc ${id}: target_id 필수` });
        if (!r.result) issues.push({ level: "error", msg: `ad-exc ${id}: result 필수` });
      }
      dupIds(ids, "ad-exceptions-kr", issues);
    }
  }

  const tpl = localRead(root, F.templates);
  if (!tpl.ok) issues.push({ level: "error", msg: tpl.error });
  else {
    const data = tpl.data as {
      KR?: Array<Record<string, unknown>>;
      US?: Array<Record<string, unknown>>;
    };
    if (!Array.isArray(data.KR) || data.KR.length < 1) {
      issues.push({ level: "error", msg: "required-templates: KR 배열 필요" });
    }
    if (!Array.isArray(data.US) || data.US.length < 1) {
      issues.push({ level: "error", msg: "required-templates: US 배열 필요" });
    }
  }

  return issues;
}
