/**
 * 495 — 회원 검수 흐름 상수(바꾸기 쉽게).
 */
import type { RateLimitRule } from "@/lib/rate-limit";

/** 비회원 IP 제한(기존) */
export const LABEL_CHECK_GUEST_RATE_RULES: RateLimitRule[] = [
  { name: "minute", windowMs: 60_000, max: 10 },
];

/** 회원 — 비회원보다 완화 */
export const LABEL_CHECK_MEMBER_RATE_RULES: RateLimitRule[] = [
  { name: "minute", windowMs: 60_000, max: 30 },
];

/** 사용자당 보관 상한. 초과 시 오래된 행부터 삭제 후 insert */
export const LABEL_CHECK_MAX_RUNS_PER_USER = 200;

export const ERR_LOGIN_EXPIRED_495 = "로그인이 만료되었습니다. 다시 로그인해 주세요.";
export const ERR_SERVER_495 = "서버 오류로 검수에 실패했습니다. 잠시 후 다시 시도해 주세요.";
export const NOTICE_HISTORY_NO_REANALYZE_495 =
  "저장된 요약만 볼 수 있습니다. PDF를 다시 분석할 수 없습니다.";
