/** 508 — OCR 상수(환경변수 이름은 여기만). 값은 런타임 process.env. */

export const ENV_VISION_KEY_508 = "GOOGLE_VISION_API_KEY";
export const ENV_OCR_MONTHLY_508 = "LABEL_OCR_MONTHLY_LIMIT";
export const ENV_OCR_DAILY_508 = "LABEL_OCR_PER_USER_DAILY";

export const DEFAULT_OCR_MONTHLY_LIMIT_508 = 900;
export const DEFAULT_OCR_MEMBER_DAILY_508 = 30;
export const DEFAULT_OCR_GUEST_DAILY_508 = 5;

/** 요청 본문 상한(바이트) — 클라가 이 이하로 배치 */
export const OCR_REQUEST_BODY_MAX_508 = 4 * 1024 * 1024;
export const OCR_MAX_TILES_PER_JOB_508 = 20;
export const OCR_MAX_PAGES_508 = 10;
export const OCR_TILE_HEIGHT_508 = 2400;
export const OCR_TILE_OVERLAP_508 = 120;
export const OCR_LONG_EDGE_SPLIT_508 = 3000;
export const OCR_LONG_EDGE_MAX_508 = 4000;
export const OCR_JPEG_QUALITY_508 = 0.85;
export const OCR_TILE_MAX_BYTES_508 = 3 * 1024 * 1024;
export const OCR_IMAGE_MAX_BYTES_508 = 10 * 1024 * 1024;
export const OCR_PARALLEL_508 = 4;
/**
 * 509 — Hobby Fluid maxDuration 최대 300s. 호출당 8s × ceil(조각/4) 여유 포함해 30.
 * (구 10초는 동시 4·8s 타임아웃 2웨이브에 부족)
 */
export const OCR_MAX_DURATION_SEC_508 = 30;
/** 509 — 공급자 fetch 1회 상한(ms) */
export const OCR_FETCH_TIMEOUT_MS_509 = 8000;
/** 509 — 한 HTTP 요청당 조각 상한(동시 4 · 8s 기준 라우트 안) */
export const OCR_MAX_TILES_PER_REQUEST_CLOVA_509 = 6;
export const OCR_MAX_TILES_PER_REQUEST_GOOGLE_509 = 8;

export const NOTICE_OCR_REVIEW_508 =
  "사진에서 읽은 글자라 틀릴 수 있어요. 숫자·성분명을 꼭 확인해 주세요.";
export const NOTICE_OCR_TRANSFER_508 =
  "사진을 글자로 바꾸기 위해 이미지가 외부 OCR 서비스(Google)로 전송되며, 저장하지 않습니다.";
export const NOTICE_OCR_LOW_CONF_509 =
  "읽은 글자의 신뢰도가 낮아요. 숫자·성분명을 특히 확인해 주세요.";
export const CTA_OCR_508 = "사진에서 글자 읽기(외부 전송)";
export const CTA_OCR_PASTE_509 = "문구 붙여넣기로 점검";
/** 월 한도(OCR_LIMIT + limitKind:monthly) */
export const ERR_OCR_LIMIT_508 =
  "이번 달 사진 읽기 한도에 도달했어요. 문구 붙여넣기로 점검해 주세요.";
/** 일일 한도(OCR_LIMIT + limitKind:daily) */
export const ERR_OCR_DAILY_LIMIT_509 =
  "오늘 사진 읽기 횟수를 모두 사용했어요. 내일 다시 시도하거나 문구 붙여넣기로 점검해 주세요.";
export const ERR_OCR_TIMEOUT_509 =
  "사진 읽기 시간이 초과됐어요. 다시 시도하거나 문구 붙여넣기로 점검해 주세요.";
export const ERR_OCR_UNAVAILABLE_508 = "지금은 사진을 읽을 수 없어요";
export const ERR_OCR_TOO_MANY_TILES_508 = "10쪽/20조각까지 읽을 수 있어요. 파일을 나눠 주세요.";
export const ERR_OCR_HEIC_508 = "HEIC는 이번 버전에서 지원하지 않아요. JPG·PNG·WEBP로 보내 주세요.";
export const OCR_LOW_CONF_THRESHOLD_509 = 0.6;

export const PROGRESS_OCR_PREP_508 = (n: number, N: number) => `사진 준비 중…(${n}/${N})`;
export const PROGRESS_OCR_READ_508 = "글자 읽는 중…";
export const PROGRESS_OCR_REVIEW_508 = "읽은 글자 확인";
export const PROGRESS_OCR_RULES_508 = "규칙과 비교하는 중…";
