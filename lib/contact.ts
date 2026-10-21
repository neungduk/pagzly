/**
 * 426차 R2 — 문의 이메일. 환경 변수 NEXT_PUBLIC_CONTACT_EMAIL(사업용 주소)이 있으면 그 값을, 없으면 기존 값을 쓴다.
 * NEXT_PUBLIC_ 값은 빌드에 박히므로 process.env.NEXT_PUBLIC_CONTACT_EMAIL을 직접 참조한다(바꾸면 재빌드 필요).
 */
const FALLBACK_CONTACT_EMAIL = "tjsmdejr@gmail.com";
const fromEnv = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
export const CONTACT_EMAIL: string = fromEnv && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEnv) ? fromEnv : FALLBACK_CONTACT_EMAIL;
