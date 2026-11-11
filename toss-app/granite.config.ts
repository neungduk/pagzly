/**
 * 521 — 앱인토스 패키징 설정.
 * 공식 WebView 튜토리얼: https://developers-apps-in-toss.toss.im/ai-vibe-coding/tutorials/webview
 * SDK 3.x는 `npx ait init` 시 `apps-in-toss.config.ts`를 만들 수 있음 — 파일명만 다르고 defineConfig 동일.
 * appName 등은 콘솔 등록 후 자리표시자를 바꿀 것(보고서 "사용자가 할 일").
 */
import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "pagzly",
  webView: {},
  permissions: [],
  webBundleDir: "dist",
  // 표시 이름·아이콘은 콘솔 등록값을 쓴다(이 설정 타입에는 없음)
  brand: {
    primaryColor: "#1D4ED8",
  },
});

