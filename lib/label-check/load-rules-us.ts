/**
 * 494 — 미국 규칙 어댑터. KR 로더와 분리(필드 스키마가 다름).
 */
import fs from "node:fs";
import path from "node:path";
import type { CheckStatus, CheckType } from "@/lib/label-check/types";

export type UsRuleDraft = {
  id: string;
  title: string;
  citation: string;
  requirement: string;
  lookFor: string[];
  checkType: CheckType;
  failStatus: CheckStatus;
  fixKo: string;
  fixExampleEn: string;
  note: string;
  /** 입력 조건이 있을 때만 적용 */
  needsImported?: boolean;
  needsProfessional?: boolean;
  needsHazardous?: boolean;
};

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

function mapSeverity(sev: string | undefined): CheckStatus {
  const s = (sev || "").toLowerCase();
  if (s.includes("위반")) return "possible";
  if (s.includes("확인 불가") || s.includes("unknown")) return "unknown";
  return "attention";
}

export function loadUsLabelRules494(): UsRuleDraft[] {
  const raw = fs.readFileSync(dataPath("us_label_rules_draft_v0.1.json"), "utf8");
  const json = JSON.parse(raw) as {
    rules: Array<{
      id: string;
      title_ko: string;
      citation?: string;
      requirement_ko?: string;
      look_for?: string[];
      severity_if_missing?: string;
      check_type: "code" | "ai" | "manual";
      fix_ko?: string;
      fix_example_en?: string;
      note?: string;
    }>;
  };

  return (json.rules ?? []).map((r) => {
    let checkType: CheckType = r.check_type === "ai" ? "manual" : r.check_type;
    // 과제: 한글만 라벨 감지는 코드로
    if (r.id === "US-007") checkType = "code";

    return {
      id: r.id,
      title: r.title_ko,
      citation: r.citation || "",
      requirement: r.requirement_ko || "",
      lookFor: (r.look_for || []).filter(Boolean),
      checkType,
      failStatus: mapSeverity(r.severity_if_missing),
      fixKo: r.fix_ko || "",
      fixExampleEn: r.fix_example_en || "",
      note: r.note || "",
      needsImported: r.id === "US-005",
      needsProfessional: r.id === "US-011",
      needsHazardous: r.id === "US-009",
    };
  });
}
