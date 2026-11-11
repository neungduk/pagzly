/**
 * 523 — 개발·미리보기 전용 demo 데이터. 출시 빌드에서는 import 되지 않도록
 * `demoEnabled()` 가드 안에서만 동적 import 한다.
 */
import type { LabelCheckResult } from "@/lib/label-check/types";
import sampleResultA from "@/lib/label-check/sample-result-a.json";
import { applyGatingToStaticResult518 } from "@/lib/label-check/sample-gating-518";

export const DEMO_NAMES = [
  "start",
  "picked",
  "text",
  "busy",
  "ocr",
  "result",
  "result-open",
  "result-clean",
  "result-many",
  "unreadable",
  "error",
  "limit",
  "heic",
] as const;

export type DemoName = (typeof DEMO_NAMES)[number];

export const DEMO_PASTE_TEXT = [
  "피부 주름을 개선하는 앰플입니다.",
  "비타민C가 들어 있어요.",
  "민감성 피부에도 쓸 수 있어요.",
  "사용 전 패치 테스트를 권장합니다.",
].join("\n");

export const DEMO_OCR_TEXT = [
  "모아리 수분 토너",
  "용량 200ml",
  "전성분: 정제수, 글리세린",
  "사용방법: 화장솜에 적셔 닦아 주세요",
  "제조업자: 예시화장품",
  "제조번호: LOT-DEMO-01",
  "사용기한: 개봉 후 12개월",
  "주의: 눈에 들어가지 않게 하세요",
].join("\n");

export const DEMO_OCR_LINES = DEMO_OCR_TEXT.split("\n").map((text, i) => ({
  text,
  lowConfidence: i === 2 || i === 5,
}));

export function demoSampleResult(): LabelCheckResult {
  return applyGatingToStaticResult518(sampleResultA.result as LabelCheckResult, {
    productTypes: [],
  });
}

export function demoCleanResult(): LabelCheckResult {
  const base = demoSampleResult();
  return {
    ...base,
    findings: [],
    manualItems: [],
    summary: { possible: 0, attention: 0, unknown: 0, pass: base.summary.pass || 11, manual: 0 },
    notice: undefined,
    skipJudgment: false,
    readable: true,
  };
}

export function demoManyResult(): LabelCheckResult {
  const base = demoSampleResult();
  const extra = Array.from({ length: 25 }, (_, i) => ({
    ...base.findings[i % Math.max(1, base.findings.length)],
    label: `예시 항목 ${i + 1}`,
    checkKey: `demo:many:${i}`,
  }));
  return {
    ...base,
    findings: [...base.findings, ...extra],
    summary: {
      ...base.summary,
      possible: (base.summary.possible || 0) + 10,
      attention: (base.summary.attention || 0) + 10,
    },
  };
}

export function demoUnreadableResult(): LabelCheckResult {
  const base = demoSampleResult();
  return {
    ...base,
    readable: false,
    skipJudgment: true,
    findings: [],
    manualItems: [],
    summary: { possible: 0, attention: 0, unknown: 0, pass: 0, manual: 0 },
    notice: "글자를 제대로 읽지 못했어요. 다시 찍거나 문구를 붙여넣어 주세요.",
    readStatus: "unreadable",
  };
}

/** 가짜 라벨 사진 — SVG를 canvas로 그려 Blob → File */
export async function makeDemoLabelFile(): Promise<File> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480">
  <rect width="360" height="480" fill="#fff"/>
  <rect x="24" y="24" width="312" height="432" rx="12" fill="#F7F8FC" stroke="#D5DAE6"/>
  <text x="48" y="80" font-size="22" font-family="sans-serif" fill="#111214">DEMO LABEL</text>
  <rect x="48" y="110" width="200" height="10" fill="#111214" rx="2"/>
  <rect x="48" y="132" width="240" height="8" fill="#E3E6EE" rx="2"/>
  <rect x="48" y="152" width="180" height="8" fill="#FFD9D2" rx="2"/>
  <rect x="48" y="180" width="220" height="8" fill="#E3E6EE" rx="2"/>
  <rect x="48" y="200" width="160" height="8" fill="#CFEFE0" rx="2"/>
</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  // canvas raster for image/* preview
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("demo_img"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 360, 480);
    ctx.drawImage(img, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/png");
    });
    return new File([png], "demo-label.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
