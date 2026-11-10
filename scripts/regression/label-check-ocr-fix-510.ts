/**
 * OCR 보정 회귀(실서버 시험에서 발견): 영문 'ol' 오염, fl oz↔ml 오탐, 단어 단위 줄바꿈, Google 공백 복원.
 */
import { normalizeOcrText508, hasNetContentConflict510 } from "../../lib/label-check/ocr/normalize-ocr";
import { parseClovaResponse508 } from "../../lib/label-check/ocr/clova";
import { parseVisionAnnotateResponse508 } from "../../lib/label-check/ocr/vision-provider";

export const name = "표시사항 OCR 보정 — 영문 ol 보존·fl oz↔ml·줄·공백";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) f.push(m); };

  // 1) 영문 단어의 'ol' 보존
  const en = normalizeOcrText508("Butylene Glycol, Limonene, Linalool, Alcohol, Retinol, Cholesterol");
  ok(en.text === "Butylene Glycol, Limonene, Linalool, Alcohol, Retinol, Cholesterol", `영문 변형됨: ${en.text}`);
  ok(en.netContents.length === 0, "영문 성분명에서 용량이 잡힘");

  // 2) 숫자 O 보정은 유지
  ok(normalizeOcrText508("내용량: 1OO ml").text.includes("100 ml"), "1OO ml 보정 실패");
  ok(normalizeOcrText508("용량 10Oml").text.includes("100ml"), "10Oml 보정 실패");
  ok(normalizeOcrText508("중량 O5g").text.includes("05g"), "O5g 보정 실패");

  // 3) fl oz ↔ ml 은 충돌 아님, 진짜 다른 값은 충돌
  const us = normalizeOcrText508("Net Wt. 3.38 fl oz (100 mL)");
  ok(us.netContentConflict === false, "3.38 fl oz / 100 ml 이 충돌로 표시됨");
  ok(hasNetContentConflict510([{ value: 100, unit: "ml", raw: "" }, { value: 50, unit: "ml", raw: "" }]) === true, "100ml vs 50ml 충돌 미검출");
  ok(hasNetContentConflict510([{ value: 100, unit: "ml", raw: "" }, { value: 50, unit: "g", raw: "" }]) === false, "ml vs g 는 충돌 아님");

  // 4) CLOVA: lineBreak 로 줄 구성
  const clova = parseClovaResponse508({
    images: [{ inferResult: "SUCCESS", fields: [
      { inferText: "피부", inferConfidence: 0.99, lineBreak: false, boundingPoly: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 20 }] } },
      { inferText: "재생", inferConfidence: 0.98, lineBreak: true, boundingPoly: { vertices: [{ x: 20, y: 0 }, { x: 30, y: 20 }] } },
      { inferText: "내용량:", inferConfidence: 0.97, lineBreak: false, boundingPoly: { vertices: [{ x: 0, y: 40 }, { x: 10, y: 60 }] } },
      { inferText: "100", inferConfidence: 0.99, lineBreak: false, boundingPoly: { vertices: [{ x: 20, y: 40 }, { x: 30, y: 60 }] } },
      { inferText: "ml", inferConfidence: 0.99, lineBreak: true, boundingPoly: { vertices: [{ x: 40, y: 40 }, { x: 50, y: 60 }] } },
    ] }],
  }, 0);
  ok(clova.fullText === "피부 재생\n내용량: 100 ml", `CLOVA 줄 구성 오류: ${JSON.stringify(clova.fullText)}`);

  // 5) Google: detectedBreak 로 공백 복원
  const sym = (t: string, b?: string) => ({ text: t, confidence: 0.99, property: b ? { detectedBreak: { type: b } } : undefined });
  const words = [
    { confidence: 0.99, symbols: [sym("N"), sym("e"), sym("t", "SPACE")] },
    { confidence: 0.99, symbols: [sym("W"), sym("t"), sym(".", "SPACE")] },
    { confidence: 0.99, symbols: [sym("1"), sym("0"), sym("0", "SPACE")] },
    { confidence: 0.99, symbols: [sym("m"), sym("L", "LINE_BREAK")] },
  ];
  const g = parseVisionAnnotateResponse508({
    responses: [{ fullTextAnnotation: { text: "", pages: [{ blocks: [{ paragraphs: [{ confidence: 0.99, words }] }] }] } }],
  }, 0);
  ok(g.lines[0]?.text === "Net Wt. 100 mL", `Google 공백 복원 오류: ${JSON.stringify(g.lines[0]?.text)}`);

  return f;
}
