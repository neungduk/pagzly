/**
 * 회귀 — 436차 1-1 유형 판별기: 16개 세부 유형이 각자 판별되고, 신호 부족·카테고리 불명은 기본(default)으로 폴백, 대분류 안에서만 분기, 결정적, 호출 0.
 */
import { ARCHETYPE_IDS, detectArchetype, groupOfCategory } from "../../lib/product-archetype";

export const name = "유형 판별기 — 16유형 판별·모호/신호 부족/카테고리 불명 폴백·대분류 한정·결정적";

const CASES: Array<[string, string, string, string]> = [
  // [카테고리, 상품명, 핵심 키워드, 기대 유형]
  ["화장품/뷰티", "수분 에센스 미스트", "세안 후 수분 보충", "beauty-skincare"],
  ["화장품/뷰티", "벨벳 틴트 립", "발색이 선명한 12호 컬러", "beauty-makeup"],
  ["화장품/뷰티", "약산성 두피 샴푸", "헤어 두피 케어", "beauty-hairbody"],
  ["화장품/뷰티", "저분자 콜라겐 스틱포", "하루 한 포 섭취", "beauty-inner"],
  ["의류/패션", "데일리 코튼 반팔 티셔츠", "세미오버 핏", "fashion-top"],
  ["의류/패션", "와이드 데님 팬츠", "허리 밴딩", "fashion-bottom"],
  ["의류/패션", "울 블렌드 롱 코트", "겨울 아우터", "fashion-outer"],
  ["의류/패션", "플라워 롱 원피스", "여름 휴양지", "fashion-dress"],
  ["의류/패션", "레더 토트 가방", "A4 수납", "fashion-acc"],
  ["전자제품", "오픈형 이어버드", "블루투스 ANC", "tech-mobile"],
  ["전자제품", "무선 핸디 청소기", "흡입력", "tech-appliance"],
  ["전자제품", "기계식 키보드", "USB 연결", "tech-peripheral"],
  ["식품", "프리미엄 밀키트 찌개", "냉동 즉석 조리", "food-meal"],
  ["식품", "초코 견과 간식 바", "단백질 스낵", "food-snack"],
  ["생활용품", "접이식 수납 바구니", "정리 서랍", "living-home"],
  ["반려동물", "강아지 소프트 사료", "반려견 급여", "living-petkids"],
];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  for (const [category, productName, keyFeatures, want] of CASES) {
    const r = detectArchetype({ category, productName, keyFeatures });
    eq(`${productName} → ${want}`, [r.id, r.fallback], [want, false]);
    if (r.confidence < 0.45 || r.confidence > 1) fails.push(`${productName}: 신뢰도 ${r.confidence}`);
  }
  eq("모든 세부 유형 커버", [...new Set(CASES.map((c) => c[3]))].sort(), [...ARCHETYPE_IDS].sort());
  // 폴백: 신호 부족 / 카테고리 불명 / 키워드가 다른 대분류의 것 / 이름 없음
  eq("신호 부족 → default", detectArchetype({ category: "화장품/뷰티", productName: "신상품", keyFeatures: "좋은 제품" }).id, "default");
  eq("카테고리 불명 → default", [detectArchetype({ category: "", productName: "수분 에센스" }).id, detectArchetype({ category: "", productName: "수분 에센스" }).group], ["default", null]);
  eq("대분류 한정(패션 카테고리에서 뷰티 키워드)", detectArchetype({ category: "의류/패션", productName: "수분 에센스" }).id, "default");
  eq("입력 없음 → default", detectArchetype({ category: "전자제품" }).fallback, true);
  // 대분류 매핑·결정성
  eq("대분류", [groupOfCategory("화장품/뷰티"), groupOfCategory("의류/패션"), groupOfCategory("전자제품"), groupOfCategory("식품"), groupOfCategory("생활용품"), groupOfCategory("반려동물"), groupOfCategory("모름")], ["beauty", "fashion", "tech", "food", "living", "living", null]);
  const a = detectArchetype({ category: "의류/패션", productName: "브이넥 청키 립 니트 가디건", keyFeatures: "데님·슬랙스·스커트 어디에나 어울림" });
  eq("코디 언급(데님 등)이 유형을 뒤집지 않음", a.id, "fashion-outer");
  eq("결정적", JSON.stringify(a), JSON.stringify(detectArchetype({ category: "의류/패션", productName: "브이넥 청키 립 니트 가디건", keyFeatures: "데님·슬랙스·스커트 어디에나 어울림" })));
  return fails;
}
