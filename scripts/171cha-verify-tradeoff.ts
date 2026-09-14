/**
 * 171차 — tradeoff_card 6카테고리 슬롯 + 네이티브 채움/생략 검증 (유료 API 0)
 */
import {
  buildSectionLengthGuide,
  getSlotTemplate,
} from "../lib/section-templates";
import { buildNativeFixtureSections } from "./169cha-native-fixture-sections";

const CATS = [
  "화장품/뷰티",
  "의류/패션",
  "식품/건강기능식품",
  "전자제품",
  "생활용품",
  "반려동물",
] as const;

let failed = false;

for (const cat of CATS) {
  const has = getSlotTemplate(cat, "long").some((s) => s.type === "tradeoff_card");
  const guide = buildSectionLengthGuide(cat).includes("tradeoff_card");
  console.log(JSON.stringify({ cat, slot: has, guide }));
  if (!has || !guide) failed = true;
}

const withHint = buildNativeFixtureSections({
  formCategory: "의류/패션",
  productName: "티셔츠",
  brandName: "X",
  keyFeatures:
    "면 100%, 신축성 12%. 이런 분께 추천: 루즈핏. 이런 점은 확인 후 구매: 슬림핏은 사이즈 다운.",
  ingredients: "코튼",
  certifications: "OEKO-TEX",
  targetCustomer: "20대",
});
const withoutHint = buildNativeFixtureSections({
  formCategory: "의류/패션",
  productName: "티셔츠",
  brandName: "X",
  keyFeatures: "면 100%, 신축성 12%, 세탁 후 수축률 2% 이내",
  ingredients: "코튼",
  certifications: "OEKO-TEX",
  targetCustomer: "20대",
});

const fill = withHint.some((s) => s.type === "tradeoff_card");
const omit = !withoutHint.some((s) => s.type === "tradeoff_card");
console.log(JSON.stringify({ nativeFillWithHint: fill, nativeOmitWithoutHint: omit }));
if (!fill || !omit) failed = true;

if (failed) {
  console.error("[171] tradeoff verify FAILED");
  process.exit(1);
}
console.log("[171] tradeoff verify OK");
