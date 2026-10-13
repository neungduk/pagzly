import type { DetailSection, TargetPersonaSection } from "@/lib/types/generate";
import { IMAGE_SOURCE_CAP, PERSONA_STRIP } from "@/lib/design-tokens";
import { countSourceUses } from "@/lib/image-source-cap";

/** 제목이 질문으로 끝나면 "Q." 리드를 붙인다 (메가 키워드 "KEYWORD | 나머지"는 나머지 기준) */
export function isQuestionHeading(heading: string | undefined): boolean {
  const rest = (heading ?? "").split(/\s*[|｜]\s*/).pop() ?? "";
  return /[?？]\s*$/.test(rest.trim());
}

export function isPersonaStripEligible(personas: string[]): boolean {
  const rows = personas.map((p) => p.trim()).filter(Boolean);
  return (
    rows.length === personas.length &&
    rows.length >= PERSONA_STRIP.minRows &&
    rows.length <= PERSONA_STRIP.maxRows &&
    rows.every((p) => p.length <= PERSONA_STRIP.maxChars)
  );
}

/** 사진 띠를 그릴 수 있는 고민 섹션인지 — 행 수만큼 서로 다른 유효 사진이 붙어 있을 때만 */
export function personaStripIndexes(section: TargetPersonaSection, imageCount: number): number[] | null {
  const indexes = section.imageIndexes;
  if (!indexes || indexes.length !== section.personas.length) return null;
  if (!isPersonaStripEligible(section.personas)) return null;
  if (indexes.some((i) => !Number.isInteger(i) || i < 0 || i >= imageCount)) return null;
  return new Set(indexes).size === indexes.length ? indexes : null;
}

/**
 * 고민 섹션에 사진 띠를 붙인다. 같은 소스 상한(IMAGE_SOURCE_CAP) 안에서 남은 사진만,
 * 히어로 사진은 빼고 덜 쓴 사진부터. 행 수만큼 남지 않으면 그대로(띠 없음).
 * 상한 적용(enforceImageSourceCap) 뒤에 부른다.
 */
export function assignPersonaStrip(
  sections: DetailSection[],
  imageCount: number,
  sourceOf?: readonly number[],
): DetailSection[] {
  const at = sections.findIndex((s) => s.type === "target_persona");
  const persona = sections[at];
  if (!persona || persona.type !== "target_persona") return sections;
  if (persona.imageIndexes?.length) return sections;
  if (!isPersonaStripEligible(persona.personas)) return sections;
  const group = (i: number) => sourceOf?.[i] ?? i;
  const hero = sections.find((s) => s.type === "hero");
  const heroGroup = hero && hero.type === "hero" ? group(hero.imageIndex) : -1;
  const uses = countSourceUses(sections, sourceOf);
  const left = (i: number) => IMAGE_SOURCE_CAP.maxUses - (uses.get(group(i)) ?? 0);
  const candidates = Array.from({ length: imageCount }, (_, i) => i)
    .filter((i) => group(i) === i && i !== heroGroup && left(i) > 0)
    .sort((a, b) => left(b) - left(a) || a - b);
  if (candidates.length < persona.personas.length) return sections;
  const picked = candidates.slice(0, persona.personas.length).sort((a, b) => a - b);
  const out = [...sections];
  out[at] = { ...persona, imageIndexes: picked };
  return out;
}
