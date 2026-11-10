/**
 * 502 — 표시사항(/label-check) 전용 회귀 스위트 목록.
 * `npm run regression:label-check` 가 이 배열만 실행한다.
 * 전체 회귀는 `npm run regression` → run-all.ts.
 */
import * as labelCheck483 from "./label-check-483";
import * as featureFlag489 from "./feature-flag-489";
import * as labelCheck492 from "./label-check-492";
import * as labelCheck493 from "./label-check-493";
import * as labelCheck494 from "./label-check-494";
import * as labelCheck495 from "./label-check-495";
import * as labelCheck496 from "./label-check-496";
import * as labelCheck497 from "./label-check-497";
import * as labelCheck498 from "./label-check-498";
import * as labelCheck499 from "./label-check-499";
import * as labelCheck500 from "./label-check-500";
import * as labelRulesValidate501 from "./label-rules-validate-501";
import * as labelCheck501 from "./label-check-501";
import * as labelCheck504 from "./label-check-504";
import * as labelCheck505 from "./label-check-505";
import * as labelCheck506 from "./label-check-506";
import * as labelCheck507 from "./label-check-507";
import * as labelCheck508Unreadable from "./label-check-508-unreadable";
import * as labelCheck508Ocr from "./label-check-508-ocr";
import * as labelCheck509OcrHardening from "./label-check-509-ocr-hardening";
import * as labelCheckOcrFix510 from "./label-check-ocr-fix-510";
import * as labelCheck510bAccuracy from "./label-check-510b-accuracy";
import * as labelCheck511Ui from "./label-check-511-ui";
import * as labelCheck512Card from "./label-check-512-card";
import * as labelCheck513Gating from "./label-check-513-gating";
import * as labelCheck514Landing from "./label-check-514-landing";

export type LabelCheckSuite = {
  name: string;
  run: () => Promise<string[]>;
};

/** 483(파일)·스위트명 488 · 489 · 492~501 · 규칙 JSON 검증 · 504~513 */
export const LABEL_CHECK_SUITES: LabelCheckSuite[] = [
  labelCheck483,
  featureFlag489,
  labelCheck492,
  labelCheck493,
  labelCheck494,
  labelCheck495,
  labelCheck496,
  labelCheck497,
  labelCheck498,
  labelCheck499,
  labelCheck500,
  labelRulesValidate501,
  labelCheck501,
  labelCheck504,
  labelCheck505,
  labelCheck506,
  labelCheck507,
  labelCheck508Unreadable,
  labelCheck508Ocr,
  labelCheck509OcrHardening,
  labelCheckOcrFix510,
  labelCheck510bAccuracy,
  labelCheck511Ui,
  labelCheck512Card,
  labelCheck513Gating,
  labelCheck514Landing,
];
