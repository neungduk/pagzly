/**
 * 513 — 해당 여부 게이팅·코드 판정·직접 확인 축소
 */
import fs from "node:fs";
import path from "node:path";
import { runLabelCheckText483, runLabelCheckUsText494 } from "../../lib/label-check/run-check";
import { WHY_PREFIX } from "../../lib/label-check/gating-513";
import type { LabelCheckResult } from "../../lib/label-check/types";

export const name = "표시사항 513 — 직접 확인 게이팅";

const FORBIDDEN = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];

const PLAIN_KR = `
제품명 수분크림
화장품책임판매업자 테스트㈜ 서울특별시 강남구 테헤란로 1
제조업자 테스트공장 경기도 성남시
용량 50 mL
제조번호 LOT2024A
사용기한 2027.12.31
전성분 정제수, 글리세린, 나이아신아마이드, 향료
사용할 때의 주의사항 이 제품 사용 시 이상이 있으면 사용을 중지하세요
가격 12000원
바코드 8801234567890
`;

function assertNoForbidden(blob: string, fails: string[], tag: string) {
  for (const w of FORBIDDEN) {
    if (blob.includes(w)) fails.push(`${tag}: 금지어 ${w}`);
  }
}

function manualLabels(r: LabelCheckResult): string[] {
  return (r.manualItems || []).map((m) => m.label);
}

function skippedLabels(r: LabelCheckResult): string[] {
  return (r.skippedItems513 || []).map((s) => s.label);
}

