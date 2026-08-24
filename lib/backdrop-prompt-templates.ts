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
  | "minimal"
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
  /**
   * 미니멀 — 구체적 사물(꽃잎·물방울·잎사귀) 없이 그라데이션·보케·비네트만.
   * 배경이 단순할수록 제품 합성 티(그림자·색온도 불일치)가 덜 도드라진다.
   * 키워드 미매칭 시 화장품 기본 후보로 사용한다.
   */
  minimal: {
    id: "minimal",
    labelKo: "미니멀 그라데이션",
    lighting:
      "soft even diffused light matching the lighting lock, gentle falloff, no dramatic props lighting",
    composition:
      "shallow depth of field, generous empty negative space, soft vignette toward edges, empty center-lower third for product",
    texture:
      "smooth soft-focus gradient only, faint circular bokeh far out of focus, no petals, no leaves, no droplets, no props",
    prompt:
      "soft even diffused light matching the lighting lock white balance, shallow depth of field, smooth soft-focus gradient backdrop from pale blush-ivory to warm cream, faint out-of-focus bokeh circles near edges only, gentle vignette, empty center for product, no flower petals, no leaves, no water droplets, no glass, no props, no product, no text, no logo",
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
    labelKo: "패션 미니멀",
    lighting: "soft natural window light, diffused daylight, gentle directional shadow",
    composition:
      "shallow depth of field, editorial negative space, soft vignette, empty center for garment",
    texture:
      "smooth soft-focus neutral gradient, faint fabric-tone haze only, no props, no hangers, no liquid",
    prompt:
      "soft natural window light, diffused daylight, shallow depth of field, smooth soft-focus neutral beige-to-ivory gradient backdrop, faint out-of-focus bokeh, gentle vignette, empty center, no clothing props, no hangers, no liquid, no glass, no water droplets, no product, no text, no logo",
  },
  "전자제품": {
    id: "electronics-studio",
    labelKo: "테크 미니멀",
    lighting: "cool diffused studio light, crisp rim highlight, subtle gradient falloff",
    composition: "shallow depth of field, empty center for device, soft vignette",
    texture: "smooth cool gray-to-slate soft-focus gradient, faint bokeh, no geometric props",
    prompt:
      "cool diffused studio light, crisp rim highlight, shallow depth of field, smooth cool gray soft-focus gradient backdrop, faint bokeh, gentle vignette, empty center, no cables, no gadgets as props, no liquid, no glass, no product, no text, no logo",
  },
  "식품/건강기능식품": {
    id: "food-studio",
    labelKo: "내추럴 미니멀",
    lighting: "warm natural daylight, soft diffused window light, gentle shadow",
    composition: "shallow depth of field, empty center for packaging, soft vignette",
    texture: "smooth warm cream-to-sand soft-focus gradient, faint bokeh, no food props",
    prompt:
      "warm natural daylight, soft diffused window light, shallow depth of field, smooth warm cream soft-focus gradient backdrop, faint bokeh, gentle vignette, empty center, no ingredients as props, no plates, no glass condensation, no water droplets, no product, no text, no logo",
  },
  "생활용품": {
    id: "home-studio",
    labelKo: "라이프스타일 미니멀",
    lighting: "bright airy natural light, soft diffused daylight, gentle shadow",
    composition: "shallow depth of field, empty center, soft vignette",
    texture: "smooth soft-focus warm-neutral gradient, faint bokeh, no interior props",
    prompt:
      "bright airy natural light, soft diffused daylight, shallow depth of field, smooth warm-neutral soft-focus gradient backdrop, faint bokeh, gentle vignette, empty center, no furniture props, no liquid, no glass, no water droplets, no product, no text, no logo",
  },
  "반려동물": {
    id: "pet-studio",
    labelKo: "포근한 미니멀",
    lighting: "warm soft daylight, cozy diffused fill, gentle shadow",
    composition: "shallow depth of field, empty center, soft vignette",
    texture: "smooth soft-focus warm pastel gradient, faint bokeh, no toys or props",
    prompt:
      "warm soft daylight, cozy diffused fill, shallow depth of field, smooth warm pastel soft-focus gradient backdrop, faint bokeh, gentle vignette, empty center, no pet toys as props, no liquid, no glass, no water droplets, no product, no text, no logo",
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
 * category가 없거나 화장품/뷰티면 브리프 키워드로 수분/쿨링/영양 등을 매칭하고,
 * 키워드가 없으면 미니멀(그라데이션·보케만)을 기본값으로 쓴다.
 */
export function resolvePhotographyTemplate(
  brief?: BriefLike | null,
  category?: string,
): PhotographyTemplate {
  if (category && category !== COSMETICS_CATEGORY) {
    return CATEGORY_PHOTOGRAPHY_TEMPLATES[category] ?? PHOTOGRAPHY_TEMPLATES.minimal;
  }
  if (!brief) return PHOTOGRAPHY_TEMPLATES.minimal;
  const haystack = [brief.theme, brief.mood, ...(brief.motif_keywords ?? []), brief.backdrop_hint]
    .join(" ")
    .toLowerCase();
  for (const row of KEYWORD_TO_ID) {
    if (row.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      return PHOTOGRAPHY_TEMPLATES[row.id];
    }
  }
  return PHOTOGRAPHY_TEMPLATES.minimal;
}
