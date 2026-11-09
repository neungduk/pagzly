/**
 * 501 — 규칙 검증(깨진 사본)·기준 날짜 표시.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LABEL_RULE_FILES, validateLabelRulesAt } from "../validate-label-rules-lib";
import {
  displayRulesDate,
  displayRulesVersion,
  formatRulesBasisLine501,
} from "../../lib/label-check/rules-meta";
import { runLabelCheck483 } from "../../lib/label-check/run-check";

export const name = "표시사항 501 — 검증 사본·기준 날짜";

function copyDataTo(tmp: string) {
  const src = path.join(process.cwd(), "review", "data");
  fs.mkdirSync(tmp, { recursive: true });
  for (const f of Object.values(LABEL_RULE_FILES)) {
    fs.copyFileSync(path.join(src, f), path.join(tmp, f));
  }
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // 원본은 오류 없이 통과(경고는 허용)
  {
    const issues = validateLabelRulesAt(path.join(process.cwd(), "review", "data"));
    const errors = issues.filter((i) => i.level === "error");
    if (errors.length) f.push(`501: 원본 검증 오류 ${errors.length}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lc-rules-501-"));
  try {
    // 잘못된 JSON
    copyDataTo(tmp);
    fs.writeFileSync(path.join(tmp, LABEL_RULE_FILES.kr), "{ not json", "utf8");
    if (!validateLabelRulesAt(tmp).some((i) => i.level === "error" && /JSON 파싱/.test(i.msg))) {
      f.push("501: 깨진 JSON 미검출");
    }

    // 중복 id
    copyDataTo(tmp);
    const usPath = path.join(tmp, LABEL_RULE_FILES.us);
    const us = JSON.parse(fs.readFileSync(usPath, "utf8")) as {
      rules: Array<{ id: string }>;
    };
    if (us.rules[0] && us.rules[1]) {
      us.rules[1].id = us.rules[0].id;
      fs.writeFileSync(usPath, JSON.stringify(us), "utf8");
      if (!validateLabelRulesAt(tmp).some((i) => /id 중복/.test(i.msg))) {
        f.push("501: 중복 id 미검출");
      }
    }

    // 필수 필드 누락
    copyDataTo(tmp);
    const adPath = path.join(tmp, LABEL_RULE_FILES.adUs);
    const ad = JSON.parse(fs.readFileSync(adPath, "utf8")) as {
      items: Array<{ id: string; title_ko?: string }>;
    };
    if (ad.items[0]) {
      delete ad.items[0].title_ko;
      fs.writeFileSync(adPath, JSON.stringify(ad), "utf8");
      if (!validateLabelRulesAt(tmp).some((i) => /title_ko 필수/.test(i.msg))) {
        f.push("501: 필수 필드 누락 미검출");
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // 날짜 표시 있음
  {
    const line = formatRulesBasisLine501("US");
    if (!line.startsWith("점검 기준: 규칙표 ")) f.push(`501: 기준 문구 형식 ${line}`);
    if (!/\(\d{4}-\d{2}-\d{2}\)/.test(line) && !line.includes("(미표기)")) {
      f.push(`501: 날짜/미표기 없음 ${line}`);
    }
    const r = await runLabelCheck483(
      fs.readFileSync("review/data/samples/us-497/us1_ok.pdf"),
      { rinseOff: false, functional: false, market: "US", imported: true },
    );
    if (r.rulesBasis !== line) f.push(`501: 결과 rulesBasis 불일치`);
  }

  // 날짜 없음 → 미표기
  {
    if (displayRulesDate({}) !== "미표기") f.push("501: 빈 meta 날짜 미표기");
    if (displayRulesVersion(undefined) !== "미표기") f.push("501: 빈 version 미표기");
    const kr = formatRulesBasisLine501("KR");
    if (!kr.includes("규칙표")) f.push("501: KR 기준 줄");
  }

  return f;
}
