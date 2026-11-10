/**
 * 514 — 랜딩 제품 화면 데모 데이터(하드코딩은 여기만).
 * TASK_512 카드 구조: 이 문장 → 이렇게.
 */
export type LandingDemoCard514 = {
  kind: "fix" | "check" | "ok";
  badge: string;
  title: string;
  /** 이 문장 / 이렇게 — fix 카드만 */
  before?: string;
  beforeEm?: string;
  after?: string;
  afterNote?: string;
  body?: string;
};

export const LANDING_DEMO_FILE_514 = "라벨_뒷면_앰플30ml.pdf";
export const LANDING_DEMO_PRODUCT_514 = "비타 브라이트닝 앰플";
export const LANDING_DEMO_NET_514 = "내용량 30 ml";
export const LANDING_DEMO_INGREDIENTS_514 =
  "정제수, 글리세린, 아스코빅애시드, 부틸렌글라이콜, 나이아신아마이드, 1,2-헥산다이올, 향료, 리모넨";
export const LANDING_DEMO_LOT_514 = "LOT 2411A";

export const LANDING_DEMO_PHRASE_BAD_514 = "피부 주름을 완전히 없애 주는";
export const LANDING_DEMO_PHRASE_WARN_514 = "피부 재생";
export const LANDING_DEMO_EXPIRY_WARN_514 = "표기 없음";

export const LANDING_DEMO_CARDS_514: LandingDemoCard514[] = [
  {
    kind: "fix",
    badge: "고칠 것",
    title: "치료·완치를 암시하는 표현",
    before: "피부 주름을 완전히 없애 주는 앰플",
    beforeEm: "완전히 없애 주는",
    after: "피부 주름 개선에 도움을 줍니다",
    afterNote: "(기능성 인정 제품일 때)",
  },
  {
    kind: "check",
    badge: "확인할 것",
    title: "사용기한이 보이지 않아요",
    body: '개봉 후 사용기간 또는 "사용기한: 0000.00.00"을 넣어 주세요.',
  },
  {
    kind: "ok",
    badge: "문제 없음",
    title: "",
    body: "제품명 · 내용량 · 제조번호 · 알레르기 유발 성분 표시 확인",
  },
];

export const LANDING_DEMO_SUMMARY_514 = "고칠 것 1 · 확인할 것 2";

export const LANDING_DEMO_DISCLAIMER_514 =
  "예시 문구입니다 · 법적 판단이 아닙니다";

export const LANDING_BEFORE_AFTER_514 = {
  before: "피부 재생을 완전히 시켜 줍니다",
  after: "피부 탄력 개선에 도움을 줍니다",
  note: "예시 문구입니다. 제품 인정 범위에 맞게 쓰세요. 법적 판단이 아닙니다.",
};
