import { FLAT_SECTION_SURFACES } from "@/lib/design-tokens";
import { isEmptySizeOptions } from "@/lib/spec-placeholder";
import type { DetailSection, ImageTextSection } from "@/lib/types/generate";

function isTextOnlyRow(section: DetailSection | undefined): section is ImageTextSection {
  return (
    section?.type === "image_text" &&
    section.layout === "text_only" &&
    !(FLAT_SECTION_SURFACES && isEmptySizeOptions(section)) &&
    Boolean(section.heading?.trim()) &&
    Boolean(section.body?.trim())
  );
}

/** 번호가 앞에 붙으므로 해시태그식 머리 기호는 뺀다 */
export function textOnlyRunHeading(heading: string): string {
  return heading.replace(/^#\s*/, "");
}

/**
 * 연속된 text_only 섹션(2개 이상)을 번호 매긴 한 블록으로 묶는다 — 제목+문단만 있는 띠가
 * 연달아 나오면 빈 페이지처럼 보여서. 반환: 첫 인덱스 → 묶인 인덱스 목록.
 * 라이브·export가 같은 함수를 써야 섹션 수·배경 교대가 어긋나지 않는다.
 */
export function findTextOnlyRuns(sections: DetailSection[]): Map<number, number[]> {
  const runs = new Map<number, number[]>();
  for (let i = 0; i < sections.length; ) {
    if (!isTextOnlyRow(sections[i])) {
      i += 1;
      continue;
    }
    const members = [i];
    while (isTextOnlyRow(sections[i + members.length])) members.push(i + members.length);
    if (members.length >= 2) runs.set(i, members);
    i += members.length;
  }
  return runs;
}
