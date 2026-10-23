/**
 * 444차 4-4 — 입력 풍부 합성 픽스처 3종(비교표·판매자 신뢰 근거 카드 포함). 기존 합성 픽스처를 복사해 판매자 비교 입력(comparisonRows 3행)과
 * 판매자 신뢰 근거 카드(highlight_box slot seller_trust_evidence)를 얹는다(숫자 주장 게이트는 입력에 없는 숫자 문장을 지우므로 카드 문구에는 숫자를 쓰지 않는다) — 비교 정책(427차)은 판매자 비교 입력이 있을 때만 비교표를 남기므로
 * 기존 18종 페이지에는 비교표·신뢰 근거 카드가 한 번도 안 나왔다. 문구는 검사 전용 입력이며 서비스 문구가 아니다(픽스처 `synthetic: true`).
 *   npx tsx scripts/gen-rich-fixtures.ts     (같은 입력이면 같은 출력)
 */
import fs from "node:fs";
import path from "node:path";

const DIR = "scripts/fixtures";
type Row = { label: string; ours: string; other: string };
const SPECS: Array<{ from: string; to: string; rows: Row[]; trust: Array<{ title: string; body: string }>; heading: string }> = [
  {
    from: "archetype-tier-rich-tech-6p.json",
    to: "archetype-compare-tech.json",
    rows: [
      { label: "무게", ours: "5.8g", other: "8g" },
      { label: "소음 차단", ours: "42dB", other: "30dB" },
      { label: "배터리", ours: "9시간", other: "6시간" },
    ],
    heading: "믿고 쓰는 이유",
    trust: [
      { title: "청음 후 교환", body: "청음해 보고 맞지 않으면 교환할 수 있습니다." },
      { title: "무상 A/S", body: "구매 후 일정 기간 무상으로 점검해 드립니다." },
      { title: "KC 인증", body: "KC 인증을 받은 제품입니다." },
    ],
  },
  {
    from: "archetype-skincare-serum.json",
    to: "archetype-compare-beauty.json",
    rows: [
      { label: "사용감", ours: "끈적임 없음", other: "끈적임 있음" },
      { label: "메이크업 위", ours: "사용 가능", other: "사용 불가" },
      { label: "용량", ours: "30mL", other: "100mL" },
    ],
    heading: "믿고 쓰는 이유",
    trust: [
      { title: "민감 피부 테스트", body: "민감한 피부를 위한 사용 전 테스트를 거쳤습니다." },
      { title: "무료배송", body: "일정 금액 이상 구매 시 배송비가 무료입니다." },
    ],
  },
  {
    from: "archetype-tier-rich-fashion-6p.json",
    to: "archetype-compare-fashion.json",
    rows: [
      { label: "소재", ours: "면 100%", other: "혼방" },
      { label: "두께", ours: "20수 중간", other: "얇음" },
      { label: "핏", ours: "세미오버", other: "슬림" },
    ],
    heading: "믿고 입는 이유",
    trust: [
      { title: "정사이즈 추천", body: "정사이즈를 권하며 사이즈표를 함께 제공합니다." },
      { title: "교환 가능", body: "수령 후 기간 안에 교환이 가능합니다." },
      { title: "빠른 출고", body: "평일 오후 이전 주문은 당일 출고됩니다." },
    ],
  },
];

for (const s of SPECS) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, s.from), "utf8")) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- 저장 세션 JSON
  j.comparisonRows = s.rows;
  const g = j.generated ?? j;
  const sections = (g.sections as Array<Record<string, unknown>>).filter((x) => !(x.type === "highlight_box" && x.slot === "seller_trust_evidence"));
  const trust = { type: "highlight_box", slot: "seller_trust_evidence", heading: s.heading, cards: s.trust };
  // 첫 본문 섹션 뒤(히어로 다음 두 번째 자리)에 둔다
  const at = Math.min(2, sections.length);
  sections.splice(at, 0, trust);
  g.sections = sections;
  j.synthetic = true;
  fs.writeFileSync(path.join(DIR, s.to), JSON.stringify(j, null, 2) + "\n");
  console.log(`${s.to}: 비교 ${s.rows.length}행, 신뢰 카드 ${s.trust.length}장`);
}
