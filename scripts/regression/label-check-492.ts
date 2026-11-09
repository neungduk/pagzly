/**
 * 492 — 변이·표기 변형·글자크기·알레르기·판정 기준 회귀.
 * 503: playwright 제거. PDF는 review/data/samples/** 만 읽음.
 */
import fs from "node:fs";
import path from "node:path";
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
} from "../label-check-mutation-492";

export const name = "표시사항 492 — 변이·표기변형·전성분pt·알레르기";

const MUST = [
  "사용기한 또는 개봉 후 사용기간",
  "내용물의 용량 또는 중량",
  "제조번호",
  "영업자의 상호 및 주소",
  "제조에 사용된 성분(전성분)",
];

const FIX = path.join("review", "data", "samples", "regression-503");
const MUT = path.join("review", "data", "samples", "mutation-492");

function resolvePdf(...candidates: string[]): string | null {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  const socap = loadLabelRules483().find((r) => r.id === "KR-LBL-019");
  if (!socap || socap.mode !== "skip_info") f.push("492: KR-LBL-019가 skip_info 아님");

  for (const v of VARIANT_TEXTS) {
    const r = await runLabelCheckText483(v.text, { rinseOff: true, functional: false });
    for (const lab of MUST) {
      const row = r.findings.find((x) => x.label === lab);
      if (row && row.status !== "pass") f.push(`492: 변형 ${v.id} — ${lab}=${row.status}`);
    }
  }

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

  {
    const r = await runLabelCheckText483("..", { rinseOff: false, functional: false });
    if (!r.skipJudgment || r.summary.possible > 0) {
      f.push("492: 극소 본문에서 위반 가능 폭탄");
    }
  }

  // PDF: 전성분 pt 경계 + 2단 배치 (커밋된 픽스처만)
  {
    const p49 = resolvePdf(path.join(FIX, "font-4_9.pdf"), path.join(MUT, "font-4.9.pdf"), path.join(MUT, "font-4_9.pdf"));
    const p50 = resolvePdf(path.join(FIX, "font-5.pdf"), path.join(MUT, "font-5.pdf"));
    const play = resolvePdf(path.join(FIX, "layout-twocol.pdf"), path.join(MUT, "layout-twocol.pdf"));
    if (!p49 || !p50 || !play) {
      f.push("492: regression-503/mutation-492 PDF 픽스처 부족 (label-check-make-fixtures-492 실행)");
    } else {
      const b49 = fs.readFileSync(p49);
      const b50 = fs.readFileSync(p50);
      const blay = fs.readFileSync(play);

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
    }

    if (buildMutationCases().length < 8) f.push("492: 변이 케이스 부족");
  }

  if (!fs.existsSync(path.join("review", "492-notes.md"))) f.push("492: 492-notes.md 없음");
  if (!fs.existsSync(path.join("review", "492-coverage.md"))) f.push("492: 492-coverage.md 없음");

  return f;
}
