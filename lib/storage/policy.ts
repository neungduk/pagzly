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

/** 460차 — 만료 이미지 정리(엣지 함수 cleanup-expired-images 와 같은 기준). 상품에 이어지지 않은 업로드를 3일 뒤 지운다 */
export const EXPIRED_IMAGE_DAYS = 3;
/** 1회 실행 처리 상한(함수 시간 제한 안에서 끝나도록). 남은 행은 다음 실행이 이어받는다 */
export const CLEANUP_MAX_PER_RUN = 500;
/** 저장소 삭제 요청 묶음 크기(R2 DeleteObjects 상한 1000 아래). 묶음이 실패하면 그 묶음의 행만 남겨 재시도 */
export const CLEANUP_CHUNK_SIZE = 100;

/**
 * 460차 — 사용자별 서명 업로드 주소 발급 한도(인메모리 슬라이딩 윈도우, lib/rate-limit.ts). 서버리스 인스턴스별이라 1차 완충이며 크기 상한(10MB)·인증과 함께 쓴다.
 * 근거: 상세페이지 한 번 만들 때 올리는 사진은 보통 5~10장(재시도·롤백 포함 30개 안팎) → 시간당 150이면 정상 사용 약 5회분, 일 600이면 하루 약 20회분.
 * 남용(스크립트 반복 업로드로 R2 쓰기 요청·저장 용량 소진)은 이 한도에서 막힌다. 조정은 이 상수만 바꾼다.
 */
export const UPLOAD_URL_RULES = [
  { name: "hour", windowMs: 3_600_000, max: 150 },
  { name: "day", windowMs: 86_400_000, max: 600 },
] as const;
