import type { DetailSection, ImageTextSection } from "@/lib/types/generate";
import { shouldUseSplitLayout } from "@/lib/detail-visual-rhythm";
import { FLAT_SECTION_SURFACES, IMAGE_SOURCE_CAP } from "@/lib/design-tokens";
import { isChecklistHubEligible } from "@/lib/checklist-hub";

/** 체크리스트 허브 인포그래픽은 가운데에 항상 1번 사진(index 0)을 쓴다 */
const CHECKLIST_HUB_INDEX = 0;

function checklistShowsHub(section: Extract<DetailSection, { type: "checklist" }>): boolean {
  if (section.hubPhoto === false) return false;
  const compactFollow = section.compactFollow === true;
  return isChecklistHubEligible(
    section.items.filter((item) => String(item).trim()),
    { flat: FLAT_SECTION_SURFACES, compactFollow, boldBlock: section.boldBlock === true && !compactFollow, hasImage: true },
  );
}

/**
 * 한 페이지에서 같은 소스 사진은 IMAGE_SOURCE_CAP.maxUses회까지만.
 * 넘치는 슬롯은 억지로 반복하지 않고 사진 없는 형태로 바꾼다:
 * image_text → text_only, step_card → usage_steps(타임라인), gallery는 남는 컷만(2장 미만이면 생략),
 * color_variation은 생략, checklist 허브는 hubPhoto:false(텍스트 체크리스트).
 * 사진이 1장뿐이면 POINT(stacked) 섹션 1곳만 디테일 확대 크롭으로 한 번 더 쓴다.
 * hero·illustration_banner는 바꾸지 않고 먼저 사용 횟수에 넣는다.
 */
export function sectionImageIndexes(section: DetailSection): number[] {
  switch (section.type) {
    case "hero":
    case "illustration_banner":
      return typeof section.imageIndex === "number" ? [section.imageIndex] : [];
    case "checklist":
      return checklistShowsHub(section) ? [CHECKLIST_HUB_INDEX] : [];
    case "image_text":
      if (section.layout === "text_only" || section.layout === "circle-pair" || section.layout === "circle-solo") {
        return [];
      }
      return typeof section.imageIndex === "number" ? [section.imageIndex] : [];
    case "gallery":
      return section.imageIndexes ?? [];
    case "color_variation":
      return section.options.map((o) => o.imageIndex);
    case "step_card":
      return section.steps.map((s) => s.imageIndex);
    case "spec_table":
      return section.slot === "spec_table" ? (section.imageIndexes ?? []) : [];
    case "brand_story":
      return section.imageIndexes ?? [];
    default:
      return [];
  }
}

export function countSourceUses(sections: DetailSection[]): Map<number, number> {
  const uses = new Map<number, number>();
  for (const s of sections) {
    for (const i of sectionImageIndexes(s)) uses.set(i, (uses.get(i) ?? 0) + 1);
  }
  return uses;
}

function stepText(step: { title: string; body: string }): string {
  const title = step.title.trim();
  const body = step.body.trim();
  if (title && body) return `${title}: ${body}`;
  return title || body;
}

export function enforceImageSourceCap(
  sections: DetailSection[],
  imageCount: number,
  maxUses: number = IMAGE_SOURCE_CAP.maxUses,
): DetailSection[] {
  if (imageCount <= 0) return sections;
  const uses = new Map<number, number>();
  const used = (i: number) => uses.get(i) ?? 0;
  const take = (i: number) => uses.set(i, used(i) + 1);
  /** 같은 섹션 안 중복까지 포함해 전부 받을 수 있는지 */
  const fitsAll = (indexes: number[]) => {
    const need = new Map<number, number>();
    for (const i of indexes) need.set(i, (need.get(i) ?? 0) + 1);
    return [...need].every(([i, n]) => used(i) + n <= maxUses);
  };
  let detailCrops = 0;
  const out: DetailSection[] = [];
  for (const section of sections) {
    if (section.type === "hero" || section.type === "illustration_banner") {
      sectionImageIndexes(section).forEach(take);
    }
  }

  for (const section of sections) {
    switch (section.type) {
      case "hero":
      case "illustration_banner":
        out.push(section);
        break;
      case "checklist": {
        if (!checklistShowsHub(section)) {
          out.push(section);
        } else if (used(CHECKLIST_HUB_INDEX) < maxUses) {
          take(CHECKLIST_HUB_INDEX);
          out.push(section);
        } else {
          out.push({ ...section, hubPhoto: false });
        }
        break;
      }
      case "image_text": {
        const [idx] = sectionImageIndexes(section);
        if (idx === undefined) {
          out.push(section);
        } else if (used(idx) < maxUses) {
          take(idx);
          out.push(section);
        } else if (
          imageCount === 1 &&
          detailCrops < IMAGE_SOURCE_CAP.singlePhotoDetailCrops &&
          section.layout !== "annotated" &&
          shouldUseSplitLayout(section)
        ) {
          detailCrops += 1;
          out.push({ ...section, imageCrop: "detail" } satisfies ImageTextSection);
        } else {
          out.push({ ...section, layout: "text_only" } satisfies ImageTextSection);
        }
        break;
      }
      case "gallery": {
        const kept: number[] = [];
        for (const i of section.imageIndexes ?? []) {
          if (!kept.includes(i) && used(i) < maxUses) {
            take(i);
            kept.push(i);
          }
        }
        if (kept.length >= 2) out.push({ ...section, imageIndexes: kept });
        else kept.forEach((i) => uses.set(i, used(i) - 1));
        break;
      }
      case "step_card": {
        const indexes = sectionImageIndexes(section);
        if (fitsAll(indexes)) {
          indexes.forEach(take);
          out.push(section);
        } else {
          out.push({
            type: "usage_steps",
            slot: section.slot,
            heading: section.heading,
            steps: section.steps.map(stepText).filter(Boolean),
          });
        }
        break;
      }
      case "color_variation": {
        const indexes = sectionImageIndexes(section);
        if (fitsAll(indexes)) {
          indexes.forEach(take);
          out.push(section);
        }
        break;
      }
      case "spec_table":
      case "brand_story": {
        const indexes = sectionImageIndexes(section);
        if (indexes.length === 0) {
          out.push(section);
          break;
        }
        const kept = indexes.filter((i, k) => indexes.indexOf(i) === k && used(i) < maxUses);
        kept.forEach(take);
        out.push({ ...section, imageIndexes: kept });
        break;
      }
      default:
        out.push(section);
    }
  }
  return out;
}
