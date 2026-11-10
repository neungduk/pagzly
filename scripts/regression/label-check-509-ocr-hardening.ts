/**
 * 509 — OCR 마무리 보강: 타임아웃·조각 상한·한도 문구·공용 확인 컴포넌트.
 */
import * as fs from "fs";
import * as path from "path";
import { createClovaProvider508 } from "../../lib/label-check/ocr/clova";
import { createVisionProvider508 } from "../../lib/label-check/ocr/google-vision";
import { wrapFetchWithTimeout509, isOcrTimeoutError509 } from "../../lib/label-check/ocr/fetch-timeout";
import {
  ERR_OCR_DAILY_LIMIT_509,
  ERR_OCR_LIMIT_508,
  ERR_OCR_TIMEOUT_509,
  OCR_FETCH_TIMEOUT_MS_509,
  OCR_MAX_TILES_PER_REQUEST_CLOVA_509,
  OCR_MAX_TILES_PER_REQUEST_GOOGLE_509,
  OCR_PARALLEL_508,
} from "../../lib/label-check/ocr/constants";
import { maxTilesPerOcrRequest509, runOcrBatch508 } from "../../lib/label-check/ocr/run-ocr-batch";
import { batchOcrTiles508 } from "../../lib/label-check/client-ocr-prepare";

