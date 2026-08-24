/**
 * 컨셉별 배경·합성 촬영 용어 템플릿.
 * 추상어("촉촉하게") 대신 조명·구도·질감을 영어로 고정한다.
 * 문서: review/backdrop-prompt-templates.md
 */

type BriefLike = {
  theme?: string;
  mood?: string;
  motif_keywords?: string[];
  backdrop_hint?: string;
};

export type CosmeticsPhotographyTemplateId =
  | "moisture"
  | "cooling"
  | "nourishing"
  | "cleansing"
  | "radiant"
  | "premium_dark"
  | "studio";

export type PhotographyTemplateId =
  | CosmeticsPhotographyTemplateId
  | "fashion-studio"
  | "electronics-studio"
  | "food-studio"
  | "home-studio"
  | "pet-studio";

export type PhotographyTemplate = {
  id: PhotographyTemplateId;
  labelKo: string;
  lighting: string;
  composition: string;
  texture: string;
  prompt: string;
};

export const PHOTOGRAPHY_TEMPLATES: Record<CosmeticsPhotographyTemplateId, PhotographyTemplate> = {
  moisture: {
    id: "moisture",
    labelKo: "수분/보습",
    lighting:
      "soft side lighting matching the product lighting lock, no golden hour, gentle glowing specular highlights on wet surfaces",
    composition:
      "shallow depth of field, empty center for product placement, close-up of surface plane",
    texture:
      "condensation droplets on glass over a soft blush-pink and warm ivory surface, dewy glowing micro-reflections, wet sheen without pooling",
    prompt:
      "soft side lighting matching the lighting lock white balance, no golden hour, no amber gel, shallow depth of field, close-up soft blush-pink and warm ivory studio surface, condensation droplets on glass, dewy glowing surface sheen, vivid radiant K-beauty product photography backdrop, no flat gray, realistic product photography backdrop, no product, no text, no logo",
  },
  cooling: {
    id: "cooling",
    labelKo: "진정/쿨링",
    lighting:
      "cool diffused light, high-key fill, faint cyan bounce from camera-left, no warm tungsten",
    composition:
      "shallow depth of field, airy negative space, slight top-down close-up of a clean plane",
    texture:
      "fine mist particles in air, frosted glass micro-texture, cool surface sheen without gold",
    prompt:
      "cool diffused high-key light, shallow depth of field, airy negative space, fine airborne mist, frosted glass texture, cyan-teal bounce only, no warm amber, no product, no text, no logo",
  },
  nourishing: {
    id: "nourishing",
    labelKo: "영양/농축",
    lighting:
      "soft side lighting with warm but controlled bounce, diffused key, gentle rim highlight",
    composition:
      "shallow depth of field, close-up of a smooth plane, empty center third for a bottle",
    texture:
      "creamy surface sheen, golden oil-like speculars on a dark glass hint, satin reflections",
    prompt:
      "soft side lighting, diffused key, shallow depth of field, close-up empty surface, creamy satin sheen, golden oil specular highlights, no product, no text, no logo",
  },
  cleansing: {
    id: "cleansing",
    labelKo: "클렌징",
    lighting:
      "bright diffused light, high-key, even fill, crisp but soft-edged glowing highlights",
    composition:
      "shallow depth of field, clean close-up of a wet-ready plane, generous negative space",
    texture:
      "soft foam bubble clusters at frame edge, pastel mint or blush soapy film highlights, glowing water sheen on bright ceramic",
    prompt:
      "bright diffused high-key light, shallow depth of field, bright pastel mint or blush ceramic plane, soft foam bubbles at edges, glowing soapy film highlights, vivid radiant K-beauty photography backdrop, no flat gray, no product, no text, no logo",
  },
  radiant: {
    id: "radiant",
    labelKo: "화사한 글로우",
    lighting:
      "soft bright diffused light matching the lighting lock, gentle glowing backlight halo, luminous even fill, no harsh shadow",
    composition:
      "shallow depth of field, airy negative space, soft bokeh light circles scattered around, empty center-lower third for product placement",
    texture:
      "soft blurred bokeh light circles, pale blush-pink to warm ivory gradient, delicate flower petal or silk fabric hint at frame edge, luminous glow haze, no dark tones, no gray flat surface",
    prompt:
      "soft bright diffused light matching the lighting lock white balance, gentle glowing backlight halo, luminous even fill, shallow depth of field, airy negative space, soft bokeh light circles, pale blush-pink to warm ivory gradient background, delicate flower petal or silk fabric hint, luminous radiant K-beauty advertising backdrop, no dark tones, no flat gray, no water droplets, no product, no text, no logo",
  },
  premium_dark: {
    id: "premium_dark",
    labelKo: "프리미엄 다크 무드",
    lighting:
      "single dramatic key light matching the lighting lock direction, deep charcoal-to-black gradient falloff, controlled specular rim highlight, no flat even fill, editorial contrast",
    composition:
      "shallow depth of field, generous negative space above and below, vertical product photography framing, empty center-lower third for product placement",
    texture:
      "fine suspended powder or mist particles caught in the key light, soft smoke-like drift, dark glossy reflective surface with subtle product reflection, no clutter",
    prompt:
      "single dramatic key light matching the lighting lock direction, deep charcoal-to-black gradient background, controlled specular rim highlight, editorial high-contrast mood, shallow depth of field, generous negative space, fine suspended powder or mist particles drifting through the light beam, dark glossy reflective surface, premium cosmetic advertising backdrop, no flat even lighting, no product, no text, no logo",
  },
  studio: {
    id: "studio",
    labelKo: "기본 스튜디오",
    lighting: "soft side lighting, diffused studio fill, natural shadow falloff to lower right",
    composition: "shallow depth of field, empty center, medium close-up of a seamless sweep",
    texture: "subtle surface grain, gentle reflections, no busy props",
    prompt:
      "soft side lighting, diffused studio fill, shallow depth of field, empty seamless sweep, subtle surface grain, no liquid, no glass, no water droplets, no product, no text, no logo",
  },
};

