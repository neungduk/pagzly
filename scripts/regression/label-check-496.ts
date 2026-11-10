/**
 * 496 — KR 수정제안 커버리지·부착·noindex·a11y 가드.
 */
import fs from "node:fs";
import path from "node:path";
import {
  applyKrFixSuggestions496,
  krFixSuggestionCoverage496,
  loadKrFixSuggestions496,
} from "../../lib/label-check/fix-suggestions-kr";
import { runLabelCheckText483 } from "../../lib/label-check/run-check";
import { run as forbiddenRun } from "./forbidden-words-496";

export const name = "표시사항 496 — 수정제안·금지어·noindex";

export async function run(): Promise<string[]> {
  const f: string[] = [];

  const cov = krFixSuggestionCoverage496();
  if (cov.missing.length) f.push(`496: 제안 누락 ${cov.missing.join(",")}`);
  // 504: 광고는 항목 fix_ko → required는 KR 규칙만(~30+)
  if (cov.required.length < 25) f.push(`496: required 부족 ${cov.required.length}`);
  if (Object.keys(loadKrFixSuggestions496()).length < 50) f.push("496: suggestions 부족");

  // 부착: 용량 누락 → fix_ko 있어야
  {
    const r = await runLabelCheckText483(
      "솔트 바디워시\n화장품책임판매업자: (주)테스트\n서울특별시 강남구 테헤란로 1\n제조번호: LOT1\n사용기한: 2028.10.31\n전성분: 정제수\n사용할 때의 주의사항: 주의",
      { rinseOff: true, functional: false },
    );
    const vol = r.findings.find((x) => x.label.includes("용량"));
    if (vol && vol.status !== "pass") {
      if (!vol.fixSuggestion) f.push("496: 용량 항목에 수정 제안 없음");
      if (vol.fixKind !== "fix") f.push(`496: 용량 fixKind=${vol.fixKind}`);
    }
  }

  // id 없으면 필드 비움
  {
    const cleared = applyKrFixSuggestions496([
      {
        category: "x",
        label: "존재하지않는라벨XYZ",
        status: "attention",
        found: "a",
        suggest: "b",
        checkType: "code",
        fixSuggestion: "있으면 안 됨",
        fixKind: "fix",
      },
    ]);
    if (cleared[0].fixSuggestion) f.push("496: 미매칭 라벨에 제안이 남음");
  }

  // noindex: layout + new/history
  const layout = fs.readFileSync(path.join("app/label-check/layout.tsx"), "utf8");
  if (!/index:\s*false/.test(layout)) f.push("496: /label-check layout noindex 아님");

  for (const p of ["app/label-check/new/layout.tsx", "app/label-check/history/layout.tsx"]) {
    if (!fs.existsSync(p)) {
      f.push(`496: ${p} 없음`);
      continue;
    }
    const t = fs.readFileSync(p, "utf8");
    if (!/index:\s*false/.test(t)) f.push(`496: ${p} noindex 아님`);
  }

  // todo 완료 한 줄
  const todo = fs.readFileSync(path.join("review/data/fix-suggestions-kr_todo.md"), "utf8");
  if (!/완료\(496차\)/.test(todo)) f.push("496: todo 완료 표기 없음");

  // a11y: 업로드 input + label / market name (507: UploadCard 공유)
  const neu = fs.readFileSync(path.join("app/label-check/new/page.tsx"), "utf8");
  const upload496 = fs.existsSync(path.join("components/label-check/ui-507/UploadCard.tsx"))
    ? fs.readFileSync(path.join("components/label-check/ui-507/UploadCard.tsx"), "utf8")
    : "";
  const neuUi = neu + upload496;
  if (!/name=\"market\"/.test(neuUi) && !/name='market'/.test(neuUi)) {
    // radio may use checked without name — require htmlFor or aria
    if (!/htmlFor|aria-label|fieldset|radiogroup/.test(neuUi)) f.push("496: new 접근성 레이블 부족");
  }
  if (!/role=\"alert\"/.test(neuUi)) f.push("496: new role=alert 없음");

  const hist = fs.readFileSync(path.join("app/label-check/history/page.tsx"), "utf8");
  if (!/confirm\(/.test(hist)) f.push("496: 삭제 확인 없음");

  f.push(...(await forbiddenRun()));
  return f;
}
