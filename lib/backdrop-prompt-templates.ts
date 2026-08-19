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

export type PhotographyTemplateId =
  | "moisture"
  | "cooling"
  | "nourishing"
  | "cleansing"
  | "studio";

export type PhotographyTemplate = {
  id: PhotographyTemplateId;
  labelKo: string;
  lighting: string;
  composition: string;
  texture: string;
  prompt: string;
};

export const PHOTOGRAPHY_TEMPLATES: Record<PhotographyTemplateId, PhotographyTemplate> = {
  moisture: {
    id: "moisture",
    labelKo: "수분/보습",
    lighting:
      "soft side lighting matching the product lighting lock, no golden hour, gentle specular highlights on wet surfaces",
    composition:
      "shallow depth of field, empty center for product placement, close-up of surface plane",
    texture:
      "condensation droplets on glass, dewy marble micro-reflections, wet sheen without pooling",
    prompt:
      "soft side lighting matching the lighting lock white balance, no golden hour, no amber gel, shallow depth of field, close-up empty studio surface, condensation droplets on glass, dewy surface sheen, realistic product photography backdrop, no product, no text, no logo",
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
      "bright diffused light, high-key, even fill, crisp but soft-edged highlights",
    composition:
      "shallow depth of field, clean close-up of a wet-ready plane, generous white space",
    texture:
      "soft foam bubble clusters at frame edge, soapy film highlights, water sheen on ceramic",
    prompt:
      "bright diffused high-key light, shallow depth of field, clean ceramic plane, soft foam bubbles at edges, soapy film highlights, no product, no text, no logo",
  },
  studio: {
    id: "studio",
    labelKo: "기본 스튜디오",
    lighting: "soft side lighting, diffused studio fill, natural shadow falloff to lower right",
    composition: "shallow depth of field, empty center, medium close-up of a seamless sweep",
    texture: "subtle surface grain, gentle reflections, no busy props",
    prompt:
      "soft side lighting, diffused studio fill, shallow depth of field, empty seamless sweep, subtle surface grain, no product, no text, no logo",
  },
};

const KEYWORD_TO_ID: Array<{ id: PhotographyTemplateId; keywords: string[] }> = [
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
];

export function resolvePhotographyTemplate(brief?: BriefLike | null): PhotographyTemplate {
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
