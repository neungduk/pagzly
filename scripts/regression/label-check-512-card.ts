/**
 * 512 — 결과 카드 종류 분류·표시 가드
 */
import fs from "node:fs";
import path from "node:path";
import type { Finding } from "../../lib/label-check/types";
import { classifyFinding512 } from "../../components/label-check/ui-511/finding-kind-512";

export const name = "표시사항 512 — 결과 카드 종류·표시";

const FORBIDDEN = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];

function fPartial(p: Partial<Finding>): Finding {
  return {
    category: "",
    label: p.label || "항목",
    status: p.status || "possible",
    found: p.found || "",
    suggest: p.suggest || "",
    checkType: p.checkType || "code",
    checkKey: p.checkKey,
    evidence: p.evidence,
    fix: p.fix,
    basis: p.basis,
    exception: p.exception,
    exceptionNote: p.exceptionNote,
  };
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  // (a) classifyFinding512 표
  const cases: Array<{ found?: string; evidence?: Finding["evidence"]; checkKey?: string; expect: string }> = [
    { found: "관련 표기를 찾지 못함", expect: "missing" },
    { found: "원산지 표기를 찾지 못함", expect: "missing" },
    { found: "전화·이메일 등 연락처를 찾지 못함", expect: "missing" },
    { found: "내용량(숫자+단위)을 찾지 못함", expect: "missing" },
    { found: "전성분 영역 크기(pt): 4, 5 — 5pt 미만 1건", expect: "measure" },
    {
      found: "피부 재생",
      checkKey: "MFDS-AD-1",
      evidence: [{ found: "피부 재생", sentence: "피부 재생에 도움을 줍니다" }],
      expect: "wording",
    },
  ];
  for (const c of cases) {
    const kind = classifyFinding512(
      fPartial({ found: c.found, evidence: c.evidence, checkKey: c.checkKey }),
    );
    if (kind !== c.expect) {
      fails.push(`512a: "${c.found}" → ${kind} (기대 ${c.expect})`);
    }
  }

  // (b) 정적 검사
  const bodyPath = path.join("components", "label-check", "ui-511", "FindingCardBody512.tsx");
  const kindPath = path.join("components", "label-check", "ui-511", "finding-kind-512.ts");
  const rvPath = path.join("components", "label-check", "ui-507", "ResultView.tsx");
  const body = fs.readFileSync(bodyPath, "utf8");
  const kindSrc = fs.readFileSync(kindPath, "utf8");
  const rv = fs.readFileSync(rvPath, "utf8");

  // missing 경로에서 before(취소선) 미사용 — MissingFix에 className "before" 없음
  const missingFixStart = body.indexOf("function MissingFix");
  const missingFixEnd = body.indexOf("function MeasureFix", missingFixStart);
  const missingChunk = missingFixStart >= 0 ? body.slice(missingFixStart, missingFixEnd) : "";
  if (!missingChunk) fails.push("512b: MissingFix 없음");
  else if (/\bclassName=\"before\"|\.before\b|className=\{\s*['\"]before/.test(missingChunk) || missingChunk.includes('className="before"')) {
    fails.push("512b: missing 경로에 취소선 before");
  }
  if (missingChunk.includes("lc511-pair") && missingChunk.includes("before")) {
    fails.push("512b: missing Fix에 before 쌍");
  }

  // 예시 문구 노트는 showExampleNote 조건
  if (!/showExampleNote=\{examples\.length > 0\}/.test(body) && !/showExampleNote\s*\?\s*/.test(body)) {
    fails.push("512b: 예시 문구 조건 표시 가드 없음");
  }
  if (!body.includes("showExampleNote")) fails.push("512b: showExampleNote 없음");

  // 하나 마나 한 문구 문자열 금지
  if (body.includes("해당 항목을 확인")) {
    fails.push("512b: 하나 마나 한 문구 문자열 존재");
  }

  for (const file of [bodyPath, kindPath, rvPath]) {
    const text = fs.readFileSync(file, "utf8");
    for (const w of FORBIDDEN) {
      if (text.includes(w)) fails.push(`512b: 금지어 "${w}" in ${file}`);
    }
  }

  if (!rv.includes("FindingCardBody512")) fails.push("512b: ResultView가 FindingCardBody512 미사용");
  if (!kindSrc.includes("classifyFinding512")) fails.push("512b: classifyFinding512 없음");

  // evidence 없는 missing에서 wording before 경로 분리 확인
  if (!body.includes("이렇게 넣어 보세요") || !body.includes("이렇게 고쳐 보세요") || !body.includes("이렇게 확인해 보세요")) {
    fails.push("512b: 종류별 수정 제목 누락");
  }

  return fails;
}

if (require.main === module)
  void run().then((x) => {
    for (const s of x) console.log(s);
    process.exit(x.length ? 1 : 0);
  });
