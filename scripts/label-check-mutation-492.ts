/**
 * 492 — 변이(결함 주입)·표기 변형 PDF 하네스 (Playwright page.pdf, 한글 폰트).
 * 유료 호출 없음. 결과는 review/492-notes.md 표에 반영·회귀 label-check-492에서 재사용.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { runLabelCheck483, runLabelCheckText483 } from "../lib/label-check/run-check";
import type { CheckStatus, LabelCheckResult } from "../lib/label-check/types";

const OUT = path.join("review", "data", "samples", "mutation-492");
fs.mkdirSync(OUT, { recursive: true });

export type FieldKey =
  | "name"
  | "org"
  | "addr"
  | "volume"
  | "expiry"
  | "lot"
  | "ingredients"
  | "caution"
  | "price"
  | "barcode"
  | "country";

export const BASE_FIELDS_FOR_TEST: Record<FieldKey, string> = {

  name: "솔트 바디워시 CLEANSING WASH",
  org: "화장품책임판매업자: (주)테스트코스메틱",
  addr: "서울특별시 강남구 테헤란로 123",
  volume: "내용량: 250mL",
  expiry: "사용기한: 2028.10.31까지",
  lot: "제조번호: LOT-C492",
  ingredients: "전성분: 정제수, 글리세린, 향료, 리모넨, Limonene",
  caution: "사용할 때의 주의사항: 눈에 들어가지 않도록 주의하십시오",
  price: "가격: 15,000원",
  barcode: "바코드: 8801234567890",
  country: "제조국: 대한민국",
};

const LABEL_FOR_FIELD: Partial<Record<FieldKey, string>> = {
  name: "화장품의 명칭",
  org: "영업자의 상호 및 주소",
  addr: "영업자의 상호 및 주소",
  volume: "내용물의 용량 또는 중량",
  expiry: "사용기한 또는 개봉 후 사용기간",
  lot: "제조번호",
  ingredients: "제조에 사용된 성분(전성분)",
  caution: "사용할 때의 주의사항",
};

export function htmlFromFieldsForTest(
  fields: Partial<Record<FieldKey, string>>,
  opts?: { twoCol?: boolean; shuffle?: boolean; ingredientPt?: number },
): string {
  const rows: Array<{ k: FieldKey; v: string }> = [];
  for (const k of Object.keys(BASE_FIELDS_FOR_TEST) as FieldKey[]) {
    if (fields[k] != null && fields[k] !== "") rows.push({ k, v: fields[k]! });
  }
  if (opts?.shuffle) {
    rows.reverse();
    const mid = Math.floor(rows.length / 2);
    rows.push(...rows.splice(0, mid));
  }
  const ingPt = opts?.ingredientPt ?? 11;
  const block = (r: { k: FieldKey; v: string }) => {
    const style =
      r.k === "ingredients"
        ? `font-size:${ingPt}pt;line-height:1.35;`
        : "font-size:11pt;line-height:1.35;";
    // 줄바꿈으로 라벨·값 분리 변형
    const html = r.v.includes(":")
      ? r.v.replace(":", ":<br/>")
      : r.v;
    return `<div class="row" style="${style}">${html}</div>`;
  };
  const body = opts?.twoCol
    ? `<div style="display:flex;gap:24px;">
        <div style="flex:1">${rows.filter((_, i) => i % 2 === 0).map(block).join("")}</div>
        <div style="flex:1">${rows.filter((_, i) => i % 2 === 1).map(block).join("")}</div>
      </div>`
    : rows.map(block).join("");

  return `<!doctype html><html><head><meta charset="utf-8">
  <style>
    body{font-family:"Malgun Gothic","Noto Sans KR",sans-serif;color:#111;padding:28px;}
    .row{margin:0 0 8px;}
  </style></head><body>${body}</body></html>`;
}

async function pdfFromHtml(html: string, outFile: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: outFile, format: "A4", printBackground: true });
    return fs.readFileSync(outFile);
  } finally {
    await browser.close();
  }
}

function statusOf(r: LabelCheckResult, label: string): CheckStatus | "missing" {
  const f = r.findings.find((x) => x.label === label);
  return f ? f.status : "missing";
}

function isFailStatus(s: CheckStatus | "missing"): boolean {
  return s === "possible" || s === "attention" || s === "unknown";
}

export type MutationCase = {
  id: string;
  desc: string;
  fields: Partial<Record<FieldKey, string>>;
  input?: { rinseOff?: boolean; functional?: boolean };
  expectFailLabel: string;
  ingredientPt?: number;
  extraLine?: string;
};

const BASE = BASE_FIELDS_FOR_TEST;

export function buildMutationCases(): MutationCase[] {
  const all = { ...BASE };
  const cases: MutationCase[] = [
    {
      id: "base",
      desc: "정상 기준",
      fields: all,
      expectFailLabel: "",
    },
    // 명칭 전용 검출은 문서 전체 한글 유무라 상호 한글이 있으면 제거해도 통과 → coverage 한계(notes)
    {
      id: "drop-org-addr",
      desc: "상호·주소 제거",
      fields: { ...all, org: "", addr: "" },
      expectFailLabel: "영업자의 상호 및 주소",
    },
    {
      id: "drop-volume",
      desc: "용량 제거",
      fields: { ...all, volume: "" },
      expectFailLabel: "내용물의 용량 또는 중량",
    },
    {
      id: "drop-expiry",
      desc: "사용기한 제거",
      fields: { ...all, expiry: "" },
      expectFailLabel: "사용기한 또는 개봉 후 사용기간",
    },
    {
      id: "drop-lot",
      desc: "제조번호 제거",
      fields: { ...all, lot: "" },
      expectFailLabel: "제조번호",
    },
    {
      id: "drop-country-with-import",
      desc: "수입 단서만 남기고 제조국 제거",
      fields: { ...all, country: "수입화장품" },
      expectFailLabel: "수입화장품의 제조국·제조회사명·소재지",
    },
    {
      id: "drop-ingredients",
      desc: "전성분 제거",
      fields: { ...all, ingredients: "" },
      expectFailLabel: "제조에 사용된 성분(전성분)",
    },
    {
      id: "drop-allergen",
      desc: "알레르기(리모넨) 제거·향료만",
      fields: { ...all, ingredients: "전성분: 정제수, 글리세린, 향료" },
      expectFailLabel: "알레르기 유발성분 25종 표시",
    },
    {
      id: "allergen-4pt",
      desc: "전성분 4pt",
      fields: all,
      expectFailLabel: "전성분 표시 방법",
      ingredientPt: 4,
    },
    {
      id: "drop-caution",
      desc: "주의사항 제거",
      fields: { ...all, caution: "" },
      expectFailLabel: "사용할 때의 주의사항",
    },
    {
      id: "func-no-mark",
      desc: "기능성 체크·표기 없음",
      fields: all,
      input: { functional: true },
      expectFailLabel: "기능성화장품 도안 또는 '기능성화장품' 표시",
    },
    {
      id: "inject-forbidden",
      desc: "금지 키워드(피부 재생) 주입",
      fields: { ...all, name: "솔트 바디워시 피부 재생" },
      expectFailLabel: "의약품 효능·효과 표방(약리·신체 변화)",
    },
    // 493 — 광고 표현 변이(항목 제목 = ad-phrases title)
    {
      id: "ad-whitening",
      desc: "미백 주입",
      fields: { ...all, name: "솔트 바디워시 미백" },
      expectFailLabel: "미백 표현(기능성 심사·보고 제품만)",
    },
    {
      id: "ad-wrinkle",
      desc: "주름개선 주입",
      fields: { ...all, name: "솔트 바디워시 주름개선" },
      expectFailLabel: "주름 개선 표현(기능성 제품만)",
    },
    {
      id: "ad-hospital",
      desc: "병원용 주입",
      fields: { ...all, name: "솔트 바디워시 병원용" },
      expectFailLabel: "의료인·의료기관 추천·보증",
    },
    {
      id: "ad-stem",
      desc: "줄기세포·엑소좀 주입",
      fields: { ...all, name: "솔트 바디워시 줄기세포 엑소좀" },
      expectFailLabel: "인체 유래·줄기세포·엑소좀",
    },
    {
      id: "ad-age",
      desc: "피부나이 주입",
      fields: { ...all, name: "솔트 바디워시 피부나이 5세" },
      expectFailLabel: "피부 나이 표현",
    },
    {
      id: "ad-super",
      desc: "최고·즉시 주입",
      fields: { ...all, name: "솔트 바디워시 최고 즉시" },
      expectFailLabel: "절대적·즉각적·최상급 표현",
    },
    {
      id: "ad-pct",
      desc: "30% 개선 주입",
      fields: { ...all, name: "솔트 바디워시 30% 개선" },
      expectFailLabel: "수치·기간·비교 표현",
    },
  ];
  return cases;
}

/** 표기 변형(정상 의미) — 텍스트 경로 + PDF */
export const VARIANT_TEXTS: Array<{ id: string; text: string; note?: string }> = [
  // 사용기한 5+
  {
    id: "exp-dot",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n사용기한: 2028.10.31까지\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "exp-dash",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n사용기한 2028-10-31\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "exp-exp",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\nEXP. 2028.10\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "exp-from-mfg",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n제조일로부터 36개월\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "exp-pao",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n개봉 후 12개월(12M)\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  // 용량 5+
  {
    id: "vol-ml",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n내용량: 150mL\n${BASE.expiry}\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "vol-space",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n내용량: 150 ml\n${BASE.expiry}\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "vol-hangul-ml",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n내용량: 150㎖\n${BASE.expiry}\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "vol-g",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n내용량: 100g\n${BASE.expiry}\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "vol-floz",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n내용량: 50 mL (1.69 fl. oz.)\n${BASE.expiry}\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  // 제조번호
  {
    id: "lot-std",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n${BASE.expiry}\n제조번호: LOT123\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "lot-lotno",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n${BASE.expiry}\nLot.No 123\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "lot-ln",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n${BASE.expiry}\nL/N: A123\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "lot-colon",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n${BASE.expiry}\nLOT: 2411A\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "lot-batch",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n${BASE.expiry}\nBatch 7788\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  // 영업자
  {
    id: "org-full",
    text: `${BASE.name}\n화장품책임판매업자: (주)테스트코스메틱 서울특별시 마포구 월드컵북로 10\n${BASE.volume}\n${BASE.expiry}\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "org-slash",
    text: `${BASE.name}\n책임판매업자 테스트코스메틱 / 주소 서울특별시 종로구 종로 1\n${BASE.volume}\n${BASE.expiry}\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "org-mfr",
    text: `${BASE.name}\n제조업자: (주)테스트코스메틱\n부산광역시 해운대구 센텀중앙로 1\n${BASE.volume}\n${BASE.expiry}\n${BASE.lot}\n${BASE.ingredients}\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  // 전성분 — Ingredients는 규칙 근거 부족 → 별도 확인 필요 케이스
  {
    id: "ing-jeon",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n${BASE.expiry}\n${BASE.lot}\n전성분: 정제수, 글리세린, 향료\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
  {
    id: "ing-break",
    text: `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n${BASE.expiry}\n${BASE.lot}\n전성분:\n정제수, 글리세린, 향료\n${BASE.caution}\n${BASE.price}\n${BASE.barcode}`,
  },
];

/** Ingredients만 — 규칙 근거 없어 자동 통과를 기대하지 않음 */
export const INGREDIENTS_EN_NOTE =
  "Ingredients 단독 표기는 규칙표에 '전성분' 근거만 있어 자동 통과 대상이 아님(확인 필요).";

async function main() {
  const mutations = buildMutationCases();
  const rows: string[] = [];
  rows.push("# 492차 변이·변형 시험 노트");
  rows.push("");
  rows.push("## 판정 기준 (위반 가능 vs 확인 불가)");
  rows.push("| 상태 | 기준 |");
  rows.push("|------|------|");
  rows.push("| 위반 가능(possible) | 필수 표시로 보이는 항목이 **텍스트에 없는 것으로 판단**될 때(severity_if_missing=위반) |");
  rows.push("| 확인 필요(attention) | 단서·금지 문구·알레르기 등 **추가 확인**이 필요할 때 |");
  rows.push("| 확인 불가(unknown) | 글자/영역(전성분 pt)을 **읽거나 구분할 수 없을** 때 — 통과로 보지 않음 |");
  rows.push("| skipJudgment | 한글·본문이 거의 없음 → 위반 가능 폭탄 금지, 안내만 |");
  rows.push("");
  rows.push(INGREDIENTS_EN_NOTE);
  rows.push("");
  rows.push("## 변이 시험 (PDF)");
  rows.push("| 변이 | 기대 | 실제(대상) | 기타 오탐 | 결과 |");
  rows.push("|------|------|------------|-----------|------|");

  let mutFail = 0;
  let mutFalsePos = 0;

  for (const c of mutations) {
    const html = htmlFromFieldsForTest(c.fields, { ingredientPt: c.ingredientPt });
    const out = path.join(OUT, `${c.id}.pdf`);
    let r: LabelCheckResult;
    try {
      const buf = await pdfFromHtml(html, out);
      r = await runLabelCheck483(buf, {
        rinseOff: c.input?.rinseOff ?? true,
        functional: c.input?.functional ?? false,
      });
    } catch (e) {
      rows.push(`| ${c.id} | ${c.expectFailLabel || "—"} | ERROR | — | FAIL ${String(e).slice(0, 80)} |`);
      mutFail += 1;
      continue;
    }

    if (c.id === "base") {
      const bad = r.findings.filter((f) => f.status === "possible");
      const ok = bad.length === 0;
      rows.push(
        `| ${c.id} | possible=0 | possible=${r.summary.possible} | — | ${ok ? "PASS" : "FAIL"} |`,
      );
      if (!ok) mutFail += 1;
      continue;
    }

    if (c.id === "drop-allergen") {
      // 향료만 → attention(확인 필요) 기대
      const st = statusOf(r, c.expectFailLabel);
      const ok = st === "attention" || st === "pass"; // 향료만이면 attention, 알레르기 없으면 pass도 가능
      // 스펙: 향료만 있고 알레르기 없으면 attention 문구
      const f = r.findings.find((x) => x.label === c.expectFailLabel);
      const ok2 = f && f.status === "attention" && /향료/.test(f.found);
      rows.push(`| ${c.id} | attention(향료) | ${st}: ${(f?.found || "").slice(0, 40)} | — | ${ok2 ? "PASS" : "FAIL"} |`);
      if (!ok2) mutFail += 1;
      continue;
    }

    if (c.id === "allergen-4pt") {
      const st = statusOf(r, c.expectFailLabel);
      const ok = st === "possible" || st === "unknown";
      rows.push(`| ${c.id} | possible/unknown | ${st} | — | ${ok ? "PASS" : "FAIL"} |`);
      if (!ok) mutFail += 1;
      continue;
    }

    const st = statusOf(r, c.expectFailLabel);
    const caught = isFailStatus(st);
    // 오탐: 기대 라벨이 아닌 필수 presence가 base 대비 새로 possible
    const falsePos = r.findings.filter(
      (f) =>
        f.status === "possible" &&
        f.label !== c.expectFailLabel &&
        LABEL_FOR_FIELD &&
        Object.values(LABEL_FOR_FIELD).includes(f.label) &&
        f.label !== c.expectFailLabel,
    );
    // 더 엄격: base에서 pass였던 핵심 라벨이 possible로 번지면 오탐
    const coreLabels = [
      "내용물의 용량 또는 중량",
      "제조번호",
      "사용기한 또는 개봉 후 사용기간",
      "제조에 사용된 성분(전성분)",
      "영업자의 상호 및 주소",
    ].filter((l) => l !== c.expectFailLabel);
    const spill = r.findings.filter((f) => coreLabels.includes(f.label) && f.status === "possible");
    const ok = caught && spill.length === 0;
    if (!caught) mutFail += 1;
    if (spill.length) mutFalsePos += 1;
    rows.push(
      `| ${c.id} | fail(${c.expectFailLabel}) | ${st} | spill=${spill.map((s) => s.label).join(";") || "0"} | ${ok ? "PASS" : "FAIL"} |`,
    );
  }

  rows.push("");
  rows.push(`변이 요약: 실패(누락) ${mutFail}, 오탐(번짐) ${mutFalsePos}`);
  rows.push("");
  rows.push("## 표기 변형 시험 (텍스트)");
  rows.push("| id | 핵심 통과 | 결과 |");
  rows.push("|----|-----------|------|");

  const mustPass = [
    "사용기한 또는 개봉 후 사용기간",
    "내용물의 용량 또는 중량",
    "제조번호",
    "영업자의 상호 및 주소",
    "제조에 사용된 성분(전성분)",
  ];
  let varPass = 0;
  let varTotal = 0;
  for (const v of VARIANT_TEXTS) {
    varTotal += 1;
    const r = await runLabelCheckText483(v.text, { rinseOff: true, functional: false });
    const fails = mustPass.filter((lab) => {
      const s = statusOf(r, lab);
      return s !== "pass" && s !== "missing";
    });
    // missing skip_info ok
    const ok = fails.length === 0;
    if (ok) varPass += 1;
    rows.push(`| ${v.id} | ${ok ? "ok" : fails.join(",")} | ${ok ? "PASS" : "FAIL"} |`);
  }
  rows.push("");
  rows.push(`변형 통과율: ${varPass}/${varTotal}`);
  rows.push("");
  rows.push("## 배치 변형 (PDF 2단·셔플)");
  {
    const html = htmlFromFieldsForTest(BASE, { twoCol: true, shuffle: true });
    const buf = await pdfFromHtml(html, path.join(OUT, "layout-twocol.pdf"));
    const r = await runLabelCheck483(buf, { rinseOff: true, functional: false });
    const fails = mustPass.filter((lab) => statusOf(r, lab) !== "pass");
    rows.push(`| layout-twocol | ${fails.length ? fails.join(",") : "ok"} | ${fails.length ? "FAIL" : "PASS"} |`);
  }

  rows.push("");
  rows.push("## 글자 크기 경계 (PDF)");
  for (const pt of [4.9, 5.0, 5.1]) {
    const html = htmlFromFieldsForTest(BASE, { ingredientPt: pt });
    const tag = String(pt).replace(".", "_");
    const buf = await pdfFromHtml(html, path.join(OUT, `font-${tag}.pdf`));
    const r = await runLabelCheck483(buf, { rinseOff: true, functional: false });
    const st = statusOf(r, "전성분 표시 방법");
    const expect = pt < 5 ? "possible|unknown" : "pass|unknown";
    const ok = pt < 5 ? st === "possible" || st === "unknown" : st === "pass" || st === "unknown";
    rows.push(`| font-${pt}pt | ${expect} | ${st} | ${ok ? "PASS" : "FAIL"} |`);
  }

  rows.push("");
  rows.push("## 알레르기 경우 구분 (텍스트)");
  {
    const cases = [
      { id: "frag-only", t: "전성분: 정제수, 향료", expect: /향료/ },
      { id: "all-only", t: "전성분: 정제수, 리모넨", expect: /리모넨|Limonene/i },
      { id: "both", t: "전성분: 정제수, 향료, 리모넨", expect: /리모넨|Limonene/i },
    ];
    for (const c of cases) {
      const text = `${BASE.name}\n${BASE.org}\n${BASE.addr}\n${BASE.volume}\n${BASE.expiry}\n${BASE.lot}\n${c.t}\n${BASE.caution}\n${BASE.price}`;
      const r = await runLabelCheckText483(text, { rinseOff: true, functional: false });
      const f = r.findings.find((x) => x.label.includes("알레르기"));
      const ok = f && f.status === "attention" && c.expect.test(f.found);
      rows.push(`| ${c.id} | attention+구분 | ${f?.status}:${(f?.found || "").slice(0, 50)} | ${ok ? "PASS" : "FAIL"} |`);
    }
  }

  rows.push("");
  rows.push("## 글자 거의 없음 → 위반 가능 폭탄 금지");
  {
    const r = await runLabelCheckText483("a", { rinseOff: false, functional: false });
    const ok = r.skipJudgment === true && r.summary.possible === 0;
    rows.push(`| tiny | skipJudgment & possible=0 | skip=${r.skipJudgment} possible=${r.summary.possible} | ${ok ? "PASS" : "FAIL"} |`);
  }

  const md = rows.join("\n") + "\n";
  fs.writeFileSync(path.join("review", "492-notes.md"), md, "utf8");
  console.log(md);
  console.log("wrote review/492-notes.md and", OUT);
}

const isMain = process.argv[1]?.includes("label-check-mutation-492");
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
