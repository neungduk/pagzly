/**
 * 505 — 알레르기 v1·공통 주의사항·실증 체크포인트 회귀.
 */
import fs from "node:fs";
import path from "node:path";
import { loadEvidenceCheckpoints505 } from "../../lib/label-check/ad-phrases";
import { loadAllergens483 } from "../../lib/label-check/load-rules";
import { runLabelCheck483, runLabelCheckText483 } from "../../lib/label-check/run-check";

export const name = "표시사항 505 — 알레르기v1·공통주의·실증";

const BASE = {
  name: "솔트 바디워시",
  org: "화장품책임판매업자: (주)테스트",
  addr: "서울특별시 강남구 테헤란로 1",
  volume: "내용량: 250mL",
  expiry: "사용기한: 2028.10.31까지",
  lot: "제조번호: LOT505",
  price: "가격: 10000원",
};

const COMMON4 = [
  "화장품 사용 시 또는 사용 후 직사광선에 의하여 사용부위가 붉은 반점, 부어오름 또는 가려움증 등의 이상 증상이나 부작용이 있는 경우에는 전문의 등과 상담할 것",
  "상처가 있는 부위 등에는 사용을 자제할 것",
  "어린이의 손이 닿지 않는 곳에 보관할 것",
  "직사광선을 피해서 보관할 것",
].join(". ");

function pack(extra: { ingredients: string; caution?: string; name?: string }): string {
  return [
    extra.name || BASE.name,
    BASE.org,
    BASE.addr,
    BASE.volume,
    BASE.expiry,
    BASE.lot,
    extra.ingredients,
    extra.caution || `사용할 때의 주의사항: ${COMMON4}`,
    BASE.price,
  ].join("\n");
}

function allergenFinding(r: { findings: Array<{ label: string; status: string; found: string }> }) {
  return r.findings.find((x) => x.label.includes("알레르기"));
}

