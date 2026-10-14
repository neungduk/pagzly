/**
 * 회귀 — 아이콘 규칙(396~398차). 근거 키워드가 있을 때만 아이콘, 수치만 있으면 체크(환각 방지 게이트).
 * 경계 사례 + 7샘플 핵심 포인트·요약 칩 스냅숏(398차 확정값). 고정 입력, 유료 호출 0
 */
import {
  pickBenefitCardIcons,
  pickChecklistIcons,
  pickSummaryIcon,
  type SummaryIconId,
} from "../../lib/summary-line-icons";

export const name = "아이콘 규칙(경계·샘플 스냅숏)";

const CHECKLIST_EDGE: Array<[string, SummaryIconId]> = [
  ["2개", "check"],
  ["100%", "check"],
  ["면 100%", "check"],
  ["나트륨 480mg", "check"],
  ["카페인 함량 표기", "check"],
  ["만족 보장", "check"],
  ["배터리 이어버드 9시간", "bolt"],
  ["총장 72cm", "ruler"],
  ["사이즈 S/M/L", "ruler"],
  ["무게 280g", "weight"],
  ["1.2kg 초경량", "weight"],
  ["용량 350mL", "cup"],
  ["2L", "cup"],
  ["선물 포장 가능", "box"],
  ["컬러 3종", "palette"],
  ["품질 보증 2년", "shield"],
  // 첫 문장만 본다 — 뒤 주의 문구의 "테스트하세요"로 플라스크가 붙으면 안 된다
  ["무향·저자극. 이런 점은 확인 후 구매: 오일리 피부는 소량부터 테스트하세요.", "heart"],
];

const CHIP_EDGE: Array<[string, SummaryIconId]> = [
  ["2개", "check"],
  ["100%", "check"],
  ["나트륨 480mg", "check"],
  ["만족 보장", "check"],
  ["30일 청음 만족 보장", "check"],
  ["50ml", "cup"],
  ["1.2kg", "weight"],
  ["총장 72cm", "ruler"],
  ["1년 무상 A/S", "shield"],
  ["A/S 1년", "shield"],
  ["30일 무료 교환", "return"],
  ["KC 인증", "shield"],
  // 401차 실생성(전자)에서 나온 칩
  ["24dB 저소음", "wave"],
  ["에너지효율 1등급", "bolt"],
  ["H13 HEPA", "check"],
];

/** 398차 확정 스냅숏 — 샘플 입력(review/ 세션의 핵심 포인트·요약 칩 문구)을 그대로 옮겨 둔 것 */
const CHECKLIST_SNAPSHOT: Array<{ sample: string; items: string[]; icons: SummaryIconId[] }> = [
  { sample: "beauty", items: ["병풀추출물 진정 케어", "세라마이드NP 장벽 보습", "무향·저자극 포뮬러", "가볍게 스며드는 젤크림"], icons: ["heart", "droplet", "check", "feather"] },
  { sample: "electronics", items: ["하이브리드 ANC 42dB", "오픈형 이어훅 설계로 장시간 착용 편안함", "LDAC·AAC 듀얼 코덱", "배터리 이어버드 9시간·케이스 포함 36시간"], icons: ["check", "heart", "check", "bolt"] },
  { sample: "fashion", items: ["면 100%", "신축성 12%", "세탁 후 수축률 2% 이내", "오버사이즈 핏"], icons: ["check", "check", "droplet", "ruler"] },
  { sample: "food", items: ["메밀면 단백질 8g/1인분", "들기름 함량 표기", "나트륨 480mg", "조리 3분"], icons: ["molecule", "check", "check", "check"] },
  { sample: "living", items: ["내열 120℃", "용량 350mL", "무게 280g", "식기세척기 가능. 이런 분께 추천: 아침 커피·티 루틴을 즐기는 분."], icons: ["thermo", "cup", "weight", "check"] },
  { sample: "pet", items: ["조단백질 28%", "수분 10%", "동물성 원료 표기", "자견·성견 급여 가이드. 이런 분께 추천: 데일리 소프트 사료를 찾는 보호자."], icons: ["molecule", "droplet", "check", "check"] },
];

