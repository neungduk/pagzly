/**
 * 484 — 화장품 표시사항 PDF 검수 회귀(진짜 Chromium PDF + 생성기).
 * 샘플 A/B/C 기대 결과 + 내부 id 비노출 + 면책 문구 + 빈 PDF 확인 불가.
 */
import fs from "node:fs";
import path from "node:path";
import { runLabelCheck483 } from "../../lib/label-check/run-check";
import { DISCLAIMER_483 } from "../../lib/label-check/types";

export const name = "표시사항 484 — 진짜 PDF A/B/C·생성기·면책·id 비노출";

const samples = path.join(process.cwd(), "review", "data", "samples");
const gens = path.join(samples, "generators-484");

function hasStatus(findings: { label: string; status: string; found: string }[], status: string, labelPart: string) {
  return findings.some((f) => f.status === status && f.label.includes(labelPart));
}

function foundIncludes(findings: { found: string; label: string }[], part: string) {
  return findings.some((f) => f.found.includes(part) || f.label.includes(part));
}

function anyStatus(
  findings: { label: string; status: string; found: string }[],
  statuses: string[],
  labelPart: string,
) {
  return findings.some((f) => statuses.includes(f.status) && f.label.includes(labelPart));
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  if (!fs.existsSync(path.join(process.cwd(), "review/data/kr_label_rules_draft_v0.1.json"))) {
    f.push("규칙표 없음");
  }
  if (!fs.existsSync(path.join(process.cwd(), "review/data/allergens-kr-25_draft.json"))) {
    f.push("알레르기 초안 없음");
  }
  for (const n of ["sample_A_moari_toner.pdf", "sample_B_rovan_sun.pdf", "sample_C_salt_bodywash.pdf"]) {
    if (!fs.existsSync(path.join(samples, n))) f.push(`샘플 없음: ${n}`);
  }
  if (f.length) return f;

  // A
  {
    const buf = fs.readFileSync(path.join(samples, "sample_A_moari_toner.pdf"));
    const r = await runLabelCheck483(buf, { rinseOff: false, functional: false });
    if (!r.readable) f.push("A: 읽기 불가");
    if (r.disclaimer !== DISCLAIMER_483) f.push("A: 면책 문구 불일치");
    if (!anyStatus(r.findings, ["possible", "attention"], "사용기한")) f.push("A: 사용기한 누락 미검출");
    if (
      !hasStatus(r.findings, "attention", "의약품") &&
      !foundIncludes(r.findings, "재생") &&
      !foundIncludes(r.findings, "완전 제거")
    ) {
      f.push("A: 재생/완전 제거 확인 필요 미검출");
    }
    if (!foundIncludes(r.findings, "리모넨") || !foundIncludes(r.findings, "리날룰")) {
      f.push("A: 알레르기 리모넨/리날룰 미검출");
    }
    const allergen = r.findings.find((x) => x.label.includes("알레르기"));
    if (allergen && !/pt|포인트|크기|확인 불가/.test(allergen.found + allergen.suggest)) {
      f.push("A: 알레르기 글자 크기 안내 없음");
    }
    const blob = JSON.stringify(r);
    if (/"id"\s*:\s*"KR-/.test(blob) || blob.includes("KR-LBL-001")) f.push("A: 내부 rule id 노출");
    // status 값은 pass|possible|attention|unknown 만. 면책 문구의 '위반' 언급은 허용.
    if (r.findings.some((x) => x.status === ("위반" as typeof x.status))) f.push("A: status에 단정 위반");
  }

  // B
  {
    const buf = fs.readFileSync(path.join(samples, "sample_B_rovan_sun.pdf"));
    const r = await runLabelCheck483(buf, { rinseOff: false, functional: true });
    if (!anyStatus(r.findings, ["possible", "attention"], "제조번호")) f.push("B: 제조번호 누락 미검출");
    if (!anyStatus(r.findings, ["possible", "attention"], "기능성")) f.push("B: 기능성 표기 확인 필요 미검출");
  }

  // C
  {
    const buf = fs.readFileSync(path.join(samples, "sample_C_salt_bodywash.pdf"));
    const r = await runLabelCheck483(buf, { rinseOff: true, functional: false });
    if (r.summary.possible > 0) f.push(`C: 위반 가능 ${r.summary.possible}건(기대 0)`);
    if (!hasStatus(r.findings, "attention", "기능성") && !foundIncludes(r.findings, "장벽")) {
      f.push("C: 피부 장벽 강화 확인 필요 미검출");
    }
    if (r.summary.pass < 8) f.push(`C: 통과 ${r.summary.pass} < 8`);
  }

  // 생성기: 텍스트 없음 → 확인 불가
  {
    const empty = path.join(gens, "gen_empty_notext.pdf");
    if (fs.existsSync(empty)) {
      const r = await runLabelCheck483(fs.readFileSync(empty), { rinseOff: false, functional: false });
      if (r.readable) f.push("empty: readable면 안 됨");
      if (!r.findings.some((x) => x.status === "unknown")) f.push("empty: 확인 불가 미검출");
    } else {
      f.push("생성기 empty PDF 없음");
    }
  }

  // Chromium/pdfkit 생성기: 한글 문구 추출
  for (const n of ["gen_chromium.pdf", "gen_pdfkit_malgun.pdf"]) {
    const p = path.join(gens, n);
    if (!fs.existsSync(p)) {
      f.push(`생성기 없음: ${n}`);
      continue;
    }
    const r = await runLabelCheck483(fs.readFileSync(p), { rinseOff: false, functional: false });
    if (!r.readable) f.push(`${n}: 읽기 불가`);
    if (!foundIncludes(r.findings, "LOT") && !r.findings.some((x) => x.label.includes("제조번호") && x.status === "pass")) {
      f.push(`${n}: 제조번호/LOT 미검출`);
    }
  }

  for (const p of ["app/label-check/page.tsx", "app/api/label-check/route.ts"]) {
    if (!fs.existsSync(path.join(process.cwd(), p))) f.push(`경로 없음: ${p}`);
  }

  // 가로 넘침: 고정 min-width·vw 강제 폭 금지(320/390/750 공통)
  {
    const page = fs.readFileSync(path.join(process.cwd(), "app/label-check/page.tsx"), "utf8");
    if (/min-w-\[(?:[6-9]\d{2}|[1-9]\d{3,})px\]/.test(page)) f.push("label-check: 넓은 min-width로 가로 넘침 위험");
    if (!/max-w-3xl|max-w-full|w-full/.test(page)) f.push("label-check: 폭 제한 클래스 없음");
    if (!/break-words|overflow-x-auto|overflow-hidden/.test(page)) {
      f.push("label-check: 긴 텍스트 줄바꿈/넘침 가드 없음");
    }
  }

  return f;
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
