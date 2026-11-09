/**
 * 501 — 결과 화면용 규칙표 버전·날짜(meta만). 커밋 날짜 사용 금지.
 */
import fs from "node:fs";
import path from "node:path";
import type { LabelMarket } from "@/lib/label-check/types";

export type RulesFileMeta = {
  version?: string;
  date?: string;
  created?: string;
};

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

export function readJsonMeta(fileName: string): RulesFileMeta {
  try {
    const raw = fs.readFileSync(dataPath(fileName), "utf8");
    const json = JSON.parse(raw) as { meta?: RulesFileMeta };
    return json.meta || {};
  } catch {
    return {};
  }
}

/** draft_v0.1 / 0.1-draft → v0.1 형태 표시 */
export function displayRulesVersion(version: string | undefined): string {
  if (!version || !String(version).trim()) return "미표기";
  let v = String(version).trim();
  v = v.replace(/^draft[_-]?/i, "").replace(/-draft$/i, "");
  if (!v) return "미표기";
  return v.toLowerCase().startsWith("v") ? v : `v${v}`;
}

export function displayRulesDate(meta: RulesFileMeta): string {
  const d = (meta.date || meta.created || "").trim();
  return d || "미표기";
}

/** 시장별 주 규칙표 파일 */
export function primaryRulesFile(market: LabelMarket): string {
  return market === "US" ? "us_label_rules_draft_v0.1.json" : "kr_label_rules_draft_v0.1.json";
}

/**
 * 예: 점검 기준: 규칙표 v0.1 (2026-11-09)
 * 날짜 없으면 (미표기)
 */
export function formatRulesBasisLine501(market: LabelMarket = "KR"): string {
  const meta = readJsonMeta(primaryRulesFile(market));
  const ver = displayRulesVersion(meta.version);
  const date = displayRulesDate(meta);
  return `점검 기준: 규칙표 ${ver} (${date})`;
}