/**
 * 화장품/뷰티 외 카테고리 전용 촬영 템플릿.
 * PHOTOGRAPHY_TEMPLATES(수분/쿨링/영양/클렌징)는 전부 유리·물방울·거품 모티프라
 * 카테고리 구분 없이 키워드 매칭에 맡기면 패션·전자제품 등에도 물방울 맺힌
 * 유리컵 배경이 나오는 문제가 있었다 (예: "시원한 여름 린넨" → cooling 템플릿 오매칭).
 * 이 맵은 카테고리로 직접 확정하며, 물/유리 모티프를 명시적으로 배제한다.
 */
export const CATEGORY_PHOTOGRAPHY_TEMPLATES: Record<string, PhotographyTemplate> = {
  "의류/패션": {
    id: "fashion-studio",
    labelKo: "패션 에디토리얼",
    lighting: "soft natural window light, diffused daylight, gentle directional shadow",
    composition:
      "shallow depth of field, editorial negative space, garment or accessory centered on a clean plane",
    texture: "fine fabric weave grain, soft linen or cotton texture, no liquid, no glass, no droplets",
    prompt:
      "soft natural window light, diffused daylight, shallow depth of field, editorial studio surface, fine fabric weave texture, neutral tones, realistic product photography backdrop, no liquid, no glass, no water droplets, no condensation, no product, no text, no logo",
  },
  "전자제품": {
    id: "electronics-studio",
    labelKo: "테크 미니멀",
    lighting: "cool diffused studio light, crisp rim highlight, subtle gradient falloff",
    composition: "shallow depth of field, minimal geometric surface, empty center for device placement",
    texture: "brushed metal and matte polymer micro-texture, subtle tech gradient, no liquid, no glass, no droplets",
    prompt:
      "cool diffused studio light, crisp rim highlight, shallow depth of field, minimal geometric surface, brushed metal micro-texture, subtle tech gradient, realistic product photography backdrop, no liquid, no glass, no water droplets, no condensation, no product, no text, no logo",
  },
  "식품/건강기능식품": {
    id: "food-studio",
    labelKo: "내추럴 푸드",
    lighting: "warm natural daylight, soft diffused window light, gentle shadow",
    composition: "shallow depth of field, rustic table plane, empty center for plating",
    texture: "wood grain or linen table texture, soft warm tones, no glass condensation, no droplets on glass",
    prompt:
      "warm natural daylight, soft diffused window light, shallow depth of field, rustic wood or ceramic table surface, warm tones, realistic food photography backdrop, no glass condensation, no water droplets on glass, no product, no text, no logo",
  },
  "생활용품": {
    id: "home-studio",
    labelKo: "라이프스타일 인테리어",
    lighting: "bright airy natural light, soft diffused daylight, gentle shadow",
    composition: "shallow depth of field, minimal styled interior surface, empty center",
    texture: "matte ceramic or natural wood micro-texture, soft neutral tones, no liquid, no glass droplets",
    prompt:
      "bright airy natural light, soft diffused daylight, shallow depth of field, minimal styled interior surface, matte ceramic or wood texture, realistic lifestyle product photography backdrop, no liquid, no glass, no water droplets, no condensation, no product, no text, no logo",
  },
  "반려동물": {
    id: "pet-studio",
    labelKo: "포근한 홈 라이프스타일",
    lighting: "warm soft daylight, cozy diffused fill, gentle shadow",
    composition: "shallow depth of field, minimal cozy home surface, empty center",
    texture: "soft cozy fabric or wood micro-texture, warm pastel tones, no liquid, no glass droplets",
    prompt:
      "warm soft daylight, cozy diffused fill, shallow depth of field, minimal cozy home surface, soft fabric or wood texture, warm pastel tones, realistic lifestyle product photography backdrop, no liquid, no glass, no water droplets, no condensation, no product, no text, no logo",
  },
};

