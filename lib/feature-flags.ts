/**
 * 489차 — 상세페이지 생성 노출 플래그.
 * NEXT_PUBLIC_DETAIL_PAGE_ENABLED === "1"일 때만 켜짐(기본 꺼짐).
 * 서버·클라이언트 동일 헬퍼. 문자열 비교를 다른 파일에 흩뿌리지 말 것.
 */
export function isDetailPageEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED === "1";
}

/** 모듈 로드 시점 스냅샷(NEXT_PUBLIC_은 빌드/기동 시 고정). UI 분기는 이 값 또는 헬퍼 사용. */
export const DETAIL_PAGE_ENABLED = process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED === "1";

/** API 거절 본문(키·경로·스택 노출 금지) */
export const DETAIL_PAGE_DISABLED_ERROR = "서비스가 일시 중단되었습니다";