export const name = "표시사항 509 — OCR 타임아웃·조각상한·한도문구";

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // (1) 공급자 fetch 8초 초과 → OCR_TIMEOUT, 키·원문 없음
  {
    const hungFetch: typeof fetch = async () =>
      new Promise(() => {
        /* never settles — AbortController must win */
      });

    const timed = wrapFetchWithTimeout509(hungFetch, 50);
    let threw: unknown;
    try {
      await timed("https://example.invalid/ocr");
    } catch (e) {
      threw = e;
    }
    if (!isOcrTimeoutError509(threw)) f.push("509: wrapFetch timeout 미발생");
    const msg = threw instanceof Error ? threw.message : String(threw);
    if (/GOOGLE_VISION|CLOVA_OCR|api[_-]?key|secret|invoke/i.test(msg)) {
      f.push("509: 타임아웃 메시지에 키/원문");
    }

    // 공급자 공장에 짧은 타임아웃 fetch를 넣으면 이중 wrap이어도 안쪽 Abort가 먼저 난다
    const shortWrap = wrapFetchWithTimeout509(hungFetch, 40);
    try {
      const cp = createClovaProvider508({
        invokeUrl: "https://example.invalid/clova",
        secret: "test-secret-not-real",
        fetchImpl: shortWrap,
        parallel: 1,
      });
      await cp.annotateDocumentText({ imagesBase64: ["YQ=="] });
      f.push("509: Clova 타임아웃 미발생");
    } catch (e) {
      if (!isOcrTimeoutError509(e)) f.push("509: Clova OCR_TIMEOUT 아님");
      const m = e instanceof Error ? e.message : "";
      if (/test-secret|CLOVA_OCR|invoke/i.test(m)) f.push("509: Clova 타임아웃에 키");
    }
    try {
      const vp = createVisionProvider508({
        apiKey: "test-key-not-real",
        fetchImpl: shortWrap,
        parallel: 1,
      });
      await vp.annotateDocumentText({ imagesBase64: ["YQ=="] });
      f.push("509: Vision 타임아웃 미발생");
    } catch (e) {
      if (!isOcrTimeoutError509(e)) f.push("509: Vision OCR_TIMEOUT 아님");
      const m = e instanceof Error ? e.message : "";
      if (/test-key-not-real|AIza|secret/i.test(m)) f.push("509: Vision 타임아웃에 키");
    }

    const timeoutProvider = {
      name: "fake-timeout",
      annotateDocumentText: async () => {
        const err = new Error("OCR_TIMEOUT");
        (err as Error & { code: string }).code = "OCR_TIMEOUT";
        throw err;
      },
    };
    const out = await runOcrBatch508(
      { imagesBase64: ["YQ=="], market: "US" },
      {
        supabase: { rpc: async () => ({ data: true, error: null }) },
        provider: timeoutProvider,
        providerId: "google",
        skipConsume: true,
      },
    );
    if (out.ok || out.code !== "OCR_TIMEOUT") f.push("509: OCR_TIMEOUT 코드");
    if (!out.ok && out.error !== ERR_OCR_TIMEOUT_509) f.push("509: OCR_TIMEOUT 문구");
    if (!out.ok && /GOOGLE_VISION|apiKey|key=/i.test(out.error)) f.push("509: 응답에 키");

    // consume 되돌림 주석 존재
    const runSrc = fs.readFileSync(path.join("lib", "label-check", "ocr", "run-ocr-batch.ts"), "utf8");
    if (!/consume한.*되돌리지/.test(runSrc) && !/되돌리지 않음/.test(runSrc)) {
      f.push("509: consume 미되돌림 주석");
    }
    const clovaSrc = fs.readFileSync(path.join("lib", "label-check", "ocr", "clova.ts"), "utf8");
    const visionSrc = fs.readFileSync(path.join("lib", "label-check", "ocr", "vision-provider.ts"), "utf8");
    if (!/되돌리지 않음/.test(clovaSrc)) f.push("509: clova consume 주석");
    if (!/되돌리지 않음/.test(visionSrc)) f.push("509: vision consume 주석");
    if (!/wrapFetchWithTimeout509/.test(clovaSrc) || !/wrapFetchWithTimeout509/.test(visionSrc)) {
      f.push("509: AbortController wrap 미적용");
    }
    if (OCR_FETCH_TIMEOUT_MS_509 !== 8000) f.push("509: 타임아웃 8초 상수");
  }

  // (2) 조각 상한 분할(CLOVA 6 / Google 8)
  {
    if (maxTilesPerOcrRequest509("clova") !== OCR_MAX_TILES_PER_REQUEST_CLOVA_509) {
      f.push("509: CLOVA 상한 함수");
    }
    if (maxTilesPerOcrRequest509("google") !== OCR_MAX_TILES_PER_REQUEST_GOOGLE_509) {
      f.push("509: Google 상한 함수");
    }
    if (OCR_MAX_TILES_PER_REQUEST_CLOVA_509 !== 6 || OCR_MAX_TILES_PER_REQUEST_GOOGLE_509 !== 8) {
      f.push("509: 조각 상수 6/8");
    }
    const tiles = Array.from({ length: 14 }, (_, i) => ({
      base64: "x".repeat(100),
      offsetY: i * 100,
    }));
    const clovaBatches = batchOcrTiles508(tiles, { maxTilesPerRequest: 6 });
    if (clovaBatches.some((b) => b.length > 6)) f.push("509: CLOVA 배치>6");
    if (clovaBatches.reduce((n, b) => n + b.length, 0) !== 14) f.push("509: CLOVA 배치 합");
    const googleBatches = batchOcrTiles508(tiles, { maxTilesPerRequest: 8 });
    if (googleBatches.some((b) => b.length > 8)) f.push("509: Google 배치>8");

    // 계산식: ceil(tiles/parallel)*timeout ≤ maxDuration
    const wavesClova = Math.ceil(OCR_MAX_TILES_PER_REQUEST_CLOVA_509 / OCR_PARALLEL_508);
    const wavesGoogle = Math.ceil(OCR_MAX_TILES_PER_REQUEST_GOOGLE_509 / OCR_PARALLEL_508);
    const worstClovaSec = wavesClova * (OCR_FETCH_TIMEOUT_MS_509 / 1000);
    const worstGoogleSec = wavesGoogle * (OCR_FETCH_TIMEOUT_MS_509 / 1000);
    // route maxDuration=30 must cover both
    const route = fs.readFileSync(path.join("app", "api", "label-check", "ocr", "route.ts"), "utf8");
    const m = route.match(/maxDuration\s*=\s*(\d+)/);
    const maxDur = m ? Number(m[1]) : 0;
    if (maxDur < worstClovaSec || maxDur < worstGoogleSec) {
      f.push(`509: maxDuration ${maxDur} < worst ${Math.max(worstClovaSec, worstGoogleSec)}`);
    }
  }

  // (3) 한도 문구 두 종류
  {
    if (!ERR_OCR_LIMIT_508.includes("이번 달")) f.push("509: 월 한도 문구");
    if (!ERR_OCR_DAILY_LIMIT_509.includes("오늘")) f.push("509: 일 한도 문구");
    const route = fs.readFileSync(path.join("app", "api", "label-check", "ocr", "route.ts"), "utf8");
    if (!route.includes("ERR_OCR_DAILY_LIMIT_509") || !route.includes('limitKind: "daily"')) {
      f.push("509: 라우트 일일 한도");
    }
    const banner = fs.readFileSync(
      path.join("components", "label-check", "ui-507", "OcrLimitBanner.tsx"),
      "utf8",
    );
    if (!banner.includes("CTA_OCR_PASTE_509") || !banner.includes("onFocusPaste")) {
      f.push("509: 한도 배너 붙여넣기 CTA");
    }
    if (banner.includes("발견된 항목이 없어요")) f.push("509: 한도 배너 금지 문구");
  }

  // (4) 공용 확인 컴포넌트 게스트·회원 양쪽
  {
    const guest = fs.readFileSync(path.join("app", "label-check", "page.tsx"), "utf8");
    const member = fs.readFileSync(path.join("app", "label-check", "new", "page.tsx"), "utf8");
    const review = fs.readFileSync(
      path.join("components", "label-check", "ui-507", "OcrReviewCard.tsx"),
      "utf8",
    );
    if (!guest.includes("OcrReviewCard508") || !member.includes("OcrReviewCard508")) {
      f.push("509: 공용 OcrReviewCard 미사용");
    }
    if (!review.includes("transferNotice") || !review.includes("NOTICE_OCR_LOW_CONF_509")) {
      f.push("509: 확인 카드 전송안내/신뢰도");
    }
    if (!guest.includes("transferNotice") || !member.includes("transferNotice")) {
      f.push("509: 페이지 transferNotice 미전달");
    }
    // 320/390 가로 스크롤 정적: overflow-x + maxWidth
    const css = fs.readFileSync(
      path.join("components", "label-check", "ui-507", "label-check-507.css"),
      "utf8",
    );
    if (!/overflow-x:\s*hidden/.test(css)) f.push("509: CSS overflow-x");
    if (!css.includes("lc507-ocr-review") || !/max-width:\s*100%/.test(css)) {
      f.push("509: OCR 확인 카드 폭 CSS");
    }
    if (!review.includes("lc507-ocr-review")) f.push("509: 확인 카드 class");
  }

  // 금지어
  {
    const roots = [
      "lib/label-check/ocr",
      "components/label-check/ui-507/OcrReviewCard.tsx",
      "components/label-check/ui-507/OcrLimitBanner.tsx",
      "app/label-check/new/page.tsx",
    ];
    const forbidden = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];
    for (const r of roots) {
      const files =
        fs.existsSync(r) && fs.statSync(r).isDirectory()
          ? fs.readdirSync(r).map((n) => path.join(r, n))
          : [r];
      for (const file of files) {
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
        if (!/\.(ts|tsx)$/.test(file)) continue;
        const t = fs.readFileSync(file, "utf8");
        for (const w of forbidden) {
          if (t.includes(w)) f.push(`509: 금지어 ${w} in ${file}`);
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
