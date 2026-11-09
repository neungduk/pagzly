/**
 * 493 — 광고 표현 스캔·독립 시안·광고 변이 회귀.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { runLabelCheck483, runLabelCheckText483 } from "../../lib/label-check/run-check";
import {
  BASE_FIELDS_FOR_TEST,
  buildMutationCases,
  htmlFromFieldsForTest,
} from "../label-check-mutation-492";

export const name = "표시사항 493 — 광고표현·독립시안·변이";

const AD_CATS = new Set(["의약품 오인", "기능성 오인", "소비자 오인", "실증 필요"]);
const IND = path.join("review", "data", "samples", "independent-492");

function adFindings(r: Awaited<ReturnType<typeof runLabelCheck483>>) {
  return r.findings.filter((f) => AD_CATS.has(f.category) && f.status === "attention");
}

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

  // 독립 시안 기대표
  const table: Array<{
    file: string;
    functional?: boolean;
    check: (r: Awaited<ReturnType<typeof runLabelCheck483>>) => string | null;
  }> = [
    {
      file: "i1_ok_twocol.pdf",
      check: (r) => {
        if (r.summary.possible !== 0) return `possible=${r.summary.possible}`;
        if (adFindings(r).length !== 0) return `광고 att=${adFindings(r).map((a) => a.label).join(",")}`;
        return null;
      },
    },
    {
      file: "i2_no_ingredients.pdf",
      check: (r) => {
        const ing = r.findings.find((x) => x.label.includes("전성분") && !x.label.includes("표시 방법"));
        if (!ing || ing.status !== "possible") return `전성분=${ing?.status}`;
        return null;
      },
    },
    {
      file: "i3_ads.pdf",
      check: (r) => {
        const ads = adFindings(r);
        const hasMed = ads.some((a) => a.category === "의약품 오인");
        const hasFun = ads.some((a) => a.category === "기능성 오인");
        if (!hasMed || !hasFun) {
          return `의약품/기능성 누락: ${ads.map((a) => a.label).join(";")}`;
        }
        return null;
      },
    },
    {
      file: "i4_inci_allergen.pdf",
      check: (r) => {
        const al = r.findings.find((x) => x.label.includes("알레르기"));
        if (!al || al.status !== "attention") return `알레르기=${al?.status}`;
        if (adFindings(r).length) return `광고 오탐 ${adFindings(r).map((a) => a.label).join(",")}`;
        return null;
      },
    },
    {
      file: "i5_functional.pdf",
      functional: true,
      check: (r) => {
        if (r.summary.possible !== 0) return `possible=${r.summary.possible}`;
        if (adFindings(r).length) return `광고 ${adFindings(r).map((a) => a.label).join(",")}`;
        return null;
      },
    },
    {
      file: "i6_no_expiry_lot.pdf",
      check: (r) => {
        const lot = r.findings.find((x) => x.label === "제조번호");
        const exp = r.findings.find((x) => x.label.includes("사용기한"));
        if (lot?.status !== "possible") return `제조번호=${lot?.status}`;
        if (exp?.status !== "possible") return `사용기한=${exp?.status}`;
        return null;
      },
    },
  ];

  for (const row of table) {
    const p = path.join(IND, row.file);
    if (!fs.existsSync(p)) {
      f.push(`493: 시안 없음 ${row.file}`);
      continue;
    }
    const r = await runLabelCheck483(fs.readFileSync(p), {
      rinseOff: true,
      functional: row.functional ?? false,
    });
    const err = row.check(r);
    if (err) f.push(`493: ${row.file} — ${err}`);
  }

  // 오탐: 전성분 알부틴·천연 / 주의사항 전문의 / 재생지 / 100% / 보다
  {
    const base = BASE_FIELDS_FOR_TEST;
    const texts = [
      `${base.name}\n${base.org}\n${base.addr}\n${base.volume}\n${base.expiry}\n${base.lot}\n전성분: 정제수, 알부틴, 천연보습인자\n${base.caution}\n${base.price}`,
      `${Object.values(base).join("\n")}\n사용할 때의 주의사항: 이상 시 전문의 등과 상담할 것`,
      `${Object.values(base).join("\n")}\n포장재: 재생지 사용`,
      `${base.name}\n${base.org}\n${base.addr}\n${base.volume}\n${base.expiry}\n${base.lot}\n전성분: 정제수 100%, 글리세린\n${base.caution}`,
      `${Object.values(base).join("\n")}\n보다 촉촉한 사용감`,
    ];
    for (let i = 0; i < texts.length; i++) {
      const r = await runLabelCheckText483(texts[i], { rinseOff: true, functional: false });
      const ads = adFindings(r);
      if (ads.length) f.push(`493: 오탐#${i} ${ads.map((a) => a.label).join(",")}`);
    }
  }

  // sample C 광고 0
  {
    const c = path.join("review", "data", "samples", "sample_C_salt_bodywash.pdf");
    if (fs.existsSync(c)) {
      const r = await runLabelCheck483(fs.readFileSync(c), { rinseOff: true, functional: false });
      const ads = adFindings(r);
      if (ads.length) f.push(`493: sample C 광고 오탐 ${ads.map((a) => a.label).join(",")}`);
    } else {
      f.push("493: sample_C 없음");
    }
  }

  // 광고 변이: 해당 항목만 추가
  const adCases = buildMutationCases().filter((c) => c.id.startsWith("ad-") || c.id === "inject-forbidden");
  if (adCases.length < 6) f.push(`493: 광고 변이 부족 (${adCases.length})`);

  try {
    for (const c of adCases) {
      const html = htmlFromFieldsForTest(c.fields);
      const buf = await pdfHtml(html);
      const r = await runLabelCheck483(buf, {
        rinseOff: true,
        functional: c.input?.functional ?? false,
      });
      const ads = adFindings(r);
      const hit = ads.find((a) => a.label === c.expectFailLabel);
      if (!hit) f.push(`493: 변이 ${c.id} 미검출 (기대 ${c.expectFailLabel})`);
      const extra = ads.filter((a) => a.label !== c.expectFailLabel);
      if (extra.length) {
        f.push(`493: 변이 ${c.id} 여분 ${extra.map((a) => a.label).join(";")}`);
      }
    }

    // 정상 base PDF — 광고 0
    const baseBuf = await pdfHtml(htmlFromFieldsForTest(BASE_FIELDS_FOR_TEST));
    const baseR = await runLabelCheck483(baseBuf, { rinseOff: true, functional: false });
    if (adFindings(baseR).length) {
      f.push(`493: base PDF 광고 오탐 ${adFindings(baseR).map((a) => a.label).join(",")}`);
    }
  } catch (e) {
    f.push(`493: Playwright 실패 — ${String(e).slice(0, 120)}`);
  }

  // KR-ADV id 화면 비노출: findings label에 KR-ADV / AD- 없음
  {
    const r = await runLabelCheckText483(
      `${BASE_FIELDS_FOR_TEST.name} 피부 재생 아토피\n${BASE_FIELDS_FOR_TEST.org}\n${BASE_FIELDS_FOR_TEST.addr}`,
      { rinseOff: true, functional: false },
    );
    for (const row of r.findings) {
      if (/KR-ADV-|AD-[A-Z]+-\d+/.test(row.label) || /KR-ADV-|AD-[A-Z]+-\d+/.test(row.found)) {
        f.push(`493: id 노출 ${row.label}`);
      }
    }
  }

  return f;
}
