/**
 * 497 — 미국 실 PDF 4종 + 이미지 안내 + US 오탐 가드.
 */
import fs from "node:fs";
import path from "node:path";
import { runLabelCheck483, runLabelCheckUsText494 } from "../../lib/label-check/run-check";
import { includesUsWord } from "../../lib/label-check/normalize-us";
import { NOTICE_IMAGE_PDF_497, NOTICE_US_NON_ENGLISH_497 } from "../../lib/label-check/types";

export const name = "표시사항 497 — US PDF·이미지안내·오탐";

const DIR = path.join("review", "data", "samples", "us-497");

export async function run(): Promise<string[]> {
  const f: string[] = [];

  for (const name of ["us1_ok.pdf", "us2_missing.pdf", "us3_korean_only.pdf", "us4_image_only.pdf"]) {
    if (!fs.existsSync(path.join(DIR, name))) f.push(`497: 시안 없음 ${name}`);
  }
  if (f.length) return f;

  // us1
  {
    const r = await runLabelCheck483(fs.readFileSync(path.join(DIR, "us1_ok.pdf")), {
      rinseOff: false,
      functional: false,
      market: "US",
      imported: true,
    });
    if (r.skipJudgment) f.push("497: us1 skipJudgment");
    if (r.summary.possible !== 0) f.push(`497: us1 possible=${r.summary.possible}`);
    const drug = r.findings.find((x) => x.label.includes("의약품") || x.label.includes("불실"));
    if (drug && drug.status === "attention") f.push("497: us1 US-013 오탐");
    const allergen = r.findings.find((x) => x.label.includes("향료") || x.label.includes("알레르기"));
    if (allergen && allergen.status !== "pass" && allergen.checkType === "code") {
      f.push("497: us1 US-012 확정 오탐");
    }
    const origin = r.findings.find((x) => x.label.includes("원산지"));
    if (!origin || origin.status !== "pass") f.push(`497: us1 원산지=${origin?.status}`);
  }

  // us2
  {
    const r = await runLabelCheck483(fs.readFileSync(path.join(DIR, "us2_missing.pdf")), {
      rinseOff: false,
      functional: false,
      market: "US",
    });
    for (const lab of ["내용량", "Ingredients", "성분", "제조·판매자"]) {
      const row = r.findings.find((x) => x.label.includes(lab.replace("Ingredients", "성분")) || x.label.includes(lab));
      // 내용량 / 성분 / 상호
    }
    const net = r.findings.find((x) => x.label.includes("내용량"));
    const ing = r.findings.find((x) => x.label.includes("성분"));
    const biz = r.findings.find((x) => x.label.includes("제조·판매자"));
    const drug = r.findings.find((x) => x.label.includes("불실") || x.label.includes("의약품"));
    if (net?.status !== "possible") f.push(`497: us2 내용량=${net?.status}`);
    if (ing?.status !== "possible") f.push(`497: us2 성분=${ing?.status}`);
    if (biz?.status !== "possible") f.push(`497: us2 상호=${biz?.status}`);
    if (drug?.status !== "attention") f.push(`497: us2 US-013=${drug?.status}`);
  }

  // us3 — 영어 아님 안내 + possible 연쇄 금지
  {
    const r = await runLabelCheck483(fs.readFileSync(path.join(DIR, "us3_korean_only.pdf")), {
      rinseOff: false,
      functional: false,
      market: "US",
    });
    if (!r.notice?.includes(NOTICE_US_NON_ENGLISH_497.slice(0, 12))) {
      f.push(`497: us3 notice 없음 — ${(r.notice || "").slice(0, 40)}`);
    }
    if (r.summary.possible > 1) f.push(`497: us3 possible 연쇄 ${r.summary.possible}`);
    const eng = r.findings.find((x) => x.label.includes("영어"));
    if (!eng || (eng.status !== "possible" && eng.status !== "attention")) {
      f.push(`497: us3 US-007=${eng?.status}`);
    }
  }

  // us4 US + KR
  {
    const buf = fs.readFileSync(path.join(DIR, "us4_image_only.pdf"));
    const us = await runLabelCheck483(buf, { rinseOff: false, functional: false, market: "US" });
    const kr = await runLabelCheck483(buf, { rinseOff: true, functional: false, market: "KR" });
    for (const [tag, r] of [
      ["us4-US", us],
      ["us4-KR", kr],
    ] as const) {
      if (!r.skipJudgment || r.readable !== false) f.push(`497: ${tag} readable/skip`);
      if (!r.notice?.includes("이미지로 들어 있어")) f.push(`497: ${tag} 안내 문구 — ${(r.notice || "").slice(0, 50)}`);
      if (!r.notice?.startsWith(NOTICE_IMAGE_PDF_497.slice(0, 20))) {
        /* soft */
      }
    }
  }

  // 오탐 단위: Treatment / cream
  {
    if (includesUsWord("anti-aging treatment cream", "treat")) {
      f.push("497: Treatment에 treat 오탐");
    }
    if (!includesUsWord("Cures acne", "cure")) f.push("497: Cures에 cure 미검출");
    const soft = await runLabelCheckUsText494(
      "Moisturizing cream gel lotion\nNET 1 oz\nDistributed by A Inc., 1 Main St, CA 90001\nIngredients: Aqua, Glycerin\ncare@x.com",
      { rinseOff: false, functional: false, market: "US" },
    );
    const drug = soft.findings.find((x) => x.label.includes("불실") || x.label.includes("의약품"));
    if (drug && drug.status === "attention") f.push("497: cream/gel이 의약품 주장으로 오탐");
  }

  return f;
}
