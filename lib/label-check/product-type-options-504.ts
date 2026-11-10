/**
 * 504/506 — UI 제품 유형 옵션(클라이언트 안전: fs 없음).
 */
export const PRODUCT_TYPE_OPTIONS_504: Array<{ id: string; label: string; noteKey: string }> = [
  { id: "scrub", label: "스크럽", noteKey: "스크럽" },
  { id: "pack", label: "팩", noteKey: "팩" },
  { id: "shampoo", label: "샴푸", noteKey: "샴푸" },
  { id: "vulva", label: "외음부세정제", noteKey: "외음부" },
  { id: "softener", label: "손발연화", noteKey: "손·발" },
  { id: "deodorant", label: "체취방지", noteKey: "체취" },
  { id: "spray_sunscreen", label: "분무형 자외선차단", noteKey: "분무형 자외선" },
  { id: "aerosol", label: "에어로졸", noteKey: "에어로졸" },
  /** 506 — 광고 예외(색조 화장용 제품류) */
  { id: "color_makeup", label: "색조", noteKey: "색조" },
  /** 513 — 게이팅용(유형 주의사항 note 매칭 방지: noteKey는 id) */
  { id: "export_only", label: "수출 전용", noteKey: "export_only" },
  { id: "set_product", label: "세트 상품", noteKey: "set_product" },
  { id: "soap", label: "비누", noteKey: "soap" },
  { id: "professional", label: "전문가용(미국)", noteKey: "professional" },
  { id: "hazardous", label: "에어로졸·위험 제품(미국)", noteKey: "hazardous" },
];
