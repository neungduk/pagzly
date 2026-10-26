/**
 * 439차 — 디자인 엔진 v4 플래그(레이아웃 변주·그래픽 모티프·타이포 연출·히어로 레이어·컬러 v4·후킹 구조).
 * 끄려면 NEXT_PUBLIC_DESIGN_V4=off — 438차 직후와 같은 export HTML(scripts/check-v4-off.ts로 문자열 비교).
 */
import { markNoPhotoFrame } from "@/lib/photo-fallback";

export const DESIGN_V4_ENABLED = process.env.NEXT_PUBLIC_DESIGN_V4 !== "off";

/** 표시 계획(planV4)이 읽는 실행 중 상태. 회귀가 이전 차수(433~438) 단계 검사를 v4 없이 돌릴 때만 바꾼다(서비스 코드는 바꾸지 않음) */
const state = { on: DESIGN_V4_ENABLED };
export const designV4On = (): boolean => state.on;
export function setDesignV4ForTests(on: boolean): void {
  state.on = on;
}

/**
 * 439차 1-(d) — 라이브 렌더러의 raw <img>(SectionImage를 거치지 않는 것: 아이콘 링·썸네일·로고·배너·GIF·전후·인증·장면·색상 옵션)가
 * 로드에 실패하면 숨긴다(깨진 이미지 아이콘·alt 글자 노출 방지). export는 438차부터 최종 HTML의 모든 <img>에 같은 onerror가 붙어 있다.
 */
export const hideImgOnError = DESIGN_V4_ENABLED
  ? (e: { currentTarget: HTMLImageElement }): void => {
      markNoPhotoFrame(e.currentTarget); // 455차: 사진 틀이면 빈 틀 면 표시·비율 예약(정상 로드에는 영향 없음) — 숨기기 전에 불러야 한다
      e.currentTarget.style.setProperty("display", "none", "important"); // 455차: CSS display!important(색상 옵션 등)가 인라인 숨김을 이기지 못하게
    }
  : undefined;
