/**
 * 495 — 회원 검수 흐름: 저장 payload 안전·라우트·카피·회귀 가드.
 */
import fs from "node:fs";
import path from "node:path";
import {
  assertSavePayloadSafe,
  sanitizeFindingsForSave,
} from "../../lib/label-check/save-run";
import { safeLabelCheckNext } from "../../lib/label-check/safe-next";
import type { LabelCheckResult } from "../../lib/label-check/types";
import {
  LABEL_CHECK_GUEST_RATE_RULES,
  LABEL_CHECK_MEMBER_RATE_RULES,
  LABEL_CHECK_MAX_RUNS_PER_USER,
} from "../../lib/label-check/member-constants";

export const name = "표시사항 495 — 회원흐름·저장요약·가드";

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // next 안전
  if (safeLabelCheckNext("/label-check/new") !== "/label-check/new") f.push("495: next new 실패");
  if (safeLabelCheckNext("https://evil.com/") !== null) f.push("495: next open-redirect 허용");
  if (safeLabelCheckNext("/create") !== null) f.push("495: next /create 허용");

  // 저장 sanitize — found(PDF 조각) 제외
  const fake: LabelCheckResult = {
    disclaimer: "x",
    readable: true,
    charCount: 10,
    summary: { possible: 0, attention: 1, unknown: 0, pass: 1, manual: 0 },
    findings: [
      {
        category: "c",
        label: "내용량",
        status: "attention",
        found: "리제네 크림기미 · 주근깨 완치! PDF원문조각",
        suggest: "표기를 확인하세요.",
        checkType: "code",
      },
    ],
    manualItems: [],
  };
  const saved = sanitizeFindingsForSave(fake);
  if (saved.some((x) => /PDF원문|주근깨|found/i.test(JSON.stringify(x)))) {
    f.push("495: 저장 findings에 원문 조각 포함");
  }
  if (!saved[0]?.line.includes("확인")) f.push("495: suggest line 누락");
  const errs = assertSavePayloadSafe({
    findings: saved,
    options: { rinseOff: true },
    product_name: "테스트",
  });
  if (errs.length) f.push(`495: safe assert ${errs.join(",")}`);

  // 상수
  if (LABEL_CHECK_MEMBER_RATE_RULES[0].max <= LABEL_CHECK_GUEST_RATE_RULES[0].max) {
    f.push("495: 회원 레이트가 비회원 이하");
  }
  if (LABEL_CHECK_MAX_RUNS_PER_USER !== 200) f.push("495: 보관 상한 상수");

  // 라우트·마이그레이션 존재
  const files = [
    "app/label-check/new/page.tsx",
    "app/label-check/history/page.tsx",
    "app/label-check/history/[id]/page.tsx",
    "app/api/label-check/runs/route.ts",
    "app/api/label-check/runs/[id]/route.ts",
    "supabase/migrations/20261109150000_label_check_runs.sql",
    "components/label-check/ResultPanel.tsx",
  ];
  for (const p of files) {
    if (!fs.existsSync(path.join(process.cwd(), p))) f.push(`495: 없음 ${p}`);
  }

  const mig = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20261109150000_label_check_runs.sql"),
    "utf8",
  );
  if (!/enable row level security/i.test(mig)) f.push("495: RLS 없음");
  if (!/for select/i.test(mig) || !/for insert/i.test(mig) || !/for delete/i.test(mig)) {
    f.push("495: RLS 정책 부족");
  }
  if (/for update/i.test(mig)) f.push("495: update 정책이 있으면 안 됨");
  if (!/auth\.uid\(\)\s*=\s*user_id/i.test(mig)) f.push("495: 본인 조건 없음");

  const mw = fs.readFileSync(path.join(process.cwd(), "lib/supabase/middleware.ts"), "utf8");
  if (!/label-check\/new/.test(mw) || !/label-check\/history/.test(mw)) {
    f.push("495: 미들웨어 보호 없음");
  }

  const guest = fs.readFileSync(path.join(process.cwd(), "app/label-check/page.tsx"), "utf8");
  const header511 = fs.existsSync(path.join(process.cwd(), "components/label-check/ui-511/LabelHeader.tsx"))
    ? fs.readFileSync(path.join(process.cwd(), "components/label-check/ui-511/LabelHeader.tsx"), "utf8")
    : "";
  const guestNav = guest + header511;
  if (!/로그인/.test(guestNav) || !/내 결과/.test(guestNav)) f.push("495: 게스트 상단 링크 없음");
  if (/완벽\s*검수|자동\s*수정\s*보장/.test(guestNav)) f.push("495: 금지 카피");

  const api = fs.readFileSync(path.join(process.cwd(), "app/api/label-check/route.ts"), "utf8");
  if (!/saveLabelCheckRun/.test(api)) f.push("495: API 저장 연동 없음");
  if (!/saveError/.test(api)) f.push("495: 저장 실패 분리 없음");

  return f;
}