const CHIP_SNAPSHOT: Array<{ sample: string; chips: string[]; icons: SummaryIconId[] }> = [
  { sample: "beauty", chips: ["50ml", "무향·저자극", "더마 테스트 완료", "비건 포뮬러", "동물실험 없음"], icons: ["cup", "leaf", "flask", "leaf", "leaf"] },
  { sample: "electronics", chips: ["KC 인증", "블루투스 SIG 인증", "RoHS", "1년 무상 A/S", "30일 청음 만족 보장"], icons: ["shield", "shield", "check", "shield", "check"] },
];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (const [text, want] of CHECKLIST_EDGE) {
    const got = pickChecklistIcons([text])[0];
    if (got !== want) fails.push(`핵심 포인트 "${text}" → ${got} (기대 ${want})`);
  }
  for (const [text, want] of CHIP_EDGE) {
    const got = pickSummaryIcon(text);
    if (got !== want) fails.push(`요약 칩 "${text}" → ${got} (기대 ${want})`);
  }
  // 혜택 카드: 수치만 있는 카드가 섞이면 묶음 전체 아이콘 없음(398차 % 규칙 제거)
  const pct = pickBenefitCardIcons([{ title: "면 100%" }, { title: "신축성 12%" }]);
  if (pct !== null) fails.push(`혜택 카드 [면 100%, 신축성 12%] → ${JSON.stringify(pct)} (기대 null)`);
  const living = pickBenefitCardIcons([{ title: "내열 120℃" }, { title: "용량 350mL" }, { title: "무게 280g" }]);
  if (JSON.stringify(living) !== JSON.stringify(["thermo", "cup", "weight"])) {
    fails.push(`혜택 카드 리빙 → ${JSON.stringify(living)} (기대 thermo·cup·weight)`);
  }
  for (const s of CHECKLIST_SNAPSHOT) {
    const got = pickChecklistIcons(s.items);
    if (JSON.stringify(got) !== JSON.stringify(s.icons)) fails.push(`핵심 포인트 스냅숏 ${s.sample}: ${got.join("·")} (기대 ${s.icons.join("·")})`);
  }
  // 같은 인증의 다른 이름은 칩 하나(401차)
  const { extractTrustChips } = await import("../../lib/extract-trust-chips");
  const dupChips = extractTrustChips([
    { type: "cta_price", slot: "cta_price", price: 1, badges: ["에너지효율 1등급"] },
    { type: "spec_table", slot: "spec_table", heading: "제품 사양", rows: [{ label: "KC 인증", value: "KC 인증, 에너지소비효율 1등급" }] },
  ] as unknown as Parameters<typeof extractTrustChips>[0]);
  if (dupChips.filter((c) => /에너지(소비)?효율/.test(c)).length !== 1) {
    fails.push(`요약 칩 중복 제거: ${dupChips.join(" | ")} (에너지효율 칩 1개 기대)`);
  }
  // 다른 칩 안에 글자 그대로 들어 있는 짧은 칩은 합친다(403차) — 긴 쪽만 남고 새 문구는 없다
  const subChips = extractTrustChips([
    { type: "cta_price", slot: "cta_price", price: 1, badges: ["5만원 이상 무료배송", "무료배송", "무향·저자극", "무향", "당일발송"] },
  ] as unknown as Parameters<typeof extractTrustChips>[0]);
  if (JSON.stringify(subChips) !== JSON.stringify(["5만원 이상 무료배송", "무향·저자극", "당일발송"])) {
    fails.push(`요약 칩 포함 중복 합치기: ${subChips.join(" | ")} (기대 5만원 이상 무료배송 | 무향·저자극 | 당일발송)`);
  }
  for (const s of CHIP_SNAPSHOT) {
    const got = s.chips.map(pickSummaryIcon);
    if (JSON.stringify(got) !== JSON.stringify(s.icons)) fails.push(`요약 칩 스냅숏 ${s.sample}: ${got.join("·")} (기대 ${s.icons.join("·")})`);
  }
  return fails;
}
