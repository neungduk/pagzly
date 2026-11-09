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
import { FOUND_CONFIRMED_488, FOUND_SNIPPET_MAX_488 } from "../../lib/label-check/format-found";
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

export const name = "표시사항 488 — 탭제목·찾은내용·파일럿·A/B/C";

/** 이전 차수와 동일한 판정 집계(표시만 바뀜) */
/** 492: 소용량 규칙을 skip_info로 교정 → pass 각 1건 감소 */
/** 493: A는 ad-phrases로 광고 확인 필요 항목이 세분되어 attention +2 */
const EXPECT_SUMMARY = {
  A: { possible: 3, attention: 7, unknown: 0, pass: 10 },
  B: { possible: 2, attention: 3, unknown: 0, pass: 15 },
  C: { possible: 0, attention: 4, unknown: 0, pass: 14 },
} as const;

function coreSnippet(found: string): string {
  return found.replace(/\s*—\s*주소 표기 확인 필요\s*$/, "");
}

function assertSummary(
  f: string[],
  tag: string,
  got: { possible: number; attention: number; unknown: number; pass: number },
  exp: { possible: number; attention: number; unknown: number; pass: number },
) {
  if (got.possible !== exp.possible || got.attention !== exp.attention || got.unknown !== exp.unknown || got.pass !== exp.pass) {
    f.push(`${tag}: summary ${JSON.stringify(got)} ≠ ${JSON.stringify(exp)}`);
  }
}

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
    assertSummary(f, "A", r.summary, EXPECT_SUMMARY.A);
  }

  // B
  {
    const buf = fs.readFileSync(path.join(samples, "sample_B_rovan_sun.pdf"));
    const r = await runLabelCheck483(buf, { rinseOff: false, functional: true });
    if (!anyStatus(r.findings, ["possible", "attention"], "제조번호")) f.push("B: 제조번호 누락 미검출");
    if (!anyStatus(r.findings, ["possible", "attention"], "기능성")) f.push("B: 기능성 표기 확인 필요 미검출");
    assertSummary(f, "B", r.summary, EXPECT_SUMMARY.B);
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
    assertSummary(f, "C", r.summary, EXPECT_SUMMARY.C);
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

  // 491 — 하단 약관 링크
  {
    const page = fs.readFileSync(path.join(process.cwd(), "app/label-check/page.tsx"), "utf8");
    if (!/href=\"\/privacy\"/.test(page) || !/href=\"\/terms\"/.test(page)) {
      f.push("491: label-check 하단 privacy/terms 링크 없음");
    }
  }

  // 488 — 탭 제목 · 찾은 내용 표시
  {
    const layout = fs.readFileSync(path.join(process.cwd(), "app/label-check/layout.tsx"), "utf8");
    if (!layout.includes("화장품 표시사항 PDF 검수 | Pagzly")) f.push("488: title 문자열 없음");
    if (!/noindex|index:\s*false/.test(layout)) f.push("488: noindex 유지 실패");

    const buf = fs.readFileSync(path.join(samples, "sample_A_moari_toner.pdf"));
    const r = await runLabelCheck483(buf, { rinseOff: false, functional: false });
    for (const row of r.findings) {
      if (row.status === "pass") {
        const ok =
          row.found === FOUND_CONFIRMED_488 ||
          row.found === "해당 주의 문구 키워드 없음" ||
          row.found.startsWith("감지된 크기") ||
          row.found.includes("알레르기 초안");
        if (!ok) f.push(`488: 통과 항목 조각 노출 — ${row.label}: ${row.found.slice(0, 40)}`);
        continue;
      }
      const core = coreSnippet(row.found);
      // 실제 부착(구분자·공백 없이 붙은 경우). ` · ` 제거 후 검사하면 인접 조각이 오탐됨
      if (/Toner피부|제거내용량/.test(core)) f.push(`488: 단어 중간/부착 — ${row.label}`);
      // 조각(… 포함)은 ≤60. 고정 안내 문구는 제외
      if (/…/.test(core) && [...core].length > FOUND_SNIPPET_MAX_488) {
        f.push(`488: 조각 길이 ${[...core].length} > ${FOUND_SNIPPET_MAX_488} — ${row.label}`);
      }
      // 단어 중간 시작: 생략 기호 직후 소문자 영문, 또는 생략 없이 소문자로 시작
      if (/…[a-z]/.test(core) || /^[a-z]/.test(core)) {
        f.push(`488: 단어 중간 시작 — ${row.label}: ${core.slice(0, 24)}`);
      }
    }

    for (const row of sampleResultA.result.findings) {
      if (row.status === "pass" && row.found !== FOUND_CONFIRMED_488 && row.found !== "해당 주의 문구 키워드 없음" && !String(row.found).startsWith("감지된")) {
        // 샘플 JSON도 동일 규칙
        if (!String(row.found).includes("알레르기 초안")) {
          f.push(`488: sample JSON 통과 조각 — ${row.label}`);
        }
      }
      const s = String(row.found);
      if (/Toner피부|제거내용량/.test(s) || /…[a-z]/.test(s)) {
        f.push(`488: sample JSON 부착 조각 — ${row.label}`);
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
