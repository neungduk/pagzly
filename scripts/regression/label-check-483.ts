/**
 * 483 — 화장품 표시사항 PDF 검수 회귀.
 * 샘플 A/B/C 기대 결과 + 내부 id 비노출 + 면책 문구.
 */
import fs from "node:fs";
import path from "node:path";
import { runLabelCheck483 } from "../../lib/label-check/run-check";
import { DISCLAIMER_483 } from "../../lib/label-check/types";

export const name = "표시사항 483 — 샘플 A/B/C·면책·id 비노출";

const samples = path.join(process.cwd(), "review", "data", "samples");

function hasStatus(findings: { label: string; status: string; found: string }[], status: string, labelPart: string) {
  return findings.some((f) => f.status === status && f.label.includes(labelPart));
}

function foundIncludes(findings: { found: string; label: string }[], part: string) {
  return findings.some((f) => f.found.includes(part) || f.label.includes(part));
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const needed = [
    "sample_A_moari_toner.pdf",
    "sample_B_rovan_sun.pdf",
    "sample_C_salt_bodywash.pdf",
    path.join("..", "kr_label_rules_draft_v0.1.json"),
    path.join("..", "allergens-kr-25_draft.json"),
  ];
  for (const n of needed) {
    const p = n.startsWith("..") ? path.join(samples, n) : path.join(samples, n);
    const alt = path.join(process.cwd(), "review", "data", n.replace(/^\.\.\//, ""));
    if (!fs.existsSync(p) && !fs.existsSync(alt) && !fs.existsSync(path.join(samples, n))) {
      if (!fs.existsSync(path.join(samples, path.basename(n))) && !n.includes("json")) {
        f.push(`샘플 없음: ${n}`);
      }
    }
  }
  if (!fs.existsSync(path.join(process.cwd(), "review/data/kr_label_rules_draft_v0.1.json"))) {
    f.push("규칙표 없음");
  }
  if (!fs.existsSync(path.join(process.cwd(), "review/data/allergens-kr-25_draft.json"))) {
    f.push("알레르기 초안 없음");
  }
  if (f.length) return f;

  // A
  {
    const buf = fs.readFileSync(path.join(samples, "sample_A_moari_toner.pdf"));
    const r = await runLabelCheck483(buf, { rinseOff: false, functional: false });
    if (!r.readable) f.push("A: 읽기 불가");
    if (r.disclaimer !== DISCLAIMER_483) f.push("A: 면책 문구 불일치");
    if (!hasStatus(r.findings, "possible", "사용기한")) f.push("A: 사용기한 누락 미검출");
    if (!hasStatus(r.findings, "attention", "의약품") && !foundIncludes(r.findings, "재생")) {
      f.push("A: 재생/완전 제거 확인 필요 미검출");
    }
    if (!foundIncludes(r.findings, "리모넨") || !foundIncludes(r.findings, "리날룰")) {
      f.push("A: 알레르기 리모넨/리날룰 미검출");
    }
    const blob = JSON.stringify(r);
    if (/"id"\s*:\s*"R\d+/.test(blob) || blob.includes('"R01"')) f.push("A: 내부 rule id 노출");
  }

  // B
  {
    const buf = fs.readFileSync(path.join(samples, "sample_B_rovan_sun.pdf"));
    const r = await runLabelCheck483(buf, { rinseOff: false, functional: true });
    if (!hasStatus(r.findings, "possible", "제조번호")) f.push("B: 제조번호 누락 미검출");
    if (!hasStatus(r.findings, "attention", "기능성")) f.push("B: 기능성 표기 확인 필요 미검출");
  }

  // C
  {
    const buf = fs.readFileSync(path.join(samples, "sample_C_salt_bodywash.pdf"));
    const r = await runLabelCheck483(buf, { rinseOff: true, functional: false });
    if (r.summary.possible > 0) f.push(`C: 위반 가능 ${r.summary.possible}건(기대 0)`);
    if (!hasStatus(r.findings, "attention", "장벽") && !foundIncludes(r.findings, "장벽")) {
      f.push("C: 피부 장벽 강화 확인 필요 미검출");
    }
    if (r.summary.pass < 8) f.push(`C: 통과 ${r.summary.pass} < 8`);
  }

  // 페이지·API 경로 존재
  for (const p of ["app/label-check/page.tsx", "app/api/label-check/route.ts"]) {
    if (!fs.existsSync(path.join(process.cwd(), p))) f.push(`경로 없음: ${p}`);
  }

  return f;
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
