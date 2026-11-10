/**
 * 507 — 고객용 UI 표기·결론·탭·fix.kind·금지어 정적 회귀.
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildVerdict507,
  defaultTab507,
  fixKindHeading507,
  STATUS_LABEL_507,
} from "../../lib/label-check/ui-status-507";

export const name = "표시사항 507 — UI 표기·결론·탭·금지어";

const FORBIDDEN = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%", "위반 가능"];

function walkTsx(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkTsx(p, acc);
    else if (/\.(tsx|ts|css)$/.test(name)) acc.push(p);
  }
  return acc;
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // 상태→표기
  if (STATUS_LABEL_507.possible !== "고칠 것") f.push("507: possible 표기");
  if (STATUS_LABEL_507.attention !== "확인할 것") f.push("507: attention 표기");
  if (STATUS_LABEL_507.unknown !== "확인 못 함") f.push("507: unknown 표기");
  if (STATUS_LABEL_507.pass !== "문제 없음") f.push("507: pass 표기");

  // 결론 3분기
  {
    const a = buildVerdict507({ possible: 2, attention: 1, unknown: 0, pass: 10, manual: 0 });
    if (!a.headline.includes("고칠 곳이 2군데")) f.push(`507: 결론 fix "${a.headline}"`);
    const b = buildVerdict507({ possible: 0, attention: 3, unknown: 0, pass: 10, manual: 1 });
    if (!b.headline.includes("확인할 곳이 4군데")) f.push(`507: 결론 check "${b.headline}"`);
    const c = buildVerdict507({ possible: 0, attention: 0, unknown: 0, pass: 10, manual: 0 });
    if (!c.headline.includes("발견된 항목이 없어요")) f.push(`507: 결론 empty`);
    if (!c.subNote?.includes("최종 확인")) f.push("507: 결론 subNote");
  }

  // 탭 기본
  if (defaultTab507({ fix: 1, check: 2, unknown: 1, pass: 5 }) !== "fix") {
    f.push("507: 기본 탭 fix");
  }
  if (defaultTab507({ fix: 0, check: 2, unknown: 1, pass: 5 }) !== "check") {
    f.push("507: 기본 탭 check");
  }
  if (defaultTab507({ fix: 0, check: 0, unknown: 0, pass: 5 }) !== "pass") {
    f.push("507: 기본 탭 pass");
  }

  // fix.kind 소제목
  if (fixKindHeading507("fill") !== "이렇게 넣으세요") f.push("507: fill 소제목");
  if (!fixKindHeading507("replace").includes("바꿔")) f.push("507: replace 소제목");
  if (!fixKindHeading507("delete").includes("빼는")) f.push("507: delete 소제목");
  if (!fixKindHeading507("evidence").includes("근거")) f.push("507: evidence 소제목");
  if (!fixKindHeading507("functional_only").includes("기능성")) f.push("507: functional 소제목");
  if (!fixKindHeading507("manual").includes("직접")) f.push("507: manual 소제목");

  // UI 파일 금지어 + "위반 가능" 없음
  const roots = [
    path.join("components", "label-check", "ui-507"),
    path.join("lib", "label-check", "ui-status-507.ts"),
    path.join("app", "label-check", "page.tsx"),
    path.join("app", "label-check", "new", "page.tsx"),
    path.join("app", "label-check", "history", "[id]", "page.tsx"),
  ];
  const files: string[] = [];
  for (const r of roots) {
    if (fs.existsSync(r) && fs.statSync(r).isDirectory()) walkTsx(r, files);
    else if (fs.existsSync(r)) files.push(r);
  }
  for (const file of files) {
    // CSS 수치(width 등)의 "100%"는 카피 금지어가 아님 — ts/tsx만 검사
    if (file.endsWith(".css")) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const w of FORBIDDEN) {
      if (text.includes(w)) f.push(`507: 금지어 "${w}" in ${file}`);
    }
  }

  // ResultView: fix 없으면 수정 영역 조건
  {
    const rv = fs.readFileSync(
      path.join("components", "label-check", "ui-507", "ResultView.tsx"),
      "utf8",
    );
    if (!rv.includes("showFix") || !rv.includes("f.fix")) {
      f.push("507: 빈 fix 시 수정 영역 가드 없음");
    }
    if (!rv.includes("hideEvidence")) f.push("507: history hideEvidence 없음");
  }

  // noindex
  for (const p of [
    "app/label-check/layout.tsx",
    "app/label-check/new/layout.tsx",
    "app/label-check/history/layout.tsx",
  ]) {
    if (!fs.existsSync(p)) {
      f.push(`507: ${p} 없음`);
      continue;
    }
    const t = fs.readFileSync(p, "utf8");
    if (!/index:\s*false/.test(t)) f.push(`507: ${p} noindex 아님`);
  }

  return f;
}

if (require.main === module)
  void run().then((x) => {
    for (const s of x) console.log(s);
    process.exit(x.length ? 1 : 0);
  });