function findingLabels(r: LabelCheckResult): string[] {
  return (r.findings || []).map((f) => f.label);
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  // 1) 평범한 라벨 — 세트·색조·수출·비누·기능성 관련 직접확인 없음, skipped에 이름
  {
    const r = await runLabelCheckText483(PLAIN_KR, {
      rinseOff: false,
      functional: false,
      market: "KR",
    });
    const manuals = manualLabels(r);
    for (const bad of [
      "세트 상품 제조번호·사용기한 표기",
      "세트 상품 표시",
      "색조 제품 착색제 ± 표기",
      "수출 전용 제품",
      "중화·비누화 생성물 표기",
      "기능성화장품 문구 위치·크기",
    ]) {
      if (manuals.includes(bad)) fails.push(`513-1: 평범한 라벨에 수동 ${bad}`);
    }
    const skip = skippedLabels(r).join("|");
    for (const need of ["세트 상품", "색조", "수출 전용", "중화", "기능성"]) {
      if (!skip.includes(need)) fails.push(`513-1: skipped에 ${need} 없음`);
    }
    if (r.summary.manual !== r.manualItems.length) {
      fails.push("513-1: summary.manual ≠ manualItems.length");
    }
    if (r.manualItems.length > 5) {
      fails.push(`513-1: 직접확인 ${r.manualItems.length}건(5 초과)`);
    }
    for (const m of r.manualItems) {
      if (!m.whyManual?.startsWith(WHY_PREFIX)) {
        fails.push(`513-1: whyManual 누락 ${m.label}`);
      }
    }
    assertNoForbidden(JSON.stringify(r), fails, "513-1");
  }

  // 2) 세트 문구 → finding
  {
    const r = await runLabelCheckText483(
      PLAIN_KR + "\n세트 구성품 증정 기획\n사용기한 제품에 별도 표시\n",
      { rinseOff: false, functional: false, market: "KR" },
    );
    if (!findingLabels(r).some((l) => l.includes("세트"))) {
      fails.push("513-2: 세트 finding 없음");
    }
    if (manualLabels(r).some((l) => l.includes("세트"))) {
      fails.push("513-2: 세트가 여전히 수동");
    }
  }

  // 3) 착색제 ±
  {
    const withPm = await runLabelCheckText483(
      PLAIN_KR.replace("향료", "CI 77891, ± CI 77491, 향료"),
      { rinseOff: false, functional: false, market: "KR", productTypes: ["color_makeup"] },
    );
    const pass = withPm.findings.find((f) => f.label.includes("착색제"));
    if (!pass || pass.status !== "pass") fails.push("513-3a: ± 있는데 pass 아님");
    if (pass && !pass.found) fails.push("513-3a: pass에 found 없음(거짓 통과 위험)");

    const noPm = await runLabelCheckText483(
      PLAIN_KR.replace("향료", "CI 77891, 향료"),
      { rinseOff: false, functional: false, market: "KR", productTypes: ["color_makeup"] },
    );
    const fix = noPm.findings.find((f) => f.label.includes("착색제"));
    if (!fix || (fix.status !== "possible" && fix.status !== "attention")) {
      fails.push("513-3b: ± 없을 때 고칠 것/확인할 것 아님");
    }
  }

  // 4) 영문 INCI만
  {
    const r = await runLabelCheckText483(
      PLAIN_KR.replace(
        "전성분 정제수, 글리세린, 나이아신아마이드, 향료",
        "전성분 Aqua, Glycerin, Niacinamide, Fragrance",
      ),
      { rinseOff: false, functional: false, market: "KR" },
    );
    const f = r.findings.find((x) => x.label.includes("표준 국문"));
    if (!f || !/영문\s*\d+개/.test(f.suggest)) {
      fails.push("513-4: 표준 국문명 카드 없음");
    }
    if (!manualLabels(r).some((l) => l.includes("표준 국문"))) {
      fails.push("513-4: 표준 국문 직접확인 없음");
    }
  }

  // 5) 수산화나트륨 → 중화 안내, 없으면 없음
  {
    const withN = await runLabelCheckText483(
      PLAIN_KR.replace("향료", "수산화나트륨, 향료"),
      { rinseOff: false, functional: false, market: "KR" },
    );
    if (!findingLabels(withN).some((l) => l.includes("중화"))) {
      fails.push("513-5a: 중화 카드 없음");
    }
    const plain = await runLabelCheckText483(PLAIN_KR, {
      rinseOff: false,
      functional: false,
      market: "KR",
    });
    if (findingLabels(plain).some((l) => l.includes("중화"))) {
      fails.push("513-5b: 중화 없는 라벨에 카드");
    }
  }

  // 6) US: 한글만 → 영어 표기 문제, aerosol → 경고
  {
    const hangulUs = await runLabelCheckUsText494(
      "제품명 수분크림 전성분 정제수 글리세린 사용할 때의 주의사항 이상을 느끼면 중지하세요 용량 50ml",
      { rinseOff: false, functional: false, market: "US" },
    );
    const en = hangulUs.findings.find((f) => f.label.includes("영어"));
    if (!en || en.status === "pass") fails.push("513-6a: 한글만 US 영어 pass");

    const aerosol = await runLabelCheckUsText494(
      "Moisturizer Cream Net wt 1.0 oz Ingredients: Water, Glycerin Distributed by Test Co CA 90001 aerosol spray Warning Keep out of reach of children",
      { rinseOff: false, functional: false, market: "US" },
    );
    const haz = aerosol.findings.find((f) => f.label.includes("위험"));
    if (!haz) fails.push("513-6b: aerosol 경고 점검 없음");
    if (!skippedLabels(aerosol).some((l) => l.includes("전문가")) &&
        !findingLabels(aerosol).some((l) => l.includes("전문가"))) {
      // 전문가 미해당 → skipped
      if (!skippedLabels(aerosol).some((l) => l.includes("전문가"))) {
        fails.push("513-6c: 전문가용 skipped 없음");
      }
    }
  }

  // 7) 거짓 통과: pass finding은 found 비어 있으면 안 됨
  {
    const r = await runLabelCheckText483(PLAIN_KR, {
      rinseOff: false,
      functional: false,
      market: "KR",
    });
    for (const f of r.findings) {
      if (f.status === "pass" && !(f.found || "").trim()) {
        fails.push(`513-7: pass인데 found 빈값 ${f.label}`);
      }
    }
  }

  // 8) 정적: ResultView 제목·접이식, 모듈 존재
  {
    const rv = fs.readFileSync(
      path.join("components", "label-check", "ui-507", "ResultView.tsx"),
      "utf8",
    );
    if (!rv.includes("판매자가 꼭 확인할 것")) fails.push("513-8: ResultView 제목");
    if (!rv.includes("해당하지 않아 뺀 항목")) fails.push("513-8: skipped 접이식");
    if (!rv.includes("참고: 개정 예정·동향")) fails.push("513-8: 참고 접이식");
    if (!rv.includes("whyManual")) fails.push("513-8: whyManual 표시");
    for (const f of ["gating-513.ts", "checks-513.ts"]) {
      if (!fs.existsSync(path.join("lib", "label-check", f))) {
        fails.push(`513-8: ${f} 없음`);
      }
    }
    const opts = fs.readFileSync(
      path.join("lib", "label-check", "product-type-options-504.ts"),
      "utf8",
    );
    for (const id of ["export_only", "set_product", "soap", "professional", "hazardous"]) {
      if (!opts.includes(`"${id}"`)) fails.push(`513-8: product option ${id}`);
    }
  }

  // 수출 전용 안내
  {
    const r = await runLabelCheckText483(PLAIN_KR, {
      rinseOff: false,
      functional: false,
      market: "KR",
      productTypes: ["export_only"],
    });
    if (!r.exportNotice513?.includes("수출 전용")) fails.push("513-export: 안내 없음");
    if (r.findings.length > 0) fails.push("513-export: findings 남아 있음");
  }

  return fails;
}
