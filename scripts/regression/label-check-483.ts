/**
 * 485 — 화장품 표시사항 PDF 검수 회귀.
 * 진짜 PDF A/B/C + 시그니처/11쪽/빈/영문/로그 무본문 + 인쇄 UI.
 */
import fs from "node:fs";
import path from "node:path";
import { runLabelCheck483 } from "../../lib/label-check/run-check";
import {
  assertPageLimit,
  assertPdfSignature,
  buildMinimalPdfPages,
  countPdfPages,
  hasPdfSignature,
} from "../../lib/label-check/safe-upload";
import { labelContactEmail } from "../../lib/label-check/contact";
import {
  DISCLAIMER_483,
  ERR_NOT_PDF_485,
  ERR_TOO_MANY_PAGES_485,
  INTRO_LINES_486,
  INTRO_ONE_LINE_486,
  NOTICE_NO_HANGUL_485,
  NOTICE_OUTLINE_485,
  SAMPLE_BANNER_486,
} from "../../lib/label-check/types";
import sampleResultA from "../../lib/label-check/sample-result-a.json";

export const name = "표시사항 486 — 파일럿 소개·샘플·문의·noindex·A/B/C";

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
    const blob = JSON.stringify(r);
    if (/"id"\s*:\s*"KR-/.test(blob) || blob.includes("KR-LBL-001")) f.push("A: 내부 rule id 노출");
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

  // 시그니처 불일치
  {
    if (hasPdfSignature(Buffer.from("not a pdf"))) f.push("시그니처: 비PDF를 허용");
    if (assertPdfSignature(Buffer.from("PK\x03\x04")) !== ERR_NOT_PDF_485) f.push("시그니처: 거절 문구 불일치");
    const ok = fs.readFileSync(path.join(samples, "sample_A_moari_toner.pdf"));
    if (!hasPdfSignature(ok) || assertPdfSignature(ok) !== null) f.push("시그니처: 정상 PDF 거절");
  }

  // 11쪽 PDF
  {
    const eleven = buildMinimalPdfPages(11);
    const counted = await countPdfPages(eleven);
    if ("error" in counted) f.push(`11쪽: 페이지 수 실패 ${counted.error}`);
    else if (counted.pages !== 11) f.push(`11쪽: pages=${counted.pages}`);
    else if (assertPageLimit(counted.pages) !== ERR_TOO_MANY_PAGES_485) f.push("11쪽: 상한 거절 문구 불일치");
    const ten = buildMinimalPdfPages(10);
    const c10 = await countPdfPages(ten);
    if ("error" in c10 || assertPageLimit(c10.pages) !== null) f.push("10쪽: 허용되어야 함");
  }

  // 빈 PDF → 아웃라인 안내만, findings 0
  {
    const empty = path.join(gens, "gen_empty_notext.pdf");
    if (!fs.existsSync(empty)) f.push("생성기 empty PDF 없음");
    else {
      const r = await runLabelCheck483(fs.readFileSync(empty), { rinseOff: false, functional: false });
      if (!r.skipJudgment) f.push("empty: skipJudgment 아님");
      if (r.notice !== NOTICE_OUTLINE_485) f.push("empty: 아웃라인 안내 불일치");
      if (r.findings.length !== 0) f.push(`empty: findings ${r.findings.length} (기대 0)`);
      if (r.summary.possible !== 0) f.push("empty: 위반 가능이 나오면 안 됨");
    }
  }

  // 영문 PDF → 한글 미검출 안내 + 판정 보류
  {
    const en = path.join(gens, "gen_helvetica_nohangul.pdf");
    if (!fs.existsSync(en)) f.push("생성기 영문 PDF 없음");
    else {
      const r = await runLabelCheck483(fs.readFileSync(en), { rinseOff: false, functional: false });
      if (!r.skipJudgment) f.push("en: skipJudgment 아님");
      if (r.notice !== NOTICE_NO_HANGUL_485) f.push("en: 한글 미검출 안내 불일치");
      if (r.findings.length !== 0) f.push(`en: findings ${r.findings.length}`);
    }
  }

  // Chromium/pdfkit 생성기
  for (const n of ["gen_chromium.pdf", "gen_pdfkit_malgun.pdf"]) {
    const p = path.join(gens, n);
    if (!fs.existsSync(p)) {
      f.push(`생성기 없음: ${n}`);
      continue;
    }
    const r = await runLabelCheck483(fs.readFileSync(p), { rinseOff: false, functional: false });
    if (!r.readable || r.skipJudgment) f.push(`${n}: 읽기/판정 실패`);
    if (!foundIncludes(r.findings, "LOT") && !r.findings.some((x) => x.label.includes("제조번호") && x.status === "pass")) {
      f.push(`${n}: 제조번호/LOT 미검출`);
    }
  }

  // 로그 무본문·파일명 / 경로·id 비노출
  {
    const route = fs.readFileSync(path.join(process.cwd(), "app/api/label-check/route.ts"), "utf8");
    if (/console\.(log|info|warn|error)\([^)]*file\.name/.test(route)) f.push("로그: 파일명 출력");
    if (/console\.(log|info|warn|error)\([^)]*buffer/.test(route)) f.push("로그: buffer/본문 출력");
    if (/console\.(log|info|warn|error)\([^)]*\.text/.test(route)) f.push("로그: text 본문 출력");
    if (!/파일명·본문/.test(route) && !/파일명/.test(route)) {
      // comment presence optional
    }
  }

  for (const p of ["app/label-check/page.tsx", "app/api/label-check/route.ts"]) {
    if (!fs.existsSync(path.join(process.cwd(), p))) f.push(`경로 없음: ${p}`);
  }

  // 인쇄 UI · 가로 넘침 가드
  {
    const page = fs.readFileSync(path.join(process.cwd(), "app/label-check/page.tsx"), "utf8");
    if (!/제품명/.test(page)) f.push("인쇄: 제품명 입력 없음");
    if (!/인쇄\/PDF로 저장|window\.print/.test(page)) f.push("인쇄: 인쇄 버튼 없음");
    if (!/@media print/.test(page)) f.push("인쇄: @media print 없음");
    if (!/DISCLAIMER_PRINT_485|참고용 사전 점검이며 법적 판단이 아닙니다/.test(page)) {
      f.push("인쇄: 하단 면책 없음");
    }
    if (/min-w-\[(?:[6-9]\d{2}|[1-9]\d{3,})px\]/.test(page)) f.push("label-check: 넓은 min-width로 가로 넘침 위험");
    if (!/max-w-3xl|max-w-full|w-full/.test(page)) f.push("label-check: 폭 제한 클래스 없음");
    if (!/break-words|overflow-x-auto|overflow-hidden/.test(page)) {
      f.push("label-check: 긴 텍스트 줄바꿈/넘침 가드 없음");
    }
  }

  // 486 — 소개 문구
  {
    const page = fs.readFileSync(path.join(process.cwd(), "app/label-check/page.tsx"), "utf8");
    if (!page.includes("INTRO_ONE_LINE_486") && !page.includes(INTRO_ONE_LINE_486)) {
      f.push("486: 한 줄 소개 없음");
    }
    for (const line of INTRO_LINES_486) {
      if (!page.includes("INTRO_LINES_486") && !page.includes(line)) f.push(`486: 안내 문구 누락 — ${line.slice(0, 12)}`);
    }
    if (!/샘플 결과 먼저 보기/.test(page)) f.push("486: 샘플 결과 버튼 없음");
    if (!page.includes("SAMPLE_BANNER_486") && !page.includes(SAMPLE_BANNER_486)) {
      f.push("486: 가상 브랜드 배너 없음");
    }
  }

  // 486 — 샘플 JSON 스키마·단정/id 0
  {
    const r = sampleResultA.result;
    if (!r || typeof r !== "object") f.push("486: sample result 없음");
    else {
      if (r.disclaimer !== DISCLAIMER_483) f.push("486: sample 면책 불일치");
      if (!r.summary || typeof r.summary.possible !== "number") f.push("486: sample summary 스키마");
      if (!Array.isArray(r.findings)) f.push("486: sample findings 배열 아님");
      const blob = JSON.stringify(sampleResultA);
      if (blob.includes("KR-LBL-") || /"id"\s*:\s*"KR-/.test(blob)) f.push("486: sample 내부 id 노출");
      if (r.findings.some((x: { status: string }) => x.status === "위반")) f.push("486: sample 단정 위반 status");
      if (sampleResultA.meta?.brand !== "가상 브랜드") f.push("486: sample 가상 브랜드 표기 없음");
    }
  }

  // 486 — 문의: env 없으면 영역 없음(소스에 자리표시자 mailto/예시 주소 금지)
  {
    const page = fs.readFileSync(path.join(process.cwd(), "app/label-check/page.tsx"), "utf8");
    if (/mailto:/.test(page)) f.push("486: mailto 의존");
    if (/example\.com|you@|contact@pagzly/i.test(page)) f.push("486: 문의 자리표시자 주소");
    if (!/labelContactEmail|lc-contact/.test(page)) f.push("486: 문의 조건부 훅 없음");
    // 테스트 런타임에 env가 비어 있으면 getter도 빈 문자열
    if (!process.env.NEXT_PUBLIC_LABEL_CONTACT_EMAIL && labelContactEmail() !== "") {
      f.push("486: env 없는데 contact 반환");
    }
  }

  // 486 — noindex · 사이트맵/내비 미추가
  {
    const layout = fs.readFileSync(path.join(process.cwd(), "app/label-check/layout.tsx"), "utf8");
    if (!/robots/.test(layout) || !/index:\s*false/.test(layout)) f.push("486: noindex 없음");
    for (const p of ["app/sitemap.ts", "app/sitemap.xml", "public/sitemap.xml"]) {
      const full = path.join(process.cwd(), p);
      if (fs.existsSync(full)) {
        const s = fs.readFileSync(full, "utf8");
        if (/label-check/.test(s)) f.push(`486: 사이트맵에 label-check — ${p}`);
      }
    }
  }

  return f;
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
