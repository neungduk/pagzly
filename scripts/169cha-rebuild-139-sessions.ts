/**
 * 169차 — fashion/food/living 세션 JSON을 카테고리 네이티브 섹션 트리로 재작성.
 * /api/generate·유료 API 없음. 139 빌더와 동일 필드 + buildNativeFixtureSections.
 */
import fs from "fs";
import path from "path";
import { getCategoryTheme } from "../lib/category-theme";
import { buildGenerationPipelineSummary } from "../lib/generation-pipeline-summary";
import { insertEmptyCanvasSection } from "../lib/section-inserts";
import {
  buildNativeFixtureSections,
  type NativeFixtureProduct,
} from "./169cha-native-fixture-sections";

const ROOT = path.join(__dirname, "..");
const BEAUTY_SESSION = path.join(ROOT, "review", "beauty-showcase-one", "session.json");
const OUT = path.join(ROOT, "review");

type SessionBlob = {
  generated?: {
    sections?: unknown[];
    theme?: { baseNeutral?: string };
    imageUrls?: string[];
    imageAnalysis?: string;
    category?: string;
    productName?: string;
    brandName?: string;
    photoCostBreakdown?: unknown;
  };
  category?: string;
  productName?: string;
  brandName?: string;
  keyFeatures?: string;
  ingredients?: string;
  certifications?: string;
  targetCustomer?: string;
  photoProcessingCost?: number;
  photoCostBreakdown?: unknown;
  backdropFailed?: boolean;
  pipelineSummary?: unknown;
  draftApproved?: boolean;
  [k: string]: unknown;
};

const PRODUCTS: Record<
  string,
  { sessionCategory: string; themeCategory: string; product: NativeFixtureProduct }
> = {
  fashion: {
    sessionCategory: "패션/의류",
    themeCategory: "의류/패션",
    product: {
      formCategory: "의류/패션",
      productName: "에센셜 오버사이즈 코튼 티셔츠",
      brandName: "NEUTRAL LINE",
      keyFeatures:
        "면 100%, 신축성 12%, 세탁 후 수축률 2% 이내, 오버사이즈 핏, 원단 중량 210g/yd. 이런 분께 추천: 루즈핏·데일리 룩을 원하는 분. 이런 점은 확인 후 구매: 슬림핏을 선호하면 한 사이즈 다운을 권장합니다.",
      ingredients: "코튼 100%",
      certifications: "OEKO-TEX Standard 100",
      targetCustomer: "데일리 미니멀 룩을 선호하는 20~30대",
      imageCount: 4,
    },
  },
  food: {
    sessionCategory: "식품",
    themeCategory: "식품/건강기능식품",
    product: {
      formCategory: "식품/건강기능식품",
      productName: "들기름 메밀 우동 세트",
      brandName: "한그릇 키친",
      keyFeatures:
        "메밀면 단백질 8g/1인분, 들기름 함량 표기, 나트륨 480mg, 조리 3분, 2인분 세트. 이런 분께 추천: 집밥 간편식을 찾는 직장인. 이런 점은 확인 후 구매: 밀 알레르기가 있으면 성분표를 확인하세요. 개봉 후 냉장 보관을 권장합니다.",
      ingredients: "메밀가루, 밀가루, 들기름, 소금",
      certifications: "HACCP",
      targetCustomer: "집밥·간편식을 찾는 직장인",
      imageCount: 4,
    },
  },
  living: {
    sessionCategory: "생활/리빙",
    themeCategory: "생활용품",
    product: {
      formCategory: "생활용품",
      productName: "플레인 세라믹 머그",
      brandName: "PLAIN HOME",
      keyFeatures:
        "내열 120℃, 용량 350mL, 무게 280g, 식기세척기 가능. 이런 분께 추천: 아침 커피·티 루틴을 즐기는 분. 이런 점은 확인 후 구매: 전자레인지 사용은 불가(손잡이 접합부).",
      ingredients: "도자기(세라믹), 무연 유약",
      certifications: "식품접촉기구 기준 적합",
      targetCustomer: "미니멀 테이블웨어를 선호하는 1~2인 가구",
      imageCount: 4,
    },
  },
  electronics: {
    sessionCategory: "전자/가전",
    themeCategory: "전자제품",
    product: {
      formCategory: "전자제품",
      productName: "무선 노이즈캔슬링 헤드폰",
      brandName: "NORA AUDIO",
      keyFeatures:
        "하이브리드 ANC 42dB, 오픈형 이어훅 설계로 장시간 착용 편안함, LDAC·AAC 듀얼 코덱, 배터리 이어버드 9시간·케이스 포함 36시간, IPX5 생활방수, 터치+앱 커스터마이즈, 멀티포인트 2기기 동시 연결. 이런 분께 추천: 출퇴근·카페에서 집중이 필요한 분. 이런 점은 확인 후 구매: iOS 전용 앱 기능 일부는 Android에서 제한될 수 있습니다.",
      ingredients:
        "드라이버 12mm 다이내믹, 블루투스 5.3, 충전 USB-C, 무게 이어버드 편당 5.8g, 컬러 미드나잇 블랙 / 클라우드 화이트",
      certifications: "KC 인증, 블루투스 SIG 인증, RoHS, 1년 무상 A/S, 30일 청음 만족 보장",
      targetCustomer: "출퇴근·재택에서 장시간 착용하는 20~30대",
      imageCount: 4,
    },
  },
  cosmetics: {
    sessionCategory: "화장품/뷰티",
    themeCategory: "화장품/뷰티",
    product: {
      formCategory: "화장품/뷰티",
      productName: "히알루론 워터리 세럼",
      brandName: "AURA LAB",
      keyFeatures:
        "히알루론산 3중 레이어 보습, 워터리 젤 제형, 무향·저자극. 이런 분께 추천: 민감성·속당김 피부를 케어하고 싶은 분. 이런 점은 확인 후 구매: 오일리 피부는 소량부터 테스트하세요.",
      ingredients: "히알루론산, 판테놀, 정제수",
      certifications: "저자극 테스트 완료",
      targetCustomer: "민감성 피부 20~30대",
      imageCount: 4,
    },
  },
  pet: {
    sessionCategory: "반려동물",
    themeCategory: "반려동물",
    product: {
      formCategory: "반려동물",
      productName: "데일리 소프트 독 사료",
      brandName: "PAW PLAIN",
      keyFeatures:
        "조단백질 28%, 수분 10%, 동물성 원료 표기, 자견·성견 급여 가이드. 이런 분께 추천: 데일리 소프트 사료를 찾는 보호자. 이런 점은 확인 후 구매: 특정 질환이 있으면 수의사 상담 후 급여를 권장합니다.",
      ingredients: "닭고기, 현미, 식물성 유지",
      certifications: "반려동물 사료 표시기준 적합",
      targetCustomer: "소형견 보호자",
      imageCount: 4,
    },
  },
  /** 생략 검증용 — 수치만 있고 추천/확인 후 구매 근거 없음 */
  "fashion-omit": {
    sessionCategory: "패션/의류",
    themeCategory: "의류/패션",
    product: {
      formCategory: "의류/패션",
      productName: "에센셜 오버사이즈 코튼 티셔츠",
      brandName: "NEUTRAL LINE",
      keyFeatures:
        "면 100%, 신축성 12%, 세탁 후 수축률 2% 이내, 오버사이즈 핏, 원단 중량 210g/yd",
      ingredients: "코튼 100%",
      certifications: "OEKO-TEX Standard 100",
      targetCustomer: "데일리 미니멀 룩을 선호하는 20~30대",
      imageCount: 4,
    },
  },
};

