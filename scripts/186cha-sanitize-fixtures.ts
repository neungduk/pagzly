/**
 * 186차 — 139 픽스처 잔여 뷰티 오염 필드 정리 + electronics chart 커버리지 assert.
 * keyFeatures는 168/169에서 이미 카테고리화됨. wholesaleUrl·conceptBrief·legacy copy 필드를 맞춤.
 *   npx tsx scripts/186cha-sanitize-fixtures.ts
 * 생성 API 0.
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");

type CopyPatch = {
  wholesaleUrl: null;
  conceptBrief: {
    theme: string;
    motif_keywords: string[];
    mood: string;
    backdrop_hint: string;
    copy_tone: string;
    decor_prompt: string;
    icon_style: string;
  };
  headlines: string[];
  description: string;
  features: string[];
  howToUse: string;
  caution: string;
};

const BEAUTY_POLLUTION =
  /히알루론|보습|저자극|메이크업|워터리|세럼|속당김|물방울|수분\/물방울|Light Water/i;

const COPIES: Record<string, CopyPatch> = {
  fashion: {
    wholesaleUrl: null,
    conceptBrief: {
      theme: "미니멀 코튼",
      motif_keywords: ["면 텍스처", "오버사이즈 실루엣", "뉴트럴 톤", "데일리"],
      mood: "담백하고 정돈된",
      backdrop_hint: "soft daylight, linen texture backdrop, empty apparel studio, no mannequin face",
      copy_tone: "핏·원단 사실 중심. 과장 없는 데일리 웨어 톤.",
      decor_prompt: "soft cotton weave texture, neutral studio light, no text, no product logo",
      icon_style: "minimal apparel badge icon, soft circular frame",
    },
    headlines: [
      "매일 입기 좋은 오버사이즈 코튼",
      "면 100%, 부담 없는 루즈핏",
      "세탁 후에도 형태가 안정적",
    ],
    description:
      "에센셜 오버사이즈 코튼 티셔츠는 면 100% 원단과 루즈한 실루엣으로 데일리 착용에 맞춘 기본 티입니다. 신축성·수축률 수치를 기준으로 핏을 고를 수 있습니다.",
    features: ["면 100%", "신축성 12%", "세탁 후 수축률 2% 이내", "오버사이즈 핏", "원단 210g/yd"],
    howToUse: "단독 또는 레이어드로 착용하세요. 슬림핏을 원하면 한 사이즈 다운을 권장합니다.",
    caution: "세탁 가이드를 확인하세요. 표백제 사용은 피하고, 그늘에서 건조하는 것을 권장합니다.",
  },
  "fashion-omit": {
    wholesaleUrl: null,
    conceptBrief: {
      theme: "미니멀 코튼",
      motif_keywords: ["면 텍스처", "오버사이즈 실루엣", "뉴트럴 톤"],
      mood: "담백하고 정돈된",
      backdrop_hint: "soft daylight, linen texture backdrop, empty apparel studio",
      copy_tone: "핏·원단 사실 중심.",
      decor_prompt: "soft cotton weave texture, neutral studio light, no text",
      icon_style: "minimal apparel badge icon",
    },
    headlines: ["기본에 가까운 오버사이즈 티", "면 100% 데일리 핏", "수치로 고르는 사이즈감"],
    description:
      "에센셜 오버사이즈 코튼 티셔츠 — 면 100%·오버사이즈 핏 중심의 기본 티셔츠 픽스처입니다.",
    features: ["면 100%", "신축성 12%", "오버사이즈 핏"],
    howToUse: "데일리로 착용하세요.",
    caution: "세탁 라벨을 확인해 주세요.",
  },
  food: {
    wholesaleUrl: null,
    conceptBrief: {
      theme: "집밥 간편식",
      motif_keywords: ["메밀면", "들기름", "따뜻한 면", "키친"],
      mood: "담백하고 든든한",
      backdrop_hint: "warm kitchen light, empty table surface, soft steam mood, no plated dish",
      copy_tone: "함량·조리 시간 사실 중심. 과장 없는 집밥 톤.",
      decor_prompt: "soft grain texture, warm cream light, no text, no logo",
      icon_style: "minimal bowl and noodle badge icon",
    },
    headlines: [
      "3분이면 준비되는 메밀 우동",
      "단백질·나트륨 수치가 보이는 세트",
      "들기름 향이 남는 집밥 한 그릇",
    ],
    description:
      "들기름 메밀 우동 세트는 메밀면 단백질 8g/1인분, 나트륨 480mg, 조리 3분 기준의 2인분 간편식입니다. 알레르기 원료는 성분표를 확인하세요.",
    features: ["메밀면 단백질 8g/1인분", "나트륨 480mg", "조리 3분", "2인분 세트", "들기름 함량 표기"],
    howToUse: "면을 삶아 들기름·소스를 섞어 드세요. 개봉 후 냉장 보관을 권장합니다.",
    caution: "밀 알레르기가 있으면 성분표를 확인하세요. 직사광선을 피해 보관하세요.",
  },
  electronics: {
    wholesaleUrl: null,
    conceptBrief: {
      theme: "집중용 ANC",
      motif_keywords: ["노이즈캔슬링", "이어훅", "배터리", "출퇴근"],
      mood: "차분하고 기술적인",
      backdrop_hint: "cool studio gradient, soft product pedestal, empty desk, no UI chrome",
      copy_tone: "dB·배터리·코덱 수치 중심. 과장 없는 스펙 톤.",
      decor_prompt: "soft tech grain, cool gray light, no text, no logo",
      icon_style: "minimal headphone badge icon",
    },
    headlines: [
      "하이브리드 ANC 42dB",
      "이어훅으로 오래 쓰는 집중용 이어버드",
      "케이스 포함 36시간 배터리",
    ],
    description:
      "무선 노이즈캔슬링 헤드폰(이어버드)은 하이브리드 ANC 42dB, LDAC·AAC, 이어버드 9시간·케이스 포함 36시간, IPX5를 입력 기준으로 둔 전자 픽스처입니다.",
    features: [
      "하이브리드 ANC 42dB",
      "배터리 9h / 케이스 포함 36h",
      "LDAC·AAC",
      "IPX5",
      "멀티포인트 2기기",
    ],
    howToUse: "충전 후 페어링하고 ANC를 켜 사용하세요. 앱 기능은 OS별로 다를 수 있습니다.",
    caution: "청력 보호를 위해 과도한 볼륨을 피하세요. 방수 등급 이상의 침수는 보증 대상이 아닙니다.",
  },
  living: {
    wholesaleUrl: null,
    conceptBrief: {
      theme: "무광 테이블웨어",
      motif_keywords: ["세라믹", "머그", "무광", "아침 루틴"],
      mood: "고요하고 따뜻한",
      backdrop_hint: "soft window light, empty ceramic surface, no food props",
      copy_tone: "용량·내열·무게 사실 중심.",
      decor_prompt: "matte ceramic texture, warm daylight, no text",
      icon_style: "minimal mug badge icon",
    },
    headlines: ["손에 감기는 350mL 머그", "내열 120℃, 식기세척기 가능", "매일 아침용 무광 세라믹"],
    description:
      "플레인 세라믹 머그는 350mL·280g·내열 120℃ 기준으로 아침 커피·티 루틴에 맞춘 리빙 픽스처입니다.",
    features: ["내열 120℃", "용량 350mL", "무게 280g", "식기세척기 가능", "무연 유약"],
    howToUse: "뜨거운 음료를 담아 사용하세요. 전자레인지 사용은 손잡이 접합부 기준으로 피하세요.",
    caution: "급격한 온도 변화는 파손 위험이 있습니다. 충격에 주의하세요.",
  },
  pet: {
    wholesaleUrl: null,
    conceptBrief: {
      theme: "데일리 소프트 사료",
      motif_keywords: ["단백질", "수분", "급여 가이드"],
      mood: "신뢰감 있고 담백한",
      backdrop_hint: "soft natural light, empty pet-food studio surface, no animal face",
      copy_tone: "조단백질·수분 수치 중심. 질병 치료 단정 금지.",
      decor_prompt: "soft kibble texture hint, warm light, no text",
      icon_style: "minimal paw badge icon",
    },
    headlines: ["조단백질 28% 데일리 소프트", "수분 10% 표기 사료", "급여 가이드가 보이는 구성"],
    description:
      "데일리 소프트 독 사료는 조단백질 28%·수분 10% 입력 기준의 반려동물 픽스처입니다. 질환이 있으면 수의사 상담 후 급여하세요.",
    features: ["조단백질 28%", "수분 10%", "동물성 원료 표기", "자견·성견 급여 가이드"],
    howToUse: "체중·연령에 맞는 급여량을 지켜 주세요. 신선한 물을 함께 제공하세요.",
    caution: "특정 질환·알레르기가 있으면 성분표를 확인하고 수의사와 상담하세요.",
  },
};

function sanitize(id: string) {
  const file = path.join(OUT, `139cha-session-${id}.json`);
  if (!fs.existsSync(file)) {
    console.log(JSON.stringify({ id, skipped: "missing" }));
    return;
  }
  const patch = COPIES[id];
  if (!patch) {
    console.log(JSON.stringify({ id, skipped: "no-patch" }));
    return;
  }
  const j = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  const generated = (j.generated ?? {}) as Record<string, unknown>;

  const beforeKf = String(j.keyFeatures ?? "");
  if (BEAUTY_POLLUTION.test(beforeKf) && id !== "cosmetics") {
    throw new Error(`[186] keyFeatures still polluted: ${id} → ${beforeKf.slice(0, 80)}`);
  }

  j.wholesaleUrl = patch.wholesaleUrl;
  j.conceptBrief = patch.conceptBrief;
  generated.headlines = patch.headlines;
  generated.description = patch.description;
  generated.features = patch.features;
  generated.howToUse = patch.howToUse;
  generated.caution = patch.caution;
  j.generated = generated;

  fs.writeFileSync(file, JSON.stringify(j), "utf8");

  const sections = (generated.sections as { type: string }[] | undefined) ?? [];
  const hasChart = sections.some((s) => s.type === "comparison_chart");
  console.log(
    JSON.stringify({
      id,
      sanitized: true,
      beautyKfPollution: BEAUTY_POLLUTION.test(String(j.keyFeatures ?? "")),
      hasChart,
      keyFeaturesHead: String(j.keyFeatures ?? "").slice(0, 80),
    }),
  );
}

for (const id of Object.keys(COPIES)) sanitize(id);

// electronics chart coverage (native fixture)
const elec = JSON.parse(
  fs.readFileSync(path.join(OUT, "139cha-session-electronics.json"), "utf8"),
) as { generated?: { sections?: { type: string; metrics?: unknown[] }[] } };
const chart = elec.generated?.sections?.find((s) => s.type === "comparison_chart");
if (!chart || !Array.isArray(chart.metrics) || chart.metrics.length < 2) {
  throw new Error("[186] electronics native fixture missing comparison_chart metrics");
}
console.log("[186] electronics comparison_chart OK metrics=", chart.metrics.length);

// delete unused legacy pexels session (no code references)
const legacy = path.join(OUT, "139cha-session-electronics-legacy-pexels.json");
if (fs.existsSync(legacy)) {
  fs.unlinkSync(legacy);
  console.log("[186] deleted", path.basename(legacy));
} else {
  console.log("[186] legacy already absent");
}

fs.mkdirSync(path.join(OUT, "186cha-export"), { recursive: true });
fs.writeFileSync(
  path.join(OUT, "186cha-export", "sanitize-summary.json"),
  JSON.stringify(
    {
      deletedLegacy: "139cha-session-electronics-legacy-pexels.json",
      sanitizedIds: Object.keys(COPIES),
      electronicsChartMetrics: chart.metrics.length,
    },
    null,
    2,
  ),
  "utf8",
);
