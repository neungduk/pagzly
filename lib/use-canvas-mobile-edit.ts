"use client";

import { useSyncExternalStore } from "react";

/** Tailwind `lg` 미만 — 캔버스 드래그 편집 비활성 구간 */
export const CANVAS_MOBILE_MAX_WIDTH_PX = 1023;

function subscribeMobile(callback: () => void) {
  const mq = window.matchMedia(`(max-width: ${CANVAS_MOBILE_MAX_WIDTH_PX}px)`);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia(`(max-width: ${CANVAS_MOBILE_MAX_WIDTH_PX}px)`).matches;
}

function getServerMobileSnapshot() {
  return false;
}

/** 모바일·태블릿에서는 캔버스 드래그 편집 대신 정적 미리보기 + 안내 배너 */
export function useCanvasMobileEdit(): boolean {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerMobileSnapshot);
}
