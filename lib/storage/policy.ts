/** 459차 — 저장소 공통 정책(서버·클라이언트 공용, 비밀 없음). 값은 supabase/migrations/20261022110000_storage_images_policies.sql 의 버킷 제한과 같다 */
export const STORAGE_BUCKET = "images";
/** 10MB — 정책 SQL의 file_size_limit(10485760)과 같은 값 */
export const MAX_UPLOAD_BYTES = 10485760;
/** 정책 SQL의 허용 MIME 목록 + avif(459차 지시). svg는 로고 업로드가 쓴다 */
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
] as const;
export const SIGNED_URL_TTL_SECONDS = 300;
/** 경로가 고유(타임스탬프·UUID)해서 바뀌지 않는 객체 */
export const CACHE_IMMUTABLE = "public, max-age=31536000, immutable";
/** upsert로 같은 경로를 덮어쓰는 객체(보정 이미지 재시도 등) */
export const CACHE_SHORT = "public, max-age=3600";

export const isAllowedUploadType = (t: string): boolean => (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(t);

/** 사용자 접두사 `<userId>/` 아래의 안전한 경로인지(경로 탈출·절대경로·빈 조각 금지) */
export function isOwnPath(path: string, userId: string): boolean {
  if (!userId || !path.startsWith(`${userId}/`)) return false;
  if (path.length > 300 || /[\u0000-\u001f\\]/.test(path)) return false;
  return path.split("/").every((seg) => seg.length > 0 && seg !== "." && seg !== "..");
}
