/**
 * 436차 1-1 — 제품 유형(아키타입) 판별기. 규칙 기반(키워드 점수)이며 모델·유료 호출이 없다.
 *
 * 쓸 수 있는 신호(저장 세션·폼 입력 조사 결과):
 *  ┌────────────────┬──────────────────────────────┬──────────────────────────────────────────┐
 *  │ 신호           │ 출처                         │ 쓰임                                     │
 *  ├────────────────┼──────────────────────────────┼──────────────────────────────────────────┤
 *  │ 카테고리       │ 폼 선택(category)            │ 대분류 5(뷰티·패션·전자·식품·생활/반려)  │
 *  │ 상품명         │ productName                  │ 세부 유형 키워드(가중 ×3)                │
 *  │ 핵심 키워드    │ keyFeatures·targetCustomer   │ 세부 유형 키워드(가중 ×1)                │
 *  │ 성분/원재료    │ ingredients 유무·개수        │ 뷰티 스킨케어·이너뷰티, 식품 보조 신호   │
 *  │ 사이즈 정보    │ productSizeHint·productHeightCm │ 패션·생활 보조 신호                   │
 *  │ 인증           │ certifications               │ 보조(판별에는 쓰지 않음)                 │
 *  │ 사진 수        │ imageUrls                    │ 신뢰도 보정은 하지 않음(기록만)          │
 *  └────────────────┴──────────────────────────────┴──────────────────────────────────────────┘
 * 결과가 모호하면(점수 부족·동점) 세부 유형을 정하지 않고 대분류만 남긴 기본 아키타입(id "default")으로 돌려준다 —
 * 판별 오류가 이상한 페이지가 되지 않도록 신뢰도가 낮으면 현재 구성이 그대로 유지된다.
 */

/** 기본 켬. 끄려면 NEXT_PUBLIC_ARCHETYPE_V1=off 로 서버를 시작한다(435차와 같은 화면) */
export const ARCHETYPE_V1_ENABLED = process.env.NEXT_PUBLIC_ARCHETYPE_V1 !== "off";

export type ArchetypeGroup = "beauty" | "fashion" | "tech" | "food" | "living";
export type ArchetypeId =
  | "default"
  | "beauty-skincare" | "beauty-makeup" | "beauty-hairbody" | "beauty-inner"
  | "fashion-top" | "fashion-bottom" | "fashion-outer" | "fashion-dress" | "fashion-acc"
  | "tech-mobile" | "tech-appliance" | "tech-peripheral"
  | "food-meal" | "food-snack"
  | "living-home" | "living-petkids";

export const ARCHETYPE_IDS: readonly Exclude<ArchetypeId, "default">[] = [
  "beauty-skincare", "beauty-makeup", "beauty-hairbody", "beauty-inner",
  "fashion-top", "fashion-bottom", "fashion-outer", "fashion-dress", "fashion-acc",
  "tech-mobile", "tech-appliance", "tech-peripheral",
  "food-meal", "food-snack",
  "living-home", "living-petkids",
];

export const ARCHETYPE_LABEL: Record<ArchetypeId, string> = {
  default: "기본(유형 미정)",
  "beauty-skincare": "뷰티·스킨케어", "beauty-makeup": "뷰티·메이크업", "beauty-hairbody": "뷰티·헤어·바디", "beauty-inner": "뷰티·이너뷰티",
  "fashion-top": "패션·상의", "fashion-bottom": "패션·하의", "fashion-outer": "패션·아우터", "fashion-dress": "패션·원피스", "fashion-acc": "패션·잡화",
  "tech-mobile": "전자·모바일/오디오", "tech-appliance": "전자·생활 가전", "tech-peripheral": "전자·주변기기",
  "food-meal": "식품·간편식/신선", "food-snack": "식품·간식/음료/건강기능",
  "living-home": "생활·수납/주방", "living-petkids": "반려·유아",
};

export type ArchetypeInput = {
  category?: string | null;
  productName?: string | null;
  brandName?: string | null;
  keyFeatures?: string | null;
  targetCustomer?: string | null;
  ingredients?: string | null;
  productSizeHint?: string | null;
  productHeightCm?: number | string | null;
  imageCount?: number;
};

export type ArchetypeResult = {
  id: ArchetypeId;
  group: ArchetypeGroup | null;
  /** 0~1 — 1등 점수 비율과 절대 점수로 정한다 */
  confidence: number;
  /** 판별에 쓴 신호(보고서 표용) */
  signals: string[];
  /** true면 세부 유형을 정하지 못해 현재 구성(기본)을 유지한다 */
  fallback: boolean;
};

export function groupOfCategory(category: string | null | undefined): ArchetypeGroup | null {
  const c = (category ?? "").trim();
  if (/뷰티|화장품/.test(c)) return "beauty";
  if (/패션|의류/.test(c)) return "fashion";
  if (/전자|가전/.test(c)) return "tech";
  if (/식품|건강/.test(c)) return "food";
  if (/생활|리빙|반려|유아|펫/.test(c)) return "living";
  return null;
}

