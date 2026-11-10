/**
 * 493 — 광고 표현 스캔·독립 시안·광고 변이 회귀.
 * 503: playwright 제거. PDF는 review/data/samples/** 만 읽음.
 */
import fs from "node:fs";
import path from "node:path";
import { isAdFindingCategory504 } from "../../lib/label-check/ad-phrases";
import { runLabelCheck483, runLabelCheckText483 } from "../../lib/label-check/run-check";
import {
  BASE_FIELDS_FOR_TEST,
  buildMutationCases,
} from "../label-check-mutation-492";

export const name = "표시사항 493 — 광고표현·독립시안·변이";

const IND = path.join("review", "data", "samples", "independent-492");
const FIX = path.join("review", "data", "samples", "regression-503");
const MUT = path.join("review", "data", "samples", "mutation-492");

function adFindings(r: Awaited<ReturnType<typeof runLabelCheck483>>) {
  // 510: 명백한 의약품 효능은 possible(고칠 것)으로 승격될 수 있음
  return r.findings.filter(
    (f) =>
      isAdFindingCategory504(f.category) &&
      (f.status === "attention" || f.status === "possible"),
  );
}

function resolvePdf(...candidates: string[]): string | null {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

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
        // 504 v0.2: 금지·기능성 계열 각각 1건 이상
        const hasProhibited = ads.some((a) => a.category.includes("금지") || /질병|의학적|의약품/.test(a.label));
        const hasFunc = ads.some(
          (a) => a.category.includes("기능성") || /미백|주름|기능성/.test(a.label),
        );
        if (!hasProhibited || !hasFunc) {
          return `금지/기능성 누락: ${ads.map((a) => a.label).join(";")}`;
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

  {
    const c = path.join("review", "data", "samples", "sample_C_salt_bodywash.pdf");
    if (fs.existsSync(c)) {
      const r = await runLabelCheck483(fs.readFileSync(c), { rinseOff: true, functional: false });
      const ads = adFindings(r);
      // 504 v0.2: 합리적 최소(≤2)
      if (ads.length > 2) {
        f.push(`493: sample C 광고 ${ads.length}건>2 ${ads.map((a) => a.label).join(",")}`);
      }
    } else {
      f.push("493: sample_C 없음");
    }
  }

  const adCases = buildMutationCases().filter((c) => c.id.startsWith("ad-") || c.id === "inject-forbidden");
  if (adCases.length < 6) f.push(`493: 광고 변이 부족 (${adCases.length})`);

  // 504: 광고 변이는 텍스트 경로(픽스처 PDF는 하네스로 재생성 가능)
  for (const c of adCases) {
    const text = Object.values(c.fields)
      .filter(Boolean)
      .join("\n");
    const r = await runLabelCheckText483(text, {
      rinseOff: true,
      functional: c.input?.functional ?? false,
    });
    const ads = adFindings(r);
    const hit = ads.find((a) => a.label === c.expectFailLabel);
    if (!hit) f.push(`493: 변이 ${c.id} 미검출 (기대 ${c.expectFailLabel})`);
    // v0.2는 패턴이 여러 항목에 겹칠 수 있어 여분 광고는 기대 외 허용(히트만 필수)
  }

  {
    const baseP = resolvePdf(path.join(FIX, "base.pdf"), path.join(MUT, "base.pdf"));
    if (!baseP) {
      f.push("493: base.pdf 픽스처 없음");
    } else {
      const baseR = await runLabelCheck483(fs.readFileSync(baseP), { rinseOff: true, functional: false });
      if (adFindings(baseR).length) {
        f.push(`493: base PDF 광고 오탐 ${adFindings(baseR).map((a) => a.label).join(",")}`);
      }
    }
  }

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
