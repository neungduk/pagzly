/**
 * 514/515 — 랜딩 제품 화면·문구 띠 데모 데이터(하드코딩은 여기만).
 * TASK_512 카드 구조: 이 문장 → 이렇게.
 *
 * 515: 띠·카드의 `before`/`caught`는 걸린 문구 예시라 의도적으로 문제 표현을 담을 수 있음.
 * 금지어 검사는 `after` 등 대체 문구에만 적용한다.
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

export type LandingBeltChip515 = {
  /** 걸린 문구 예시(금지어 검사 제외) */
  caught: string;
  kind: "fix" | "check" | "ok";
  badge: string;
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
    kind: "check",
    badge: "확인할 것",
    title: "효능 표현을 한 번 더 보세요",
    body: "「피부 재생」 등 표현이 기능성 인정 범위와 맞는지 확인하세요.",
  },
  {
    kind: "ok",
    badge: "문제 없음",
    title: "",
    body: "제품명 · 내용량 · 제조번호 · 알레르기 유발 성분 표시 확인",
  },
];

/** 떠 있는 칩·요약용 — 카드 kind 실측 */
export function landingDemoChipCounts514(): { fix: number; check: number; ok: number } {
  let fix = 0;
  let check = 0;
  let ok = 0;
  for (const c of LANDING_DEMO_CARDS_514) {
    if (c.kind === "fix") fix += 1;
    else if (c.kind === "check") check += 1;
    else ok += 1;
  }
  return { fix, check, ok };
}

const _chip = landingDemoChipCounts514();
export const LANDING_DEMO_SUMMARY_514 = `고칠 것 ${_chip.fix} · 확인할 것 ${_chip.check}`;

export const LANDING_DEMO_DISCLAIMER_514 =
  "예시 문구입니다 · 법적 판단이 아닙니다";

export const LANDING_BEFORE_AFTER_514 = {
  before: "피부 재생을 완전히 시켜 줍니다",
  after: "피부 탄력 개선에 도움을 줍니다",
  note: "예시 문구입니다. 제품 인정 범위에 맞게 쓰세요. 법적 판단이 아닙니다.",
};

/** 515 — 문구 띠(가상 예시만). caught는 걸린 문구. */
export const LANDING_BELT_CHIPS_515: LandingBeltChip515[] = [
  { caught: "피부 주름을 완전히 없애 주는", kind: "fix", badge: "고칠 것" },
  { caught: "사용기한 표기 없음", kind: "check", badge: "확인할 것" },
  { caught: "내용량 30 ml", kind: "ok", badge: "문제 없음" },
  { caught: "여드름 완치", kind: "fix", badge: "고칠 것" },
  { caught: "리날룰, 리모넨 포함", kind: "check", badge: "확인할 것" },
  { caught: "제조번호 LOT 2411A", kind: "ok", badge: "문제 없음" },
  { caught: "Reduces wrinkles permanently", kind: "fix", badge: "고칠 것" },
  { caught: "Net Wt. 1 fl oz", kind: "ok", badge: "문제 없음" },
];

export const LANDING_BELT_NOTE_515 = "예시 문구입니다";

/** 519 — 무대 태그·결과 줄(UI 카피). caught는 라벨 문구 예시라 금지어 검사 제외. */
export type LandingStageTag519 = {
  id: string;
  /** 라벨에 붙는 걸린 문구 키(표시용 아님) */
  anchor: "bad" | "warn" | "expiry" | "ingredients";
  kind: "fix" | "check" | "ok";
  label: string;
  /** 결과 카드 줄 제목 */
  rowTitle: string;
  rowBody?: string;
  before?: string;
  beforeEm?: string;
  after?: string;
  afterNote?: string;
};

export const LANDING_STAGE_TAGS_519: LandingStageTag519[] = [
  {
    id: "t1",
    anchor: "bad",
    kind: "fix",
    label: "고칠 것",
    rowTitle: "치료·완치를 암시하는 표현",
    before: "피부 주름을 완전히 없애 주는 앰플",
    beforeEm: "완전히 없애 주는",
    after: "피부 주름 개선에 도움을 줍니다",
    afterNote: "(기능성 인정 제품일 때)",
  },
  {
    id: "t2",
    anchor: "warn",
    kind: "check",
    label: "확인할 것",
    rowTitle: "효능 표현을 한 번 더 보세요",
    rowBody: "「피부 재생」 등 표현이 기능성 인정 범위와 맞는지 확인하세요.",
  },
  {
    id: "t3",
    anchor: "expiry",
    kind: "check",
    label: "확인할 것 · 사용기한",
    rowTitle: "사용기한이 보이지 않아요",
    rowBody: '개봉 후 사용기간 또는 "사용기한: 0000.00.00"을 넣어 주세요.',
  },
];

export const LANDING_STAGE_OK_TAG_519: LandingStageTag519 = {
  id: "t4",
  anchor: "ingredients",
  kind: "ok",
  label: "문제 없음",
  rowTitle: "전성분 · 제조번호 표시 확인",
};

export const LANDING_STAGE_FOOT_519 =
  "예시 화면입니다 · 실제 결과는 올린 파일에 따라 달라집니다";

export const LANDING_STAGE_LEGAL_519 = "법적 판단이 아닌 사전 점검 도구입니다";

export const LANDING_STAGE_LEAD_519 =
  "화장품 라벨 사진이나 상세페이지 PDF를 올리면, 고칠 문구와 빠진 표시사항을 근거와 함께 보여 드립니다. 고쳐 쓴 문구 예시도 함께 나옵니다.";

/** 519 — 하단 '고친 문장' 쪽지 데모. before는 걸린 문구 예시(금지어 검사 제외), after에는 금지어를 쓰지 않는다. */
export type LandingFixPair519 = { before: string; beforeEm: string; after: string; note: string };
export const LANDING_FIX_PAIRS_519: LandingFixPair519[] = [
  {
    before: "피부 재생을 완전히 시켜 줍니다",
    beforeEm: "완전히 시켜 줍니다",
    after: "피부 탄력 개선에 도움을 줍니다",
    note: "기능성 인정 범위 안에서 쓰는 문장으로",
  },
  {
    before: "여드름이 완치되는 크림",
    beforeEm: "완치되는",
    after: "여드름성 피부 완화에 도움을 주는 크림",
    note: "치료·완치 표현을 빼고 도움을 주는 말로",
  },
  {
    before: "사용기한 표기 없음",
    beforeEm: "표기 없음",
    after: "개봉 후 사용기간 12개월",
    note: "빠진 표시사항은 넣을 문구까지 예시로",
  },
];

export const LANDING_FIX_STAMP_519 = "고쳐 쓴 문장";
export const LANDING_FINALE_STEPS_519 = [
  { no: "01", title: "올리기", body: "PDF · 사진 · 문구 중 하나" },
  { no: "02", title: "읽은 글자 확인", body: "잘못 읽은 곳은 바로 고치기" },
  { no: "03", title: "고칠 곳 보기", body: "근거와 고쳐 쓴 문구 예시" },
] as const;
