/**
 * 524 — 사진형 PDF → OCR 분기 가드
 */
import fs from "node:fs";
import path from "node:path";
import { decidePdfRoute524 } from "../../lib/label-check/client-pdf-route-524";
import { NOTICE_IMAGE_PDF_497, NOTICE_PDF_AS_IMAGE_524 } from "../../lib/label-check/types";

export const name = "표시사항 524 — 사진형 PDF OCR 분기";

const ROOT = process.cwd();
const FORBIDDEN = ["무료", "요금", "1분", "위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function hangulHeavy(n: number): string {
  return "제품명 테스트크림 내용량 100ml 전성분 정제수 제조번호 LOT1 책임판매업자 테스트 ".repeat(n);
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // 1) decidePdfRoute524 순수 판단
  {
    const textEnough = decidePdfRoute524({
      pageCount: 1,
      pages: [{ page: 1, items: [{ text: hangulHeavy(2), sizePt: 10 }] }],
      emptyPages: [],
    });
    if (textEnough !== "text") f.push(`524: 충분 글자 → text 기대, got ${textEnough}`);

    const empty = decidePdfRoute524({
      pageCount: 1,
      pages: [{ page: 1, items: [] }],
      emptyPages: [1],
    });
    if (empty !== "ocr") f.push(`524: 글자 0 → ocr 기대, got ${empty}`);

    const mixed = decidePdfRoute524({
      pageCount: 2,
      pages: [
        { page: 1, items: [{ text: hangulHeavy(2), sizePt: 10 }] },
        { page: 2, items: [] },
      ],
      emptyPages: [2],
    });
    if (mixed !== "ocr") f.push(`524: mixed → ocr 기대, got ${mixed}`);

    const short = decidePdfRoute524({
      pageCount: 1,
      pages: [{ page: 1, items: [{ text: "짧음", sizePt: 10 }] }],
      emptyPages: [],
    });
    if (short !== "ocr") f.push(`524: 40자 미만 → ocr 기대, got ${short}`);
  }

  // 2) page / CheckScreen: ocrAvailable false면 probe 안 함
  {
    const page = read("app/label-check/page.tsx");
    const toss = read("toss-app/src/CheckScreen.tsx");
    for (const [label, src] of [
      ["page.tsx", page],
      ["CheckScreen.tsx", toss],
    ] as const) {
      if (!src.includes("probePdfRoute524")) f.push(`524: ${label}에 probePdfRoute524 없음`);
      if (!src.includes("ocrAvailable")) f.push(`524: ${label} ocrAvailable 없음`);
      // ocrAvailable이 false면 probe를 부르지 않음(같은 if 조건)
      if (!/ocrAvailable[\s\S]{0,240}probePdfRoute524/.test(src)) {
        f.push(`524: ${label} probe 직전에 ocrAvailable 가드 없음`);
      }
    }
  }

  // 3) NOTICE_IMAGE_PDF_497 불변 + 524 안내 존재
  {
    if (!NOTICE_IMAGE_PDF_497.includes("글자가 이미지로 들어 있어 읽지 못했습니다")) {
      f.push("524: NOTICE_IMAGE_PDF_497 문구 변경");
    }
    const types = read("lib/label-check/types.ts");
    if (!types.includes("NOTICE_PDF_AS_IMAGE_524")) f.push("524: NOTICE_PDF_AS_IMAGE_524 없음");
    if (!NOTICE_PDF_AS_IMAGE_524.includes("사진처럼 읽었어요")) {
      f.push("524: NOTICE_PDF_AS_IMAGE_524 문구 불일치");
    }
  }

  // 4) 금지어
  {
    for (const w of FORBIDDEN) {
      if (NOTICE_PDF_AS_IMAGE_524.includes(w)) f.push(`524: 새 안내 금지어 "${w}"`);
    }
  }

  // 모듈·함수 존재
  {
    const mod = read("lib/label-check/client-pdf-route-524.ts");
    if (!mod.includes("decideTextLayer518")) f.push("524: decideTextLayer518 미재사용");
    if (!mod.includes("TEXT_LAYER_MIN_CHARS_518")) f.push("524: TEXT_LAYER_MIN_CHARS_518 미재사용");
    if (!mod.includes("extractLabelPdfInBrowser")) f.push("524: extractLabelPdfInBrowser 미사용");
  }

  return f;
}
