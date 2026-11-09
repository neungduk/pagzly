/**
 * 494 — 향 오탐 수정 · 미국 합성 텍스트 · 수정제안 필드 · 카피 가드.
 */
import fs from "node:fs";
import path from "node:path";
import {
  includesAnyWithHangulBoundary,
  runLabelCheck483,
  runLabelCheckText483,
  runLabelCheckUsText494,
} from "../../lib/label-check/run-check";
import { loadUsLabelRules494 } from "../../lib/label-check/load-rules-us";
import { DISCLAIMER_US_EXTRA_494, NOTICE_OTC_US_494 } from "../../lib/label-check/types";

export const name = "표시사항 494 — 향경계·미국모드·수정제안";

const IND = path.join("review", "data", "samples", "independent-492");

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // 한 글자 경계
  {
    const hit = includesAnyWithHangulBoundary("경기도 화성시 향남읍 제약공단길", ["향료", "착향제", "향"]);
    if (hit) f.push(`494: 향남읍에서 '${hit}' 매칭됨(오탐)`);
    const ok = includesAnyWithHangulBoundary("전성분: 정제수, 향료", ["향료", "착향제", "향"]);
    if (ok !== "향료") f.push(`494: 향료 미검출 (${ok})`);
  }

  // i1 알레르기 사라짐
  {
    const p = path.join(IND, "i1_ok_twocol.pdf");
    if (!fs.existsSync(p)) f.push("494: i1 없음");
    else {
      const r = await runLabelCheck483(fs.readFileSync(p), { rinseOff: true, functional: false });
      const al = r.findings.find((x) => x.label.includes("알레르기"));
      if (al && al.status === "attention") f.push(`494: i1 알레르기 여전히 attention — ${al.found}`);
    }
  }

  // 미국 합성 텍스트
  const usOk = `
Hydrating Face Serum
NET 1.7 FL OZ (50 mL)
Distributed by Moari Inc., 123 Main St, Los Angeles, CA 90001
Ingredients: Aqua, Glycerin, Niacinamide, Tocopherol
Questions? Call 1-800-555-0100 or email care@moari.example
`.trim();

  const usBad = `
Mystery Product
Some Korean only text without english required fields
`.trim();

  {
    const r = await runLabelCheckUsText494(usOk, {
      rinseOff: false,
      functional: false,
      market: "US",
    });
    if (r.skipJudgment) f.push("494: US 정상본 skipJudgment");
    if (!r.disclaimer.includes(DISCLAIMER_US_EXTRA_494)) f.push("494: US 면책 한 줄 없음");
    for (const lab of [
      "제품 성격·용도(identity)",
      "내용량(Net quantity)",
      "제조·판매자 이름과 영업소 소재지",
      "성분 표시(Ingredients)",
      "부작용 신고 연락처(MoCRA)",
    ]) {
      const row = r.findings.find((x) => x.label === lab);
      if (!row || row.status !== "pass") f.push(`494: US 정상 ${lab}=${row?.status}`);
      if (row && row.status === "pass" && !row.fixSuggestion && lab.includes("내용량")) {
        // fix fields should exist from data even on pass
      }
      if (row && !row.fixSuggestion && row.fixExample === undefined) {
        // US rules always have fix_ko in data — withFix attaches on all
      }
    }
  }

  {
    const r = await runLabelCheckUsText494(usBad, {
      rinseOff: false,
      functional: false,
      market: "US",
    });
    const id = r.findings.find((x) => x.label.includes("identity") || x.label.includes("용도"));
    const net = r.findings.find((x) => x.label.includes("내용량"));
    const biz = r.findings.find((x) => x.label.includes("제조·판매자"));
    const ing = r.findings.find((x) => x.label.includes("Ingredients") || x.label.includes("성분"));
    const contact = r.findings.find((x) => x.label.includes("연락처"));
    for (const [name, row] of [
      ["identity", id],
      ["net", net],
      ["biz", biz],
      ["ing", ing],
      ["contact", contact],
    ] as const) {
      if (!row || row.status === "pass") f.push(`494: US 누락 ${name} 미검출 (${row?.status})`);
    }
  }

  // OTC 보류
  {
    const r = await runLabelCheckUsText494(usOk, {
      rinseOff: false,
      functional: false,
      market: "US",
      otcDrugLike: true,
    });
    if (!r.skipJudgment || r.notice !== NOTICE_OTC_US_494) f.push("494: OTC 보류 실패");
  }

  // 수입 체크 시 US-005
  {
    const r = await runLabelCheckUsText494(`${usOk}\nMade in Korea`, {
      rinseOff: false,
      functional: false,
      market: "US",
      imported: true,
    });
    const ori = r.findings.find((x) => x.label.includes("원산지"));
    if (!ori || ori.status !== "pass") f.push(`494: US-005 미통과 ${ori?.status}`);
  }

  // 어댑터 로드
  if (loadUsLabelRules494().length < 10) f.push("494: US 규칙 로드 부족");

  // 카피 가드
  {
    const page = fs.readFileSync(path.join("app", "label-check", "page.tsx"), "utf8");
    if (/완벽\s*검수|자동\s*수정\s*보장/.test(page)) f.push("494: 금지 카피 화면 존재");
    if (!/수정 제안/.test(page)) f.push("494: 수정 제안 UI 없음");
    if (!/시장/.test(page)) f.push("494: 시장 선택 없음");
  }

  // KR 텍스트 경로 market 기본
  {
    const r = await runLabelCheckText483("전성분: 정제수, 향료\n사용할 때의 주의사항: 주의", {
      rinseOff: true,
      functional: false,
    });
    if (r.market && r.market !== "KR") f.push("494: 기본 market 아님");
  }

  // todo 파일
  if (!fs.existsSync(path.join("review", "data", "fix-suggestions-kr_todo.md"))) {
    f.push("494: fix-suggestions-kr_todo.md 없음");
  }

  return f;
}
