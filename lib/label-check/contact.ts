/**
 * 486 — 문의 이메일(공개 env만). 값 하드코딩·로그 금지.
 * NEXT_PUBLIC_LABEL_CONTACT_EMAIL 없으면 빈 문자열 → UI에서 영역 숨김.
 */
export function labelContactEmail(): string {
  const raw = process.env.NEXT_PUBLIC_LABEL_CONTACT_EMAIL;
  if (typeof raw !== "string") return "";
  return raw.trim();
}
