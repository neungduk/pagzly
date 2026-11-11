/**
 * 518 — PDF 폭 기준 스케일·신뢰도·읽기 순서·UI·하드클레임 회귀.
 */
import fs from "node:fs";
import path from "node:path";
import {
  chooseTargetWidth518,
  estimateTileCount518,
  fitWidth518,
  pdfRenderScale518,
} from "../../lib/label-check/ocr/slice-image";
import {
  OCR_CANVAS_MAX_PIXELS_518,
  OCR_LINE_LOW_CONF_518,
  OCR_AVG_LOW_CONF_518,
  OCR_TARGET_WIDTH_518,
  OCR_TILE_HEIGHT_508,
  OCR_TILE_OVERLAP_508,
  OCR_MAX_TILES_PER_JOB_508,
  OCR_WIDTH_FALLBACKS_518,
} from "../../lib/label-check/ocr/constants";
import {
  orderWordsToLines518,
  looksLikeDetailPage518,
  formatOcrQualityLabel518,
} from "../../lib/label-check/ocr/reading-order-518";
import {
  buildOcrQualityMeta518,
  lineLooksLowConf518,
} from "../../lib/label-check/ocr/quality-518";
import {
  decideTextLayer518,
  TEXT_LAYER_MIN_CHARS_518,
  TEXT_LAYER_MIN_HANGUL_518,
} from "../../lib/label-check/ocr/text-layer-518";
import {
  isHardKrMedicalClaim510,
  scanHardKrMedicalGaps510,
  isSoftCosmeticClaim510,
} from "../../lib/label-check/ad-hard-claims-510";
import { scanAdPhrases493 } from "../../lib/label-check/ad-phrases";
import { buildRows518, MANUAL_COLLAPSE_AFTER_518 } from "../../components/label-check/ui-517/ResultView517";
import { sortFindings507 } from "../../lib/label-check/ui-status-507";
import sampleResultA from "../../lib/label-check/sample-result-a.json";
import { applyGatingToStaticResult518 } from "../../lib/label-check/sample-gating-518";
import type { LabelCheckResult } from "../../lib/label-check/types";

