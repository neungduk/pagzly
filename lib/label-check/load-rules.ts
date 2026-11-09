import fs from "node:fs";
import path from "node:path";

export type RuleDraft = {
  id: string;
  category: string;
  label: string;
  check_type: "code" | "ai" | "manual";
  keywords?: string[];
  keywords_any?: boolean;
  keywords_near?: string[];
  keywords_value_hint?: string;
  keywords_mode?: string;
  keywords_fail_status?: "possible" | "attention" | "unknown";
  keywords_suggest?: string;
  applies_when?: { functional?: boolean; rinse_off?: boolean };
  min_pt?: number;
};

export type AllergenDraft = {
  inci: string;
  ko_draft: string;
};

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

export function loadLabelRules483(): RuleDraft[] {
  const raw = fs.readFileSync(dataPath("kr_label_rules_draft_v0.1.json"), "utf8");
  const json = JSON.parse(raw) as { rules: RuleDraft[] };
  return json.rules ?? [];
}

export function loadAllergens483(): { disclaimer: string; allergens: AllergenDraft[] } {
  const raw = fs.readFileSync(dataPath("allergens-kr-25_draft.json"), "utf8");
  const json = JSON.parse(raw) as { disclaimer: string; allergens: AllergenDraft[] };
  return { disclaimer: json.disclaimer, allergens: json.allergens ?? [] };
}
