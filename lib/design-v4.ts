/**
 * 439차 — 디자인 엔진 v4 플래그(레이아웃 변주·그래픽 모티프·타이포 연출·히어로 레이어·컬러 v4·후킹 구조).
 * 끄려면 NEXT_PUBLIC_DESIGN_V4=off — 438차 직후와 같은 export HTML(scripts/check-v4-off.ts로 문자열 비교).
 */
export const DESIGN_V4_ENABLED = process.env.NEXT_PUBLIC_DESIGN_V4 !== "off";

/**
 * 439차 1-(d) — 라이브 렌더러의 raw <img>(SectionImage를 거치지 않는 것: 아이콘 링·썸네일·로고·배너·GIF·전후·인증·장면·색상 옵션)가
 * 로드에 실패하면 숨긴다(깨진 이미지 아이콘·alt 글자 노출 방지). export는 438차부터 최종 HTML의 모든 <img>에 같은 onerror가 붙어 있다.
 */
export const hideImgOnError = DESIGN_V4_ENABLED
  ? (e: { currentTarget: HTMLImageElement }): void => {
      e.currentTarget.style.display = "none";
    }
  : undefined;
