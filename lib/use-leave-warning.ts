"use client";

import { useEffect } from "react";

/**
 * 426차 W9 — 생성 중 탭을 닫거나 새로고침하면 브라우저 확인창을 띄운다.
 * 생성은 브라우저가 초안→사진→최종 단계를 차례로 호출하는 구조라, 도중에 닫으면 결과가 사라질 수 있다.
 * 브라우저가 안내 문구를 직접 정하므로(보안 정책상 사용자 지정 문구 불가) 화면 안에는 별도로 같은 취지의 문구를 둔다(LEAVE_WARNING_TEXT).
 */
export const LEAVE_WARNING_TEXT = "생성 중에 창을 닫으면 결과가 사라질 수 있습니다.";

export function useLeaveWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = LEAVE_WARNING_TEXT; // 일부 브라우저가 필요로 하는 값(표시 문구는 브라우저 기본)
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}