function rebuild(id: string) {
  const cfg = PRODUCTS[id];
  if (!cfg) throw new Error(`unknown id ${id}`);
  const session = JSON.parse(fs.readFileSync(BEAUTY_SESSION, "utf8")) as SessionBlob;
  const generated = session.generated;
  if (!generated) throw new Error("beauty session missing generated");
  const p = cfg.product;
  session.category = cfg.sessionCategory;
  generated.category = cfg.sessionCategory;
  generated.productName = p.productName;
  generated.brandName = p.brandName;
  session.productName = p.productName;
  session.brandName = p.brandName;
  session.keyFeatures = p.keyFeatures;
  session.ingredients = p.ingredients;
  session.certifications = p.certifications;
  session.targetCustomer = p.targetCustomer;
  // 뷰티 클론 테마를 카테고리 네이티브 팔레트로 교체 (3색 토큰 유지)
  generated.theme = getCategoryTheme(cfg.themeCategory);
  generated.sections = insertEmptyCanvasSection(
    buildNativeFixtureSections(p),
    generated.theme.baseNeutral || "#F5F1EA",
  );
  session.pipelineSummary = buildGenerationPipelineSummary({
    imageAnalysis: generated.imageAnalysis || "169cha native fixture",
    theme: generated.theme as never,
    photoProcessingCost: Number(session.photoProcessingCost) || 0,
    photoCostBreakdown: (session.photoCostBreakdown ??
      generated.photoCostBreakdown) as never,
    backdropFailed: Boolean(session.backdropFailed),
    sectionCount: generated.sections.length,
  });
  (session.pipelineSummary as { completedAt?: string }).completedAt = new Date().toISOString();
  session.draftApproved = true;
  const outPath = path.join(OUT, `139cha-session-${id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(session), "utf8");
  const types = (generated.sections as { type: string }[]).map((s) => s.type);
  console.log(
    JSON.stringify({
      id,
      sectionCount: types.length,
      hasStat: types.includes("stat_infographic"),
      hasChart: types.includes("comparison_chart"),
      hasTradeoff: types.includes("tradeoff_card"),
      types: types.slice(0, 24),
    }),
  );
}

if (!fs.existsSync(BEAUTY_SESSION)) {
  console.error("missing", BEAUTY_SESSION);
  process.exit(1);
}
for (const id of Object.keys(PRODUCTS)) rebuild(id);
console.log("[169/170] rebuilt native fixture sessions:", Object.keys(PRODUCTS).join(","));
