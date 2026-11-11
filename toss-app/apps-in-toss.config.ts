/**
 * 521 — SDK 3.x `ait build`가 읽는 설정 파일명.
 * granite.config.ts 와 동일 자리표시자(보고서·사용자가 할 일 참고).
 */
import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "pagzly",
  webView: {},
  permissions: [],
  webBundleDir: "dist",
});
