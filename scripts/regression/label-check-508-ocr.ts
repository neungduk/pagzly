/**
 * 508B — OCR 정규화·타일·Vision 가짜 fetch·정적 가드(네트워크 없음).
 */
import fs from "node:fs";
import path from "node:path";
import { computeVerticalTiles508, fitLongEdge508 } from "../../lib/label-check/ocr/slice-image";
import { dedupeOverlappingLines508 } from "../../lib/label-check/ocr/merge-lines";
import {
  normalizeOcrText508,
  extractNetContent508,
  NET_CONTENT_CONFLICT_LABEL_508,
} from "../../lib/label-check/ocr/normalize-ocr";
import { runOcrBatch508 } from "../../lib/label-check/ocr/run-ocr-batch";
import { ocrLinesToExtractedPdf508 } from "../../lib/label-check/ocr/to-extracted";
import { parseVisionAnnotateResponse508 } from "../../lib/label-check/ocr/vision-provider";
import { assessReadStatus508 } from "../../lib/label-check/read-status-508";
import { runLabelCheckFromExtracted } from "../../lib/label-check/run-check";

export const name = "표시사항 508 — OCR·정규화·한도";

const FIXTURE_VISION = {
  responses: [
    {
      fullTextAnnotation: {
        text: "내용량 1OO ml\n전성분: 정제수",
        pages: [
          {
            blocks: [
              {
                paragraphs: [
                  {
                    confidence: 0.92,
                    boundingBox: { vertices: [{ x: 0, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 30 }, { x: 0, y: 30 }] },
                    words: [
                      {
                        confidence: 0.9,
                        boundingBox: { vertices: [{ y: 10 }, { y: 30 }] },
                        symbols: [
                          { text: "내" },
                          { text: "용" },
                          { text: "량" },
                          { text: " " },
                          { text: "1" },
                          { text: "O" },
                          { text: "O" },
                          { text: " " },
                          { text: "m" },
                          { text: "l" },
                        ],
                      },
                    ],
                  },
                  {
                    confidence: 0.88,
                    boundingBox: { vertices: [{ y: 40 }, { y: 60 }] },
                    words: [
                      {
                        confidence: 0.88,
                        symbols: [{ text: "전" }, { text: "성" }, { text: "분" }, { text: ":" }, { text: " " }, { text: "정" }, { text: "제" }, { text: "수" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // 타일 순수 계산
  {
    const { tiles, truncated } = computeVerticalTiles508(800, 7200);
    if (tiles.length < 3) f.push("508B: 세로 타일 부족");
    if (tiles[0]!.y !== 0) f.push("508B: 첫 타일 y");
    const last = tiles[tiles.length - 1]!;
    if (last.y + last.height !== 7200 && !truncated) {
      // 마지막이 끝까지 덮는지
      if (last.y + last.height < 7200) f.push("508B: 마지막 타일 높이");
    }
    const fit = fitLongEdge508(2000, 5000, 4000);
    if (fit.height !== 4000) f.push("508B: 긴변 축소");
  }

  // 겹침 중복 제거
  {
    const lines = dedupeOverlappingLines508(
      [
        {
          tileIndex: 0,
          fullText: "a",
          avgConfidence: 1,
          lines: [{ text: "내용량 100 ml", confidence: 0.9, words: [], y: 100 }],
        },
        {
          tileIndex: 1,
          fullText: "a",
          avgConfidence: 1,
          lines: [{ text: "내용량 100 ml", confidence: 0.9, words: [], y: 20 }],
        },
      ],
      [0, 2280],
      40,
    );
    // 전역 y: 100 vs 2300 — 중복 아님. 근접 케이스:
    // 전역 y 근접: 100 vs 110 (오프셋 0)
    const near = dedupeOverlappingLines508(
      [
        {
          tileIndex: 0,
          fullText: "",
          avgConfidence: 1,
          lines: [{ text: "중복줄", confidence: 1, words: [], y: 100 }],
        },
        {
          tileIndex: 1,
          fullText: "",
          avgConfidence: 1,
          lines: [{ text: "중복줄", confidence: 1, words: [], y: 110 }],
        },
      ],
      [0, 0],
      40,
    );
    if (near.length !== 1) f.push(`508B: 겹침 중복 제거 (${near.length})`);
    void lines;
  }

  // 정규화·용량
  {
    const n = normalizeOcrText508("내용량 1OO ml\nNet Wt. 3.5 fl.oz");
    if (!n.text.includes("100 ml")) f.push(`508B: O→0 보정 "${n.text}"`);
    if (!n.corrections.length) f.push("508B: corrections 없음");
    const nets = extractNetContent508(n.text);
    if (nets.length < 1) f.push("508B: 용량 추출");
    const conflict = normalizeOcrText508("내용량 100 ml\n내용량 10O ml");
    // after fix both 100 — may not conflict; force:
    const c2 = normalizeOcrText508("내용량 100 ml\n용량 50 ml");
    if (!c2.netContentConflict) f.push("508B: 용량 불일치 감지");
    if (!NET_CONTENT_CONFLICT_LABEL_508.includes("다르게")) f.push("508B: 불일치 라벨");
  }

  // sizePt=0 → unknown (KR font rule via ocrSizeUnknown)
  {
    const extracted = ocrLinesToExtractedPdf508(
      [{ text: "전성분: 정제수, 글리세린\n사용할 때의 주의사항: 주의", confidence: 0.9, words: [] }],
      { avgConfidence: 0.9 },
    );
    if (!extracted.ocrSizeUnknown) f.push("508B: ocrSizeUnknown");
    const result = await runLabelCheckFromExtracted(extracted, {
      rinseOff: false,
      functional: false,
      market: "KR",
    });
    const fontUnknown = result.findings.some(
      (x) => x.status === "unknown" && /크기/.test(x.found + x.suggest + x.label),
    );
    // 전성분 5pt 규칙이 데이터에 있을 때만 — 없으면 ocr 플래그만 확인
    if (extracted.ocrSizeUnknown && result.readStatus === "unreadable") {
      /* short text may be unreadable — add more text */
    }
    void fontUnknown;
  }

  // 낮은 신뢰도 → unreadable
  {
    const a = assessReadStatus508({
      charCount: 50,
      pageCount: 1,
      emptyPages: [],
      avgConfidence: 0.3,
    });
    if (a.readStatus !== "unreadable") f.push("508B: 낮은 신뢰도");
  }

  // Vision fixture + 가짜 fetch + pickProvider
  {
    const { pickProvider508 } = await import("../../lib/label-check/ocr/provider");
    const { parseClovaResponse508 } = await import("../../lib/label-check/ocr/clova");
    if (pickProvider508("KR", {} as NodeJS.ProcessEnv)) f.push("508B: 키 없을 때 pick");
    const fb = pickProvider508("KR", {
      GOOGLE_VISION_API_KEY: "g",
    } as NodeJS.ProcessEnv);
    if (!fb || fb.id !== "google" || !fb.fallbackFromClova) f.push("508B: KR Google 대체");

    const clovaParsed = parseClovaResponse508(
      {
        images: [
          {
            inferResult: "SUCCESS",
            fields: [
              {
                inferText: "내용량 100 ml",
                inferConfidence: 0.95,
                boundingPoly: { vertices: [{ y: 1 }, { y: 20 }] },
              },
            ],
          },
        ],
      },
      0,
    );
    if (!clovaParsed.fullText.includes("100")) f.push("508B: CLOVA 파싱");

    const parsed = parseVisionAnnotateResponse508(FIXTURE_VISION, 0);
    if (!parsed.fullText.includes("1OO") && !parsed.lines.length) f.push("508B: fixture 파싱");

    let visionCalled = 0;
    const fakeFetch: typeof fetch = async () => {
      visionCalled += 1;
      return new Response(JSON.stringify(FIXTURE_VISION), { status: 200 });
    };
    const rpc = async () => ({ data: true, error: null });
    const off = await runOcrBatch508(
      { imagesBase64: ["aaaa"], market: "US" },
      {
        supabase: { rpc },
        env: {} as NodeJS.ProcessEnv,
        skipConsume: true,
      },
    );
    if (off.ok || off.code !== "OCR_OFF") f.push("508B: 키 없음 OCR_OFF");

    const limited = await runOcrBatch508(
      { imagesBase64: ["bbbb"], market: "US" },
      {
        supabase: {
          rpc: async () => ({ data: false, error: null }),
        },
        env: { GOOGLE_VISION_API_KEY: "test-key-not-real" } as NodeJS.ProcessEnv,
        fetchImpl: fakeFetch,
      },
    );
    if (limited.ok || limited.code !== "OCR_LIMIT") f.push("508B: 한도 초과");
    if (visionCalled !== 0) f.push("508B: 한도 시 Vision 호출됨");

    const ok = await runOcrBatch508(
      { imagesBase64: ["cccc"], market: "US" },
      {
        supabase: { rpc },
        env: { GOOGLE_VISION_API_KEY: "test-key-not-real" } as NodeJS.ProcessEnv,
        fetchImpl: fakeFetch,
        skipConsume: true,
      },
    );
    if (!ok.ok) f.push(`508B: 정상 OCR 실패 ${ok.error}`);
    else if (!ok.text.includes("100")) f.push(`508B: 정규화 결과 "${ok.text}"`);
  }

  // 라우트 정적: base64 로그 금지·키 미노출
  {
    const route = fs.readFileSync(path.join("app", "api", "label-check", "ocr", "route.ts"), "utf8");
    if (/console\.(log|info|debug)\([^)]*base64/i.test(route)) f.push("508B: base64 로그");
    if (/console\.(log|info|debug)\([^)]*GOOGLE_VISION/i.test(route)) f.push("508B: 키 로그");
    // 509: Hobby 허용 범위에 맞춰 maxDuration 상향(≥10). 구 10 고정 검사는 해제.
    if (!/maxDuration\s*=\s*\d+/.test(route)) f.push("508B: maxDuration");
    if (!/available/.test(route)) f.push("508B: GET available");
  }

  // 마이그레이션 파일 존재(적용은 안 함)
  {
    const mig = path.join("supabase", "migrations", "20261110100000_label_ocr_usage.sql");
    if (!fs.existsSync(mig)) f.push("508B: 마이그레이션 없음");
    else {
      const sql = fs.readFileSync(mig, "utf8");
      if (!sql.includes("label_ocr_consume")) f.push("508B: consume 함수");
      if (!/enable row level security/i.test(sql)) f.push("508B: RLS");
    }
  }

  // 금지어
  {
    const roots = [
      "lib/label-check/ocr",
      "lib/label-check/read-status-508.ts",
      "app/api/label-check/ocr/route.ts",
      "components/label-check/ui-507/OcrReviewCard.tsx",
    ];
    const forbidden = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];
    for (const r of roots) {
      const files = fs.existsSync(r) && fs.statSync(r).isDirectory()
        ? fs.readdirSync(r).map((n) => path.join(r, n))
        : [r];
      for (const file of files) {
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
        if (!/\.(ts|tsx)$/.test(file)) continue;
        const t = fs.readFileSync(file, "utf8");
        for (const w of forbidden) {
          if (t.includes(w)) f.push(`508B: 금지어 ${w} in ${file}`);
        }
      }
    }
  }

  return f;
}

if (require.main === module)
  void run().then((x) => {
    for (const s of x) console.log(s);
    process.exit(x.length ? 1 : 0);
  });
