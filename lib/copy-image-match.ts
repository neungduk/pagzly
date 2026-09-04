/**
 * 114차 — 섹션 카피 vs Vision tags 키워드 겹침 점수 (순수 함수).
 * role 게이팅을 넘지 않음 — assign 쪽 후보 집합 안에서만 타이브레이커로 사용.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
}

function tokensFromText(text: string): string[] {
  const raw = text
    .toLowerCase()
    .split(/[\s,，、·/|;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  return [...new Set(raw)];
}

/**
 * sectionText에 candidateTags/reason이 부분 문자열·토큰으로 겹치면 가점.
 * tags가 비면 0.
 */
export function scoreImageForCopy(params: {
  sectionText: string;
  candidateTags: string[];
  candidateReason?: string;
}): number {
  const section = (params.sectionText ?? "").trim();
  if (!section) return 0;
  const sectionNorm = normalize(section);
  const sectionTokens = tokensFromText(section);

  let score = 0;
  const tags = (params.candidateTags ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  for (const tag of tags) {
    const tagNorm = normalize(tag);
    if (!tagNorm) continue;
    if (sectionNorm.includes(tagNorm) || tagNorm.includes(sectionNorm.slice(0, 12))) {
      score += 3;
      continue;
    }
    const tagTokens = tokensFromText(tag);
    for (const tt of tagTokens) {
      if (sectionTokens.some((st) => st.includes(tt) || tt.includes(st))) {
        score += 2;
      }
    }
  }

  const reason = params.candidateReason?.trim();
  if (reason) {
    const reasonTokens = tokensFromText(reason);
    for (const rt of reasonTokens) {
      if (rt.length < 2) continue;
      if (sectionTokens.some((st) => st.includes(rt) || rt.includes(st))) {
        score += 1;
      }
    }
  }

  return score;
}

/** 섹션에서 매칭용 텍스트 추출 */
export function sectionCopyText(section: {
  heading?: string;
  body?: string;
  headline?: string;
  subheadline?: string;
}): string {
  const parts = [
    section.heading,
    section.body,
    section.headline,
    section.subheadline,
  ]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => p.trim());
  return parts.join(" ");
}