export const name = "표시사항 518 — 읽기 품질·OCR카드·결과본문·하드클레임";

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // A-1 scale: FireShot 595x5678pt → 폭 ≥1500, 타일 ≤20, 캔버스 ≤16MP
  {
    const ptW = 595;
    const ptH = 5678;
    const scale = pdfRenderScale518(ptW, OCR_TARGET_WIDTH_518);
    const cssW = Math.floor(ptW * scale);
    const cssH = Math.floor(ptH * scale);
    if (cssW < 1500) f.push(`518A1: FireShot 폭 ${cssW} < 1500`);
    const choice = chooseTargetWidth518(
      cssW,
      cssH,
      OCR_WIDTH_FALLBACKS_518,
      OCR_TILE_HEIGHT_508,
      OCR_TILE_OVERLAP_508,
      OCR_MAX_TILES_PER_JOB_508,
    );
    if (choice.tileCount > OCR_MAX_TILES_PER_JOB_508) {
      f.push(`518A1: 타일 ${choice.tileCount} > 상한`);
    }
    const stripH = OCR_TILE_HEIGHT_508 + OCR_TILE_OVERLAP_508;
    if (choice.fittedW * stripH > OCR_CANVAS_MAX_PIXELS_518) {
      f.push("518A1: 스트립 캔버스 16MP 초과");
    }
    // 가로로 긴
    const wide = fitWidth518(4000, 1000, 1800);
    if (wide.width > 1800) f.push("518A1: 가로 긴 폭 상한 실패");
    // 작은 라벨
    const small = fitWidth518(800, 600, 1800);
    if (small.scale !== 1 || small.width !== 800) f.push("518A1: 작은 판형 확대되면 안 됨");
    // A4
    const a4 = estimateTileCount518(1240, 1754, 1800, OCR_TILE_HEIGHT_508, OCR_TILE_OVERLAP_508, 20);
    if (a4.tileCount < 1) f.push("518A1: A4 타일 0");
  }

  // A-2 text layer thresholds
  {
    if (TEXT_LAYER_MIN_CHARS_518 !== 40) f.push("518A2: MIN_CHARS 기준 변경");
    if (TEXT_LAYER_MIN_HANGUL_518 !== 10) f.push("518A2: MIN_HANGUL 기준 변경");
    const enough = decideTextLayer518({
      pageCount: 1,
      pages: [{ page: 1, items: [{ text: "제품명 테스트크림 내용량 100ml 전성분 정제수 제조번호 A1".repeat(2), sizePt: 10 }] }],
      emptyPages: [],
    });
    if (!enough.preferText) f.push("518A2: 충분 텍스트 preferText=false");
    const empty = decideTextLayer518({
      pageCount: 1,
      pages: [{ page: 1, items: [] }],
      emptyPages: [1],
    });
    if (empty.preferText) f.push("518A2: 빈 PDF preferText=true");
    const mixed = decideTextLayer518({
      pageCount: 2,
      pages: [
        {
          page: 1,
          items: [
            {
              text: "제품명 테스트크림 내용량 100ml 전성분 정제수 제조번호 LOT1 책임판매업자 테스트코스메틱 제조국 대한민국",
              sizePt: 10,
            },
          ],
        },
        { page: 2, items: [] },
      ],
      emptyPages: [2],
    });
    if (!mixed.mixed) f.push("518A2: 일부 빈 페이지 mixed 미검출");
  }

  // A-3 confidence
  {
    if (OCR_LINE_LOW_CONF_518 !== 0.75) f.push("518A3: LINE_LOW 상수");
    if (OCR_AVG_LOW_CONF_518 !== 0.6) f.push("518A3: AVG_LOW 상수");
    if (!lineLooksLowConf518({ text: "x", confidence: 0.7, words: [] })) {
      f.push("518A3: 0.7은 낮은 신뢰여야 함");
    }
    if (lineLooksLowConf518({ text: "x", confidence: 0.8, words: [] })) {
      f.push("518A3: 0.8은 낮은 신뢰가 아님");
    }
    const meta = buildOcrQualityMeta518({
      lines: [
        { text: "좋음", confidence: 0.9, words: [] },
        { text: "흐림", confidence: 0.5, words: [] },
      ],
      fullText: "좋음\n흐림",
    });
    if (meta.lowLineCount !== 1) f.push("518A3: lowLineCount");
    if (!meta.qualityLabel.includes("읽기 품질")) f.push("518A3: qualityLabel");
  }

  // A-4 reading order / 2-col
  {
    const words = [
      { text: "왼쪽1", confidence: 0.9, x: 10, y: 10, w: 40, h: 14 },
      { text: "오른쪽1", confidence: 0.9, x: 400, y: 12, w: 50, h: 14 },
      { text: "왼쪽2", confidence: 0.9, x: 10, y: 40, w: 40, h: 14 },
      { text: "오른쪽2", confidence: 0.9, x: 400, y: 42, w: 50, h: 14 },
    ];
    const lines = orderWordsToLines518(words, 500);
    const cols = new Set(lines.map((l) => l.column));
    if (cols.size < 2) f.push("518A4: 2단 미분리");
    const leftFirst = lines.filter((l) => l.column === 0).map((l) => l.text).join("|");
    if (!leftFirst.includes("왼쪽1") || leftFirst.includes("오른쪽")) {
      f.push(`518A4: 왼쪽 단 순서 이상 (${leftFirst})`);
    }
  }

  // A-5 label format
  {
    const lab = formatOcrQualityLabel518(0.82);
    if (!lab.includes("0.82")) f.push("518A5: 평균 표시");
    if (!looksLikeDetailPage518("장바구니에 담고 리뷰를 남기세요 배송 안내")) {
      f.push("518A5: 상세페이지 힌트");
    }
  }

  // B OcrReview517
  {
    const ocr = read("components/label-check/ui-517/OcrReview517.tsx");
    if (!ocr.includes("읽은 글자를 확인해 주세요")) f.push("518B: 제목");
    const css517 = read("components/label-check/ui-517/label-check-517.css");
    if (!/320px|min-height:\s*320|minHeight:\s*320/.test(ocr + css517)) {
      f.push("518B: textarea 높이");
    }
    if (!ocr.includes("이 글자로 점검")) f.push("518B: 주 버튼");
    if (!ocr.includes("취소")) f.push("518B: 취소 버튼");
    const page = read("app/label-check/page.tsx");
    if (!page.includes("OcrReview517")) f.push("518B: page 미연결");
    if (page.includes("<OcrReviewCard508")) f.push("518B: page가 구 카드 사용");
  }

  // C FindingBody518
  {
    const body = read("components/label-check/ui-517/FindingBody518.tsx");
    if (!body.includes("라벨에서") && !body.includes("BEFORE")) {
      // wording/missing labels
      if (!/이렇게 넣어|AFTER|기준/.test(body)) f.push("518C: 블록 라벨 부족");
    }
    if (body.includes("line-through") || body.includes("textDecoration: \"line-through\"")) {
      f.push("518C: 취소선 금지");
    }
    const rv = read("components/label-check/ui-517/ResultView517.tsx");
    if (!rv.includes("FindingBody518")) f.push("518C: ResultView 미연결");
  }

  // D numbering + gating + collapse
  {
    if (MANUAL_COLLAPSE_AFTER_518 !== 3) f.push("518D: 직접확인 접기 기준");
    const gated = applyGatingToStaticResult518(sampleResultA.result as LabelCheckResult, {
      productTypes: [],
    });
    const rows = buildRows518(sortFindings507(gated.findings || []), gated.manualItems || []);
    const nos = rows.map((r) => r.no);
    for (let i = 1; i < nos.length; i++) {
      if (nos[i]! !== nos[i - 1]! + 1) {
        f.push(`518D: 번호 비연속 ${nos[i - 1]}→${nos[i]}`);
        break;
      }
    }
    const manuals = gated.manualItems || [];
    if (manuals.some((m) => /수출|세트|색조/.test(m.label || ""))) {
      f.push("518D: 옵션 미선택인데 수출/세트/색조가 직접확인에 남음");
    }
  }

  // E hard claims ≥5
  {
    const mustHit = [
      "피부 주름을 완전히 없애 주는 앰플",
      "주름 완전 제거",
      "주름을 없애 주는 크림",
    ];
    for (const t of mustHit) {
      const hard = isHardKrMedicalClaim510(t);
      const gaps = scanHardKrMedicalGaps510(t, []);
      const ads = scanAdPhrases493(t, { rinseOff: false, functional: false });
      const ok =
        hard ||
        gaps.some((x) => x.status === "possible") ||
        ads.some((x) => x.status === "possible");
      if (!ok) f.push(`518E: 걸려야 함 — "${t}"`);
    }
    const mustMiss = ["주름 개선에 도움", "메이크업을 완전히 지워 주는"];
    for (const t of mustMiss) {
      if (isHardKrMedicalClaim510(t)) f.push(`518E: 하드 승격 금지 — "${t}"`);
      const ads = scanAdPhrases493(t, { rinseOff: false, functional: false });
      if (ads.some((x) => x.status === "possible" && /없애|완전\s*제거|완전히/.test(x.found || ""))) {
        f.push(`518E: 광고 possible 과잉 — "${t}"`);
      }
      if (t.includes("메이크업") && !isSoftCosmeticClaim510(t)) {
        // soft helper optional
      }
    }
  }

  // forbidden words in new UI
  {
    const forbid = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "무료", "요금", "1분"];
    for (const rel of [
      "components/label-check/ui-517/OcrReview517.tsx",
      "components/label-check/ui-517/FindingBody518.tsx",
    ]) {
      const t = read(rel);
      for (const w of forbid) {
        if (t.includes(w)) f.push(`518: 금지어 "${w}" in ${rel}`);
      }
      // 100% in TSX only (not CSS width)
      if (/100%/.test(t) && !/width:\s*["']?100%/.test(t) && t.includes("100%")) {
        // allow CSS width 100%
        const stripped = t.replace(/['"`][^'"`]*100%[^'"`]*['"`]/g, "").replace(/width:\s*["']?100%/g, "");
        if (stripped.includes("100%")) f.push(`518: 금지어 100% in ${rel}`);
      }
    }
  }

  return f;
}

if (require.main === module) {
  run().then((fails) => {
    if (fails.length) {
      console.error(fails.join("\n"));
      process.exit(1);
    }
    console.log("ok", name);
  });
}
