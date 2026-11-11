/**
 * 523 — 웹 공용 부품 기본 속성 출력 고정(golden).
 * 기준 HTML은 scripts/regression/golden-523/*.html
 * 갱신: GOLDEN_523_WRITE=1 npx tsx scripts/regression/label-check-523-golden.ts
 * (테스트 스위트에서는 쓰기 금지 — 불일치면 실패)
 */
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CheckStart517,
  OcrReview517,
  ResultView517,
  CheckBusyOverlay517,
} from "../../components/label-check/ui-517";
import sampleResultA from "../../lib/label-check/sample-result-a.json";
import type { LabelCheckInput, LabelCheckResult, LabelMarket } from "../../lib/label-check/types";

export const name = "표시사항 523 — 웹 부품 기준 출력(golden)";

const ROOT = process.cwd();
const GOLDEN_DIR = path.join(ROOT, "scripts/regression/golden-523");
const WRITE = process.env.GOLDEN_523_WRITE === "1";

const noop = () => {};
const baseInput: LabelCheckInput = {
  rinseOff: false,
  functional: false,
  market: "KR",
  productTypes: [],
};

function checkStart(market: LabelMarket, pasteText: string) {
  return React.createElement(CheckStart517, {
    market,
    onMarket: noop,
    file: null,
    onFile: noop,
    pasteText,
    onPasteText: noop,
    textScope: "ad_only" as const,
    onTextScope: noop,
    input: { ...baseInput, market },
    onInputPatch: noop,
    busy: false,
    progress: null,
    onSubmit: noop,
  });
}

function cases(): Array<{ id: string; node: React.ReactElement }> {
  const result = sampleResultA.result as LabelCheckResult;
  return [
    { id: "check-start-empty-kr", node: checkStart("KR", "") },
    { id: "check-start-paste-kr", node: checkStart("KR", "예시 문구 한 줄") },
    { id: "check-start-empty-us", node: checkStart("US", "") },
    { id: "check-start-paste-us", node: checkStart("US", "example paste line") },
    {
      id: "ocr-review",
      node: React.createElement(OcrReview517, {
        text: "첫 줄\n둘째 줄\n셋째 줄",
        onChange: noop,
        onConfirm: noop,
        onCancel: noop,
      }),
    },
    {
      id: "result-guest",
      node: React.createElement(ResultView517, {
        result,
        isMember: false,
        checkedOn: "2026-01-01",
        productName: "골든샘플",
        lawBaseline: null,
      }),
    },
    {
      id: "result-member",
      node: React.createElement(ResultView517, {
        result,
        isMember: true,
        savedId: "golden-id",
        checkedOn: "2026-01-01",
        productName: "골든샘플",
        lawBaseline: null,
      }),
    },
    {
      id: "busy-overlay",
      node: React.createElement(CheckBusyOverlay517, { busy: true }),
    },
  ];
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });

  for (const c of cases()) {
    let html: string;
    try {
      html = renderToStaticMarkup(c.node);
    } catch (e) {
      f.push(`523-golden: render 실패 ${c.id}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const file = path.join(GOLDEN_DIR, `${c.id}.html`);
    if (WRITE || !fs.existsSync(file)) {
      if (!WRITE && !fs.existsSync(file)) {
        f.push(`523-golden: 기준 파일 없음 ${c.id}.html (GOLDEN_523_WRITE=1 로 생성 후 커밋)`);
        continue;
      }
      fs.writeFileSync(file, html, "utf8");
      continue;
    }
    const want = fs.readFileSync(file, "utf8");
    if (want !== html) {
      f.push(`523-golden: 불일치 ${c.id}.html (웹 부품 기본 출력 변경됨)`);
    }
  }
  return f;
}
