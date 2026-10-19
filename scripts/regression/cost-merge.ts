/**
 * 회귀 — 406차 비용표 합치기. 초안 단계 Claude 비용이 사진 단계 값에 덮이지 않는다.
 * 고정 입력은 404차 실생성 값(앱 기록 session.json + dev 서버 로그 [cost] 합산). 실제 생성 없음, 유료 호출 0.
 */
import fs from "node:fs";
import path from "node:path";
import { mergeDraftAndPhotoCost } from "../../lib/cost/merge-photo-cost";

export const name = "비용표 합치기(초안 Claude 누락 방지)";

/** 404차 초안 응답 비용표 — 서버 로그 "[cost] draft … claude=$0.0926" */
const DRAFT = { conceptBrief: 0.0003, referenceAnalysis: 0, reviewInsights: 0, claude: 0.0926, visionRolesApplied: 0 };
/** 404차 사진 단계 비용표 — session.json photoCostBreakdown(최종 단계 Claude 0) */
const PHOTO = { conceptBrief: 0.00023, backdrop: 0.16, claude: 0.04831, referenceAnalysis: 0, sectionBackdrops: 0.006, enhance: 0.03029, decor: 0 };
const PHOTO_PROCESSING = 0.19652; // backdrop 0.16 + conceptBrief 0.00023 + section 0.006 + enhance 0.03029
const DRAFT_TEXT = 0.00506; // draftTextCost(초안 DeepSeek)
const SERVER_LOG_TOTAL = 0.31593; // _404cha-costsum.ts 합산
/** 보호 파일(photo-enhance.ts preCropSourceToProduct)이 enhance 비용과 claudeCost에 같은 값을 넣어 겹치는 몫(404차: 0.03029 − 배경 제거 0.00423) */
const KNOWN_DOUBLE = 0.02606;

const near = (a: number, b: number, eps = 0.0015) => Math.abs(a - b) <= eps;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const merged = mergeDraftAndPhotoCost(DRAFT, PHOTO);
  if (!near(merged.claude ?? 0, 0.0926 + 0.04831, 1e-9)) fails.push(`claude가 더해지지 않음: ${merged.claude}`);
  for (const k of ["backdrop", "enhance", "sectionBackdrops", "decor", "conceptBrief"] as const) {
    if (merged[k] !== PHOTO[k]) fails.push(`${k}가 사진 단계 값이 아님: ${merged[k]}`);
  }
  // 예전 방식({...초안, ...사진})이면 초안 Claude가 사라진다
  const legacy = { ...DRAFT, ...PHOTO };
  if (legacy.claude !== PHOTO.claude) fails.push("고정 입력 오류(예전 방식 기준값)");
  // 최종 route 식: generationCost = photoProcessingCost + deepSeek(0) + icons(0) + claude(이어받은 값 + 최종 0)
  const appTotal = PHOTO_PROCESSING + (merged.claude ?? 0);
  const legacyTotal = PHOTO_PROCESSING + (legacy.claude ?? 0);
  if (!near(legacyTotal, 0.24483)) fails.push(`예전 방식 재현값이 404차 앱 기록과 다름: ${legacyTotal.toFixed(5)}`);
  // 서버 로그와 대조: 앱 + 초안 DeepSeek − 알려진 이중 집계 = 서버 로그 합산(반올림 오차 안)
  if (!near(appTotal + DRAFT_TEXT - KNOWN_DOUBLE, SERVER_LOG_TOTAL)) {
    fails.push(`서버 로그 대조 실패: 앱 ${appTotal.toFixed(5)} + 초안 DeepSeek − 이중 ${KNOWN_DOUBLE} ≠ ${SERVER_LOG_TOTAL}`);
  }
  // 예전 세션·빈 값
  const empty = mergeDraftAndPhotoCost(undefined, undefined);
  if (Object.keys(empty).length !== 0) fails.push(`빈 입력에 칸이 생김: ${JSON.stringify(empty)}`);
  if (mergeDraftAndPhotoCost(undefined, { backdrop: 0.16 }).claude !== undefined) fails.push("claude 없는 입력에 claude 칸이 생김");
  if (mergeDraftAndPhotoCost({ claude: 0.1 }, undefined).claude !== 0.1) fails.push("사진 단계가 없을 때 초안 claude 유지 안 됨");
  // 초안 화면이 이 함수를 쓰고, 최종 route가 이어받은 claude에서 시작하는지
  const root = path.join(__dirname, "..", "..");
  const draftPage = fs.readFileSync(path.join(root, "app", "create", "draft", "page.tsx"), "utf8");
  if (!draftPage.includes("mergeDraftAndPhotoCost(")) fails.push("draft/page.tsx가 mergeDraftAndPhotoCost를 쓰지 않음");
  const route = fs.readFileSync(path.join(root, "app", "api", "generate", "route.ts"), "utf8");
  if (!route.includes("let claudeCost = body.photoCostBreakdown?.claude ?? 0;")) fails.push("route.ts의 claude 이어받기 식이 바뀜 — 이 점검 다시 확인");
  return fails;
}