function cautionLbl(r: { findings: Array<{ label: string; status: string; found: string; suggest: string }> }) {
  return r.findings.find((x) => x.label === "사용할 때의 주의사항");
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const samples = path.join(process.cwd(), "review", "data", "samples");

  // 로더: v1 + thresholds
  {
    const loaded = loadAllergens483();
    if (loaded.sourceFile !== "allergens-kr-25_v1.json") f.push("505: 로더 파일이 v1 아님");
    if (loaded.allergens.length !== 25) f.push(`505: 알레르기 ${loaded.allergens.length}≠25`);
    if (!loaded.thresholds?.rinse_off || !loaded.thresholds?.leave_on) {
      f.push("505: thresholds 없음");
    }
    const iso = loaded.allergens.find((a) => a.ko === "아이소유제놀");
    if (!iso) f.push("505: 고시 표기 아이소유제놀 없음");
    if (loaded.allergens.some((a) => a.ko === "이소유제놀")) {
      f.push("505: 초안 표기 이소유제놀이 v1에 남아 있음");
    }
  }

  // 리모넨·리날룰 → 검출(attention)
  {
    const r = await runLabelCheckText483(
      pack({ ingredients: "전성분: 정제수, 리모넨, 리날룰, 글리세린" }),
      { rinseOff: true, functional: false },
    );
    const al = allergenFinding(r);
    if (!al || al.status !== "attention") f.push("505: 리모넨/리날룰 미검출");
    if (al && (!al.found.includes("리모넨") || !al.found.includes("리날룰"))) {
      f.push("505: 리모넨/리날룰 found 누락");
    }
    if (al && !/0\.01%/.test(al.suggest)) f.push("505: rinse_off 임계값 suggest 미반영");
  }

  // 향료만 → 확인 필요
  {
    const r = await runLabelCheckText483(pack({ ingredients: "전성분: 정제수, 향료" }), {
      rinseOff: false,
      functional: false,
    });
    const al = allergenFinding(r);
    if (!al || al.status !== "attention" || !al.found.includes("향료")) {
      f.push("505: 향료만 있을 때 확인 필요 실패");
    }
    if (al && !/0\.001%/.test(al.suggest)) f.push("505: leave_on 임계값 suggest 미반영");
  }

  // 이소유제놀·아이소유제놀 둘 다 인식, 화면은 고시 표기
  {
    const r1 = await runLabelCheckText483(pack({ ingredients: "전성분: 정제수, 이소유제놀" }), {
      rinseOff: false,
      functional: false,
    });
    const a1 = allergenFinding(r1);
    if (!a1 || !a1.found.includes("아이소유제놀")) {
      f.push("505: 이소유제놀→아이소유제놀 미인식");
    }
    const r2 = await runLabelCheckText483(pack({ ingredients: "전성분: 정제수, 아이소유제놀" }), {
      rinseOff: false,
      functional: false,
    });
    const a2 = allergenFinding(r2);
    if (!a2 || !a2.found.includes("아이소유제놀")) {
      f.push("505: 아이소유제놀 미인식");
    }
  }

  // 메틸2-옥티노에이트(공백 없음) 인식 → 고시 표기
  {
    const r = await runLabelCheckText483(
      pack({ ingredients: "전성분: 정제수, 메틸2-옥티노에이트" }),
      { rinseOff: false, functional: false },
    );
    const al = allergenFinding(r);
    if (!al || !al.found.includes("메틸 2-옥티노에이트")) {
      f.push("505: 메틸2-옥티노에이트 미인식");
    }
  }

  // 공통 주의사항 4개 → 통과
  {
    const r = await runLabelCheckText483(pack({ ingredients: "전성분: 정제수" }), {
      rinseOff: true,
      functional: false,
    });
    const c = cautionLbl(r);
    if (!c || c.status !== "pass") f.push("505: 공통4 통과 실패");
  }

  // 하나 없음 → 해당 제목만
  {
    const partial = [
      "화장품 사용 시 또는 사용 후 직사광선에 의하여 사용부위가 붉은 반점, 부어오름 또는 가려움증 등의 이상 증상이나 부작용이 있는 경우에는 전문의 등과 상담할 것",
      "상처가 있는 부위 등에는 사용을 자제할 것",
      "어린이의 손이 닿지 않는 곳에 보관할 것",
      // C04 직사광선 보관 누락
    ].join(". ");
    const r = await runLabelCheckText483(
      pack({ ingredients: "전성분: 정제수", caution: `사용할 때의 주의사항: ${partial}` }),
      { rinseOff: true, functional: false },
    );
    const c = cautionLbl(r);
    if (!c || c.status !== "attention") f.push("505: 공통 일부 누락 미검출");
    if (c && !c.found.includes("직사광선을 피해서 보관")) {
      f.push("505: 누락 제목(직사광선 보관) 미표시");
    }
    if (c && c.found.includes("공통 주의사항 문구 누락 가능(확인 필요)") && !c.found.includes(":")) {
      f.push("505: 일부 누락인데 전체 누락 문구");
    }
  }

  // 모두 없음 → 한 건
  {
    const r = await runLabelCheckText483(
      pack({
        ingredients: "전성분: 정제수",
        caution: "사용할 때의 주의사항: 눈에 들어가지 않도록 주의",
      }),
      { rinseOff: true, functional: false },
    );
    const c = cautionLbl(r);
    if (!c || c.status !== "attention") f.push("505: 공통 전부 누락 미검출");
    if (c && c.found !== "공통 주의사항 문구 누락 가능(확인 필요)") {
      f.push(`505: 전부 누락 found="${c.found}"`);
    }
  }

  // 기능성 → 별표4 한 줄
  {
    const r = await runLabelCheckText483(pack({ ingredients: "전성분: 정제수" }), {
      rinseOff: false,
      functional: true,
    });
    const c = cautionLbl(r);
    if (!c || !c.suggest.includes("별표4 8")) f.push("505: 기능성 공통사항 안내 없음");
  }

  // evidence 하단 1회
  {
    const points = loadEvidenceCheckpoints505(3);
    if (points.length !== 3) f.push(`505: evidence points ${points.length}≠3`);
    const r = await runLabelCheckText483(
      pack({
        ingredients: "전성분: 정제수",
        name: "피부 재생 토너 임상완료",
      }),
      { rinseOff: false, functional: false },
    );
    const evFindings = r.findings.filter((x) => x.fixKind === "evidence" && x.status !== "pass");
    if (evFindings.length && (!r.evidenceCheckpoints || r.evidenceCheckpoints.length !== 3)) {
      f.push("505: evidenceCheckpoints 하단 미설정");
    }
  }

  // 시안 A/B/C — 알레르기 검출 유지, 공통주의는 합리적(단정 위반 status 없음)
  for (const [tag, file, input] of [
    ["A", "sample_A_moari_toner.pdf", { rinseOff: false, functional: false }],
    ["B", "sample_B_rovan_sun.pdf", { rinseOff: false, functional: true }],
    ["C", "sample_C_salt_bodywash.pdf", { rinseOff: true, functional: false }],
  ] as const) {
    const buf = fs.readFileSync(path.join(samples, file));
    const r = await runLabelCheck483(buf, input);
    if (r.findings.some((x) => (x.status as string) === "위반")) {
      f.push(`505: ${tag} status 단정 위반`);
    }
    const cautions = r.findings.filter((x) => x.label === "사용할 때의 주의사항");
    if (cautions.length > 1) f.push(`505: ${tag} 주의사항 finding 중복 ${cautions.length}`);
  }

  // A: 리모넨/리날룰 유지
  {
    const buf = fs.readFileSync(path.join(samples, "sample_A_moari_toner.pdf"));
    const r = await runLabelCheck483(buf, { rinseOff: false, functional: false });
    const al = allergenFinding(r);
    if (!al || !al.found.includes("리모넨") || !al.found.includes("리날룰")) {
      f.push("505: A 리모넨/리날룰 회귀 실패");
    }
  }

  return f;
}

if (require.main === module)
  void run().then((x) => {
    for (const s of x) console.log(s);
    process.exit(x.length ? 1 : 0);
  });
