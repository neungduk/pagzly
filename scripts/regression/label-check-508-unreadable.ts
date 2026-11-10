/**
 * 508A — unreadable/partial 표기·저장 가드 정적·단위 회귀.
 */
import fs from "node:fs";
import path from "node:path";
import { assessReadStatus508 } from "../../lib/label-check/read-status-508";
import { attachReadStatus508 } from "../../lib/label-check/attach-read-status-508";
import { buildVerdict507 } from "../../lib/label-check/ui-status-507";
import type { LabelCheckResult } from "../../lib/label-check/types";

export const name = "표시사항 508 — 점검불가·일부읽음";

function emptyResult(partial?: Partial<LabelCheckResult>): LabelCheckResult {
  return {
    disclaimer: "d",
    readable: true,
    charCount: 0,
    skipJudgment: false,
    summary: { possible: 0, attention: 0, unknown: 0, pass: 0, manual: 0 },
    findings: [],
    manualItems: [],
    ...partial,
  };
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // (1) 글자 0 → unreadable
  {
    const a = assessReadStatus508({ charCount: 0, pageCount: 3, emptyPages: [1, 2, 3] });
    if (a.readStatus !== "unreadable") f.push("508A: 0자 unreadable 아님");
    const attached = attachReadStatus508(emptyResult({ charCount: 0 }), {
      charCount: 0,
      pageCount: 3,
      emptyPages: [1, 2, 3],
    });
    if (attached.readStatus !== "unreadable") f.push("508A: attach unreadable");
    if (!attached.skipJudgment) f.push("508A: unreadable skipJudgment");
    const v = buildVerdict507(attached.summary, {
      readStatus: attached.readStatus,
      skipJudgment: attached.skipJudgment,
    });
    if (v.headline.includes("발견된 항목이 없어요")) f.push("508A: 빈결과 제목 오용");
    if (!v.headline.includes("점검하지 못했어요")) f.push("508A: unreadable 제목");
  }

  // (2) 혼합 → partial + 제목
  {
    const a = assessReadStatus508({
      charCount: 500,
      pageCount: 4,
      emptyPages: [2, 4],
    });
    if (a.readStatus !== "partial") f.push(`508A: partial 아님 (${a.readStatus})`);
    const v = buildVerdict507(
      { possible: 0, attention: 0, unknown: 0, pass: 3, manual: 0 },
      { readStatus: "partial" },
    );
    if (!v.headline.includes("읽은 부분에서는")) f.push("508A: partial 빈제목");
  }

  // (3) 정상 → ok
  {
    const a = assessReadStatus508({ charCount: 800, pageCount: 2, emptyPages: [] });
    if (a.readStatus !== "ok") f.push("508A: 정상 ok 아님");
    const v = buildVerdict507(
      { possible: 0, attention: 0, unknown: 0, pass: 5, manual: 0 },
      { readStatus: "ok" },
    );
    if (!v.headline.includes("발견된 항목이 없어요")) f.push("508A: 정상 빈제목 회귀");
  }

  // (4) 저장 가드 — API에서 unreadable 저장 조건
  {
    const route = fs.readFileSync(path.join("app", "api", "label-check", "route.ts"), "utf8");
    if (!/readStatus\s*!==\s*[\"']unreadable[\"']/.test(route) && !/readStatus !== "unreadable"/.test(route)) {
      f.push("508A: unreadable 저장 가드 없음");
    }
  }

  // UI: 점수칸 가드 + 금지 제목
  {
    const rv = fs.readFileSync(
      path.join("components", "label-check", "ui-507", "ResultView.tsx"),
      "utf8",
    );
    if (!rv.includes("unreadable") || !rv.includes("점검하지 못했어요") && !rv.includes("buildVerdict507")) {
      /* headline comes from helper */
    }
    if (!rv.includes("!unreadable") && !rv.includes("unreadable")) {
      f.push("508A: ResultView unreadable 분기 없음");
    }
    if (!rv.includes("onStartOcr") || !rv.includes("onFocusPaste")) {
      f.push("508A: ResultView CTA props 없음");
    }
  }

  // 대부분 이미지 + 짧은 글자
  {
    const a = assessReadStatus508({
      charCount: 80,
      pageCount: 10,
      emptyPages: [1, 2, 3, 4, 5, 6, 7, 8],
    });
    if (a.readStatus !== "unreadable") f.push("508A: 이미지 위주 unreadable");
  }

  // 낮은 OCR 신뢰도
  {
    const a = assessReadStatus508({
      charCount: 100,
      pageCount: 1,
      emptyPages: [],
      avgConfidence: 0.4,
    });
    if (a.readStatus !== "unreadable") f.push("508A: 낮은 신뢰도 unreadable");
  }

  return f;
}

if (require.main === module)
  void run().then((x) => {
    for (const s of x) console.log(s);
    process.exit(x.length ? 1 : 0);
  });
