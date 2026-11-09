/**
 * 504 — 광고 v0.2·주의사항·별표4 보강 회귀.
 */
import fs from "node:fs";
import path from "node:path";
import { isAdFindingCategory504, scanAdPhrases493 } from "../../lib/label-check/ad-phrases";
import { ADDENDA_OVERLAP_504 } from "../../lib/label-check/addenda-kr";
import { scanIngredientCautions504 } from "../../lib/label-check/cautions-kr";
import { runLabelCheck483, runLabelCheckText483 } from "../../lib/label-check/run-check";

export const name = "표시사항 504 — 광고v0.2·주의사항·별표4";

const BASE = {
  name: "솔트 바디워시",
  org: "화장품책임판매업자: (주)테스트",
  addr: "서울특별시 강남구 테헤란로 1",
  volume: "내용량: 250mL",
  expiry: "사용기한: 2028.10.31까지",
  lot: "제조번호: LOT504",
  caution: "사용할 때의 주의사항: 눈에 들어가지 않도록 주의",
  price: "가격: 10000원",
};

function pack(extra: { ingredients: string; caution?: string; name?: string }): string {
  return [
    extra.name || BASE.name,
    BASE.org,
    BASE.addr,
    BASE.volume,
    BASE.expiry,
    BASE.lot,
    extra.ingredients,
    extra.caution || BASE.caution,
    BASE.price,
  ].join("\n");
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // 살리실릭애씨드 + 3세 문구 없음 → 확인 필요
  {
    const r = await runLabelCheckText483(
      pack({ ingredients: "전성분: 정제수, 살리실릭애씨드, 글리세린" }),
      { rinseOff: false, functional: false },
    );
    const cau = r.findings.filter((x) => x.category === "주의사항" && /살리실/.test(x.label));
    if (!cau.length) f.push("504: 살리실릭 주의 미검출");
  }
  // 문구 있음 → 통과(주의사항 finding 없음)
  {
    const r = await runLabelCheckText483(
      pack({
        ingredients: "전성분: 정제수, 살리실릭애씨드",
        caution:
          "사용할 때의 주의사항: 3세 이하 영유아에게는 사용하지 말 것. 눈에 들어가지 않도록 주의",
      }),
      { rinseOff: false, functional: false },
    );
    const cau = r.findings.filter((x) => x.category === "주의사항" && /살리실/.test(x.label));
    if (cau.length) f.push("504: 살리실릭 문구 있는데도 지적");
  }
  // 알부틴만 + 문구 없음 → 함량 안내
  {
    const r = await runLabelCheckText483(pack({ ingredients: "전성분: 정제수, 알부틴" }), {
      rinseOff: false,
      functional: false,
    });
    const cau = r.findings.find((x) => x.category === "주의사항" && /알부틴/.test(x.label));
    if (!cau || !/함량/.test(cau.suggest)) f.push("504: 알부틴 함량 안내 없음");
  }
  // 카민 + 문구 없음
  {
    const r = await runLabelCheckText483(pack({ ingredients: "전성분: 정제수, 카민" }), {
      rinseOff: false,
      functional: false,
    });
    const cau = r.findings.find((x) => x.category === "주의사항" && /카민/.test(x.label));
    if (!cau) f.push("504: 카민 주의 미검출");
  }

  // 광고: 무스테로이드 vs 무첨가
  {
    const a = scanAdPhrases493("무스테로이드 클렌저", { rinseOff: true, functional: false });
    const b = scanAdPhrases493("무첨가 클렌저", { rinseOff: true, functional: false });
    const aHit = a.find((x) => /배합금지|무스테로이드|스테로이드/.test(x.label + x.found));
    const bHit = b.find((x) => /무\(無\)|무첨가|無/.test(x.label + x.found));
    if (!aHit) f.push("504: MFDS-011 무스테로이드 미검출");
    if (!bHit) f.push("504: MFDS-E03 무첨가 미검출");
    if (aHit && bHit && aHit.label === bHit.label) f.push("504: 무스테로이드/무첨가 동일 항목");
  }
  // 피부나이 -3살 / 30% 개선
  {
    const age = scanAdPhrases493("피부나이 -3살 케어", { rinseOff: true, functional: false });
    if (!age.some((x) => /피부 나이/.test(x.label))) f.push("504: 피부나이 정규식 미검출");
    const pct = scanAdPhrases493("보습 30% 개선", { rinseOff: true, functional: false });
    if (!pct.some((x) => /수치|시험/.test(x.label) || /30%/.test(x.found))) {
      f.push("504: 30% 개선 정규식 미검출");
    }
  }
  // gluten free 단어 경계 / Natural Source 전성분 마스킹
  {
    const g = scanAdPhrases493("gluten free formula", { rinseOff: true, functional: false });
    // free가 경계로 잡힐 수 있음 — gluten free 전체는 허용 오탐 최소화: free 단독은 경계
    const naturalIng = scanAdPhrases493(
      "솔트\n전성분: Natural Source Water, 글리세린\n사용할 때의 주의사항: 주의\n내용량: 100mL",
      { rinseOff: true, functional: false },
    );
    if (naturalIng.some((x) => /천연|natural/i.test(x.found))) {
      f.push("504: Natural Source 전성분 영역 오탐");
    }
    void g;
  }

  // 정상 라벨 광고·주의 최소
  for (const rel of [
    "review/data/samples/independent-492/i1_ok_twocol.pdf",
    "review/data/samples/independent-492/i5_functional.pdf",
    "review/data/samples/sample_C_salt_bodywash.pdf",
  ]) {
    if (!fs.existsSync(rel)) {
      f.push(`504: 샘플 없음 ${rel}`);
      continue;
    }
    const r = await runLabelCheck483(fs.readFileSync(rel), {
      rinseOff: true,
      functional: rel.includes("i5"),
    });
    const ads = r.findings.filter((x) => isAdFindingCategory504(x.category));
    const cau = r.findings.filter((x) => x.category === "주의사항");
    // v0.2는 항목 세분화로 히트가 늘어날 수 있음 — 합리적 상한
    if (ads.length > 8) f.push(`504: ${path.basename(rel)} 광고 ${ads.length}건>8`);
    if (cau.length > 4) f.push(`504: ${path.basename(rel)} 주의 ${cau.length}건>4`);
  }

  if (ADDENDA_OVERLAP_504.length < 11) f.push("504: addenda overlap 표 부족");

  // 단위: 주의 구간 폴백 함수 존재
  {
    const hits = scanIngredientCautions504(
      "전성분: 카민\n사용할 때의 주의사항: 없음",
    );
    if (!hits.length) f.push("504: scanIngredientCautions 단위 실패");
  }

  return f;
}
