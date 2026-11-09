/**
 * 492 — 변이·표기 변형·글자크기·알레르기·판정 기준 회귀.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { loadLabelRules483 } from "../../lib/label-check/load-rules";
import {
  ingredientRegionSizes,
  runLabelCheck483,
  runLabelCheckText483,
} from "../../lib/label-check/run-check";
import { extractLabelPdf } from "../../lib/label-check/extract-pdf";
import {
  BASE_FIELDS_FOR_TEST,
  VARIANT_TEXTS,
  buildMutationCases,
  htmlFromFieldsForTest,
} from "../label-check-mutation-492";

export const name = "표시사항 492 — 변이·표기변형·전성분pt·알레르기";

const MUST = [
  "사용기한 또는 개봉 후 사용기간",
  "내용물의 용량 또는 중량",
  "제조번호",
  "영업자의 상호 및 주소",
  "제조에 사용된 성분(전성분)",
];

async function pdfHtml(html: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const buf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // 소용량 오분류 교정
  const socap = loadLabelRules483().find((r) => r.id === "KR-LBL-019");
  if (!socap || socap.mode !== "skip_info") f.push("492: KR-LBL-019가 skip_info 아님");

  // 표기 변형
  for (const v of VARIANT_TEXTS) {
    const r = await runLabelCheckText483(v.text, { rinseOff: true, functional: false });
    for (const lab of MUST) {
      const row = r.findings.find((x) => x.label === lab);
      if (row && row.status !== "pass") f.push(`492: 변형 ${v.id} — ${lab}=${row.status}`);
    }
  }

  // 텍스트 변이(용량 제거 등) — PDF와 동일 기대
  {
    const base = { ...BASE_FIELDS_FOR_TEST };
    const dropVol = { ...base, volume: "" };
    const text = Object.values(dropVol).filter(Boolean).join("\n");
    const r = await runLabelCheckText483(text, { rinseOff: true, functional: false });
    const vol = r.findings.find((x) => x.label.includes("용량"));
    if (!vol || (vol.status !== "possible" && vol.status !== "attention")) {
      f.push(`492: 용량 제거 미검출 (${vol?.status})`);
    }
    for (const lab of ["제조번호", "사용기한 또는 개봉 후 사용기간"]) {
      const row = r.findings.find((x) => x.label === lab);
      if (row?.status === "possible") f.push(`492: 용량 제거 시 ${lab} 오탐`);
    }
  }

  // 알레르기 경우
  {
    const head = `${BASE_FIELDS_FOR_TEST.name}\n${BASE_FIELDS_FOR_TEST.org}\n${BASE_FIELDS_FOR_TEST.addr}\n${BASE_FIELDS_FOR_TEST.volume}\n${BASE_FIELDS_FOR_TEST.expiry}\n${BASE_FIELDS_FOR_TEST.lot}\n`;
    const tail = `\n${BASE_FIELDS_FOR_TEST.caution}\n${BASE_FIELDS_FOR_TEST.price}`;
    const frag = await runLabelCheckText483(`${head}전성분: 정제수, 향료${tail}`, {
      rinseOff: true,
      functional: false,
    });
    const ff = frag.findings.find((x) => x.label.includes("알레르기"));
    if (!ff || ff.status !== "attention" || !/향료/.test(ff.found)) {
      f.push("492: 향료만 알레르기 문구 불일치");
    }
  }

  // 글자 거의 없음
  {
    const r = await runLabelCheckText483("..", { rinseOff: false, functional: false });
    if (!r.skipJudgment || r.summary.possible > 0) {
      f.push("492: 극소 본문에서 위반 가능 폭탄");
    }
  }

  // PDF: 전성분 pt 경계 + 2단 배치 (Playwright)
  try {
    const html49 = htmlFromFieldsForTest(BASE_FIELDS_FOR_TEST, { ingredientPt: 4.9 });
    const html50 = htmlFromFieldsForTest(BASE_FIELDS_FOR_TEST, { ingredientPt: 5.0 });
    const htmlLay = htmlFromFieldsForTest(BASE_FIELDS_FOR_TEST, { twoCol: true, shuffle: true });
    const [b49, b50, blay] = await Promise.all([pdfHtml(html49), pdfHtml(html50), pdfHtml(htmlLay)]);

    const r49 = await runLabelCheck483(b49, { rinseOff: true, functional: false });
    const st49 = r49.findings.find((x) => x.label === "전성분 표시 방법")?.status;
    if (st49 !== "possible" && st49 !== "unknown") f.push(`492: 4.9pt 기대 possible/unknown → ${st49}`);

    const r50 = await runLabelCheck483(b50, { rinseOff: true, functional: false });
    const st50 = r50.findings.find((x) => x.label === "전성분 표시 방법")?.status;
    if (st50 !== "pass" && st50 !== "unknown") f.push(`492: 5.0pt 기대 pass/unknown → ${st50}`);

    const ex50 = await extractLabelPdf(b50);
    const reg = ingredientRegionSizes(ex50);
    if (!reg) f.push("492: 5.0pt PDF에서 전성분 영역 식별 실패");

    const rLay = await runLabelCheck483(blay, { rinseOff: true, functional: false });
    for (const lab of MUST) {
      const row = rLay.findings.find((x) => x.label === lab);
      if (row && row.status !== "pass") f.push(`492: 2단배치 ${lab}=${row.status}`);
    }

    // 변이 케이스 메타(기대 라벨 정의) 존재
    if (buildMutationCases().length < 8) f.push("492: 변이 케이스 부족");
  } catch (e) {
    f.push(`492: Playwright PDF 실패 — ${String(e).slice(0, 120)}`);
  }

  // notes 산출물
  if (!fs.existsSync(path.join("review", "492-notes.md"))) f.push("492: 492-notes.md 없음");
  if (!fs.existsSync(path.join("review", "492-coverage.md"))) f.push("492: 492-coverage.md 없음");

  return f;
}
