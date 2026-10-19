/**
 * 회귀 — 407차 패션 표 뼈대 행(소재·색상·세탁방법)을 입력으로 채우는 폴백. 유료 호출 0.
 * 입력에 근거가 없으면 지금처럼 "판매자 확인 필요". 다른 카테고리 표는 붙여넣기 블록이 있어도 그대로.
 */
import { enrichSpecTableSection, extractLabeledValue } from "../../lib/enrich-product-sections";
import type { DetailSection } from "../../lib/types/generate";

export const name = "패션 표 뼈대 입력 폴백(소재·색상·세탁)";

/** 404차 입력(review/402-input/fashion/product-info.txt)을 live-one이 붙여넣기 칸에 넣는 형식 그대로 */
const PASTED_404 = [
  "[타깃 고객]\n기본 흰 티를 자주 사는 20~30대, 데일리 미니멀 룩을 선호하는 분",
  "[사이즈별 실측표]\n단위 cm\nS: 총장 68 / 어깨너비 50 / 가슴단면 54 / 소매길이 21\nXL: 총장 74 / 어깨너비 56 / 가슴단면 60 / 소매길이 24",
  "[모델 정보]\n여성 모델 168cm·52kg, M 착용",
  "[핏]\n세미오버핏, 드롭숄더",
  "[색상 옵션]\n화이트 (단일 색상)",
  "[세탁·관리]\n찬물 단독 손세탁 또는 세탁망 사용 울코스 권장, 표백제 사용 금지",
  "[배송·교환·반품]\n평일 오후 2시 이전 주문 시 당일 출고",
].join("\n\n");
const INGREDIENTS_404 = "면 100% (싱글 저지, 20수)";

/** 404차 생성 결과처럼 모델이 사이즈 행만 채운 표 */
const sizeTable = {
  type: "spec_table",
  slot: "size_table",
  heading: "사이즈 실측표",
  rows: [
    { label: "S", value: "총장 68 · 어깨 50 · 가슴 54 · 소매 21 cm" },
    { label: "M", value: "총장 70 · 어깨 52 · 가슴 56 · 소매 22 cm" },
  ],
} as unknown as DetailSection & { type: "spec_table" };

const rowsOf = (category: string, meta: Parameters<typeof enrichSpecTableSection>[2]) =>
  (enrichSpecTableSection(sizeTable, category, meta) as { rows: { label: string; value: string }[] }).rows;
const valueOf = (rows: { label: string; value: string }[], label: string) => rows.find((r) => r.label === label)?.value;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const P = "판매자 확인 필요";
  // 404차 입력: 세 칸 모두 입력 값
  const full = rowsOf("의류/패션", { brandName: "모아웨어", ingredients: INGREDIENTS_404, pastedText: PASTED_404 });
  if (valueOf(full, "소재") !== INGREDIENTS_404) fails.push(`소재: ${valueOf(full, "소재")}`);
  if (valueOf(full, "색상") !== "화이트 (단일 색상)") fails.push(`색상: ${valueOf(full, "색상")}`);
  if (!valueOf(full, "세탁방법")?.startsWith("찬물 단독 손세탁")) fails.push(`세탁방법: ${valueOf(full, "세탁방법")}`);
  for (const l of ["제조사", "제조국"]) if (valueOf(full, l) !== P) fails.push(`${l}가 입력 없이 채워짐: ${valueOf(full, l)}`);
  // 근거 없는 입력: 지금처럼 확인 필요
  const none = rowsOf("의류/패션", { brandName: "b" });
  for (const l of ["소재", "색상", "세탁방법"]) if (valueOf(none, l) !== P) fails.push(`근거 없는데 ${l} = ${valueOf(none, l)}`);
  // 일부만 있는 입력: 소재만
  const part = rowsOf("의류/패션", { ingredients: "폴리 100%", pastedText: "[핏]\n오버핏\n[모델 정보]\n색상이 화면과 다를 수 있음" });
  if (valueOf(part, "소재") !== "폴리 100%" || valueOf(part, "색상") !== P || valueOf(part, "세탁방법") !== P) {
    fails.push(`부분 입력: 소재 ${valueOf(part, "소재")} / 색상 ${valueOf(part, "색상")} / 세탁 ${valueOf(part, "세탁방법")}`);
  }
  // 한 줄 형식, URL 붙여넣기
  if (extractLabeledValue("상품명: 티\n색상: 블랙, 네이비\n세탁: 드라이클리닝", /^(색상|컬러)(\s*옵션)?$/) !== "블랙, 네이비") fails.push("한 줄 형식 색상 추출 실패");
  if (extractLabeledValue("https://example.com/item?색상: 블랙", /^(색상|컬러)(\s*옵션)?$/) !== null) fails.push("URL에서 값을 꺼냄");
  if (extractLabeledValue("이 티는 색상이 예뻐요", /^(색상|컬러)(\s*옵션)?$/) !== null) fails.push("라벨 없는 문장에서 값을 꺼냄(추측)");
  // 모델이 행을 채웠으면 그 값을 쓴다
  const filled = enrichSpecTableSection(
    { ...sizeTable, rows: [...sizeTable.rows, { label: "색상", value: "아이보리" }] } as typeof sizeTable,
    "의류/패션",
    { pastedText: PASTED_404 },
  ) as { rows: { label: string; value: string }[] };
  if (valueOf(filled.rows, "색상") !== "아이보리") fails.push("모델이 채운 값이 폴백에 덮임");
  // 다른 카테고리: 붙여넣기·소재가 있어도 표가 그대로
  for (const category of ["화장품/뷰티", "전자제품", "식품/건강기능식품", "생활/리빙", "반려동물"]) {
    const a = JSON.stringify(rowsOf(category, { brandName: "b", ingredients: INGREDIENTS_404 }));
    const b = JSON.stringify(rowsOf(category, { brandName: "b", ingredients: INGREDIENTS_404, pastedText: PASTED_404 }));
    if (a !== b) fails.push(`${category} 표가 붙여넣기 블록 때문에 바뀜`);
  }
  return fails;
}
