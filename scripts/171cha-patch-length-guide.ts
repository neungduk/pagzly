/**
 * 171차 — buildSectionLengthGuide에 tradeoff_card 한 줄씩 삽입.
 */
import fs from "fs";
import path from "path";

const p = path.join(__dirname, "..", "lib", "section-templates.ts");
let s = fs.readFileSync(p, "utf8");

function patch(old: string, neu: string, label: string) {
  if (s.includes(neu.slice(0, Math.min(60, neu.length))) && neu.length > 80) {
    // crude already-check: if tradeoff already next to this category's marker
  }
  if (!s.includes(old)) {
    console.error("NOT FOUND", label, old.slice(0, 80));
    process.exit(1);
  }
  if (s.includes(neu)) {
    console.log("skip", label);
    return;
  }
  s = s.replace(old, neu);
  console.log("ok", label);
}

// Beauty — 진정 (not 실버)
patch(
  "\\n- 시각 컨셉과 모순 금지: 쿨링/진정이면 따뜻·온기·골드 카피 금지. 수분이면 오일리·번들 표현 금지. 클렌징이면 보습 도포를 주효능처럼 쓰지 말 것.\\n- package_contents body:",
  "\\n- 시각 컨셉과 모순 금지: 쿨링/진정이면 따뜻·온기·골드 카피 금지. 수분이면 오일리·번들 표현 금지. 클렌징이면 보습 도포를 주효능처럼 쓰지 말 것.\\n- tradeoff_card: keyFeatures·targetCustomer·ingredients에 피부타입/자극도·'추천'/'이런 분'/'확인 후 구매' 등 사용 조건이 있으면 recommendFor/considerIf 채움. 없으면 생략. considerIf는 사실 기반·완곡만(깎아내리기 금지).\\n- package_contents body:",
  "beauty",
);

patch(
  "\\n- stat_infographic: 혼용률·신축성 % 등 입력 수치가 있으면 적극 채움. 없으면 생략.\\n- package_contents body: 입력에 1+1/2+1/기획/증정/세트",
  "\\n- stat_infographic: 혼용률·신축성 % 등 입력 수치가 있으면 적극 채움. 없으면 생략.\\n- tradeoff_card: keyFeatures·targetCustomer에 핏/사이즈감·'추천'/'이런 분'/'확인 후 구매' 등 사용 조건이 있으면 recommendFor/considerIf 채움. 없으면 생략. considerIf는 사실 기반·완곡만(깎아내리기 금지).\\n- package_contents body: 입력에 1+1/2+1/기획/증정/세트",
  "fashion",
);

patch(
  "\\n- stat_infographic: 함량·칼로리·단백질 g 등 입력 수치가 있으면 적극 채움. 없으면 생략.\\n- package_contents body: 입력에 기획/더블기획/1+1/증정/사은품/세트",
  "\\n- stat_infographic: 함량·칼로리·단백질 g 등 입력 수치가 있으면 적극 채움. 없으면 생략.\\n- tradeoff_card: keyFeatures·ingredients·targetCustomer에 알레르기·보관 조건·'추천'/'이런 분'/'확인 후 구매' 등 사용 조건이 있으면 recommendFor/considerIf 채움. 없으면 생략. considerIf는 사실 기반·완곡만(깎아내리기 금지).\\n- package_contents body: 입력에 기획/더블기획/1+1/증정/사은품/세트",
  "food",
);

patch(
  "\\n- stat_infographic: dB·배터리·무게 등 입력 수치가 있으면 적극 채움. 없으면 생략.`;",
  "\\n- stat_infographic: dB·배터리·무게 등 입력 수치가 있으면 적극 채움. 없으면 생략.\\n- tradeoff_card: keyFeatures·targetCustomer에 호환성·설치 조건·'추천'/'이런 분'/'확인 후 구매' 등 사용 조건이 있으면 recommendFor/considerIf 채움. 없으면 생략. considerIf는 사실 기반·완곡만(깎아내리기 금지).`;",
  "electronics",
);

patch(
  "\\n- stat_infographic: 조단백질 %·칼로리 등 입력 수치가 있으면 적극 채움. 없으면 생략.\\n- package_contents body: 입력에 기획/1+1/증정/사은품/세트",
  "\\n- stat_infographic: 조단백질 %·칼로리 등 입력 수치가 있으면 적극 채움. 없으면 생략.\\n- tradeoff_card: keyFeatures·targetCustomer에 연령대/급여 조건·'추천'/'이런 분'/'확인 후 구매' 등 사용 조건이 있으면 recommendFor/considerIf 채움. 없으면 생략. 질병 치료·예방·수명 연장 단정 금지. considerIf는 사실 기반·완곡만(깎아내리기 금지).\\n- package_contents body: 입력에 기획/1+1/증정/사은품/세트",
  "pet",
);

fs.writeFileSync(p, s, "utf8");
console.log("[171] length guide done");