/** 세부 유형별 키워드(이름·핵심 키워드에서 센다). 순서는 같은 점수일 때의 우선순위 */
const RULES: Record<ArchetypeGroup, Array<[Exclude<ArchetypeId, "default">, RegExp]>> = {
  beauty: [
    ["beauty-makeup", /립|틴트|쿠션|파운데이션|섀도|블러셔|마스카라|아이라이너|컨실러|립스틱|하이라이터|브로우|발색|호수|컬러|색상/],
    ["beauty-inner", /이너뷰티|콜라겐|섭취|캡슐|정제|스틱 ?포|먹는|건강기능|비타민|유산균/],
    ["beauty-hairbody", /샴푸|트리트먼트|컨디셔너|헤어|두피|바디|핸드크림|풋|입욕|제모|향수|데오/],
    ["beauty-skincare", /에센스|세럼|앰플|크림|토너|스킨|미스트|로션|클렌징|클렌저|마스크|선크림|선케어|수분|보습|패드|아이크림|진정|장벽/],
  ],
  fashion: [
    ["fashion-dress", /원피스|드레스|점프수트|롬퍼/],
    ["fashion-outer", /자켓|재킷|코트|패딩|점퍼|가디건|아우터|바람막이|트렌치|무스탕|야상|집업|베스트|조끼/],
    ["fashion-bottom", /바지|팬츠|슬랙스|데님|청바지|스커트|치마|레깅스|조거|반바지|쇼츠/],
    ["fashion-acc", /가방|백팩|토트|크로스백|신발|스니커즈|구두|로퍼|샌들|부츠|목걸이|귀걸이|반지|팔찌|모자|벨트|양말|스카프|지갑|안경|시계/],
    ["fashion-top", /티셔츠|셔츠|니트|맨투맨|후드|블라우스|탑|스웨터|반팔|긴팔|티\b|폴로|나시|카라/],
  ],
  tech: [
    ["tech-mobile", /이어버드|이어폰|헤드폰|헤드셋|스피커|충전기|케이블|보조배터리|케이스|거치대|블루투스|스마트폰|워치|ANC|무선충전|코덱|이어훅/],
    ["tech-appliance", /청소기|공기청정기|가습기|제습기|에어프라이어|선풍기|히터|밥솥|믹서|건조기|전기|드라이어|마사지기|정수기|토스터|커피머신/],
    ["tech-peripheral", /키보드|마우스|모니터|웹캠|USB|허브|SSD|프린터|라우터|메모리|HDMI|도킹|태블릿 ?거치|스탠드/],
  ],
  food: [
    ["food-meal", /밀키트|도시락|간편식|국|찌개|반찬|김치|냉동|즉석|신선|정육|과일|쌀|채소|생선|고기|라면|면|소스|조리/],
    ["food-snack", /과자|간식|음료|커피|차\b|젤리|초콜릿|견과|영양제|비타민|프로바이오틱스|건강기능|단백질|프로틴|스낵|쿠키|바/],
  ],
  living: [
    ["living-petkids", /강아지|고양이|반려|사료|펫|유아|아기|베이비|장난감|아동|키즈|배변/],
    ["living-home", /수납|정리|선반|바구니|주방|냄비|프라이팬|식기|컵|텀블러|침구|베개|조명|욕실|청소|행거|서랍|매트|커튼|밀폐/],
  ],
};

/** 대분류만 알 때의 기본 세부 유형이 없다는 뜻으로 쓰는 임계값 */
export const ARCHETYPE_MIN_SCORE = 3;
export const ARCHETYPE_MIN_CONFIDENCE = 0.45;

const count = (text: string, re: RegExp): number => {
  const g = new RegExp(re.source, "g");
  return text.match(g)?.length ?? 0;
};

export function detectArchetype(input: ArchetypeInput): ArchetypeResult {
  const group = groupOfCategory(input.category);
  const base: ArchetypeResult = { id: "default", group, confidence: 0, signals: [], fallback: true };
  if (!group) return { ...base, signals: ["카테고리 불명"] };
  const name = `${input.productName ?? ""} ${input.brandName ?? ""}`;
  const feat = `${input.keyFeatures ?? ""} ${input.targetCustomer ?? ""}`;
  const scores = RULES[group].map(([id, re]) => ({ id, score: count(name, re) * 4 + count(feat, re) * 0.5, re }));
  // 보조 신호: 성분 목록이 있으면 스킨케어·이너뷰티에, 사이즈 정보가 있으면 패션에 소폭 가산(세부 유형을 뒤집지는 못하는 크기)
  const ing = (input.ingredients ?? "").trim();
  const hasSize = Boolean((input.productSizeHint ?? "").trim() || input.productHeightCm);
  const sig: string[] = [`카테고리=${input.category}`];
  for (const s of scores) {
    if (group === "beauty" && ing && (s.id === "beauty-skincare" || s.id === "beauty-inner") && s.score > 0) s.score += 1;
    if (group === "fashion" && hasSize && s.score > 0) s.score += 0.5;
  }
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const top = sorted[0]!;
  if (top.score < ARCHETYPE_MIN_SCORE) return { ...base, signals: [...sig, `최고점 ${top.score} < ${ARCHETYPE_MIN_SCORE}`] };
  const second = sorted[1];
  // 1등과 2등의 격차 × 절대 점수(이름 한 번 일치 = 4점이면 충분). 동점이면 규칙 순서(더 구체적인 유형)가 앞선다
  const confidence = (top.score / (top.score + (second?.score ?? 0))) * Math.min(1, top.score / 4);
  const hit = (txt: string) => txt.match(new RegExp(top.re.source, "g"))?.slice(0, 3).join("·");
  sig.push(`이름: ${hit(name) ?? "-"}`, `키워드: ${hit(feat) ?? "-"}`);
  if (ing) sig.push("성분 있음");
  if (hasSize) sig.push("사이즈 정보 있음");
  if (confidence < ARCHETYPE_MIN_CONFIDENCE) return { ...base, confidence, signals: [...sig, `신뢰도 ${confidence.toFixed(2)} < ${ARCHETYPE_MIN_CONFIDENCE}`] };
  return { id: top.id, group, confidence: +confidence.toFixed(2), signals: sig, fallback: false };
}