const KEYWORD_TO_ID: Array<{ id: CosmeticsPhotographyTemplateId; keywords: string[] }> = [
  {
    id: "moisture",
    keywords: ["수분", "보습", "물방울", "촉촉", "hydration", "dewy", "moisture"],
  },
  {
    id: "cooling",
    keywords: ["쿨링", "진정", "청량", "민트", "시원", "cool", "mist", "soothing"],
  },
  {
    id: "nourishing",
    keywords: ["영양", "농축", "골드", "오일", "nourish", "golden", "oil"],
  },
  {
    id: "cleansing",
    keywords: ["클렌징", "거품", "버블", "세안", "foam", "bubble", "cleanser"],
  },
  {
    id: "radiant",
    keywords: [
      "화사",
      "글로우",
      "빛나는",
      "환한",
      "생기",
      "글로시",
      "radiant",
      "glow",
      "luminous",
    ],
  },
  {
    id: "premium_dark",
    // 주의: "프리미엄"/"고급"은 한국 화장품 카피에서 흔한 일반 수식어라
    // (예: "프리미엄 스킨케어 브랜드") 다크 무드 의도가 없어도 자주 등장함.
    // 실제로 어둡고 무드있는 톤을 의도한 경우에만 매칭되도록 구체적인
    // 단어만 남긴다.
    keywords: [
      "다크 무드",
      "다크무드",
      "블랙 보틀",
      "블랙보틀",
      "럭셔리 다크",
      "무드 있는 다크",
      "다크",
      "블랙",
      "럭셔리",
      "noir",
      "moody",
      "dark mood",
    ],
  },
];

const COSMETICS_CATEGORY = "화장품/뷰티";

/**
 * category를 넘기면 그 카테고리 전용 템플릿을 바로 확정한다 (물/유리 모티프 배제).
 * category가 없거나 화장품/뷰티면 기존처럼 브리프 키워드로 수분/쿨링/영양/클렌징
 * 중 하나를 매칭한다 — 화장품은 실제로 물방울·유리 결로 연출이 잘 맞기 때문에
 * 이 경로는 그대로 둔다.
 */
export function resolvePhotographyTemplate(
  brief?: BriefLike | null,
  category?: string,
): PhotographyTemplate {
  if (category && category !== COSMETICS_CATEGORY) {
    return CATEGORY_PHOTOGRAPHY_TEMPLATES[category] ?? PHOTOGRAPHY_TEMPLATES.studio;
  }
  if (!brief) return PHOTOGRAPHY_TEMPLATES.studio;
  const haystack = [brief.theme, brief.mood, ...(brief.motif_keywords ?? []), brief.backdrop_hint]
    .join(" ")
    .toLowerCase();
  for (const row of KEYWORD_TO_ID) {
    if (row.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      return PHOTOGRAPHY_TEMPLATES[row.id];
    }
  }
  return PHOTOGRAPHY_TEMPLATES.studio;
}
