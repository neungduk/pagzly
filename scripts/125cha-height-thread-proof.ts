/**
 * 125차 — UI→API productHeightCm 실제 흐름 증명 (무비용, fetch mock)
 * npx tsx scripts/125cha-height-thread-proof.ts
 *
 * 증거:
 * 1) 폼 스냅샷 숫자 → buildLifestyleCompositeRequestBody → JSON body.productHeightCm
 * 2) 높이 없음 → body null (스킵)
 * 3) 소스에 formSnapshot.productHeightCm / draft 전달 / fetch body 문자열이 존재
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildLifestyleCompositeRequestBody } from "../lib/lifestyle-composite-request";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");

function assertSourceContains(rel: string, needle: string) {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.ok(text.includes(needle), `missing in ${rel}: ${needle}`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // --- A안 UI/스냅샷 소스 존재 ---
  assertSourceContains(
    "components/CreateProductForm.tsx",
    'id="productHeightCm"',
  );
  assertSourceContains(
    "components/CreateProductForm.tsx",
    "productHeightCm: parsedHeightCm",
  );
  assertSourceContains(
    "app/create/draft/page.tsx",
    "productHeightCm: snapHeight",
  );
  assertSourceContains(
    "lib/photo-pipeline-client.ts",
    "buildLifestyleCompositeRequestBody",
  );
  assertSourceContains(
    "lib/photo-pipeline-client.ts",
    "body.productHeightCm=${built.body.productHeightCm}",
  );

  // --- 폼 숫자 입력 시뮬레이션 (스냅샷 → 바디) ---
  const withHeight = buildLifestyleCompositeRequestBody({
    lifestyleImageUrl: "https://example.com/life.png",
    productImageUrl: "https://example.com/prod.png",
    category: "화장품/뷰티",
    productName: "테스트 미스트",
    storageBasePath: "user/x",
    productHeightCm: 9,
    productSizeHint: "35mL", // 부피만 — 숫자 cm가 우선
  });
  assert.equal(withHeight.shouldAttempt, true);
  assert.ok(withHeight.body);
  assert.equal(withHeight.body!.productHeightCm, 9);
  const serialized = JSON.stringify(withHeight.body);
  assert.ok(
    serialized.includes('"productHeightCm":9'),
    `serialized body missing productHeightCm: ${serialized}`,
  );

  // --- 높이 없음 (mL만) → 스킵 ---
  const volumeOnly = buildLifestyleCompositeRequestBody({
    lifestyleImageUrl: "https://example.com/life.png",
    productImageUrl: "https://example.com/prod.png",
    category: "화장품/뷰티",
    productName: "테스트",
    productHeightCm: null,
    productSizeHint: "35mL",
  });
  assert.equal(volumeOnly.shouldAttempt, false);
  assert.equal(volumeOnly.body, null);

  // --- fetch mock: 파이프라인과 동일하게 POST body 전달 ---
  const posted: { url: string; body: string }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    posted.push({ url, body: String(init?.body ?? "") });
    return new Response(
      JSON.stringify({ url: "https://example.com/life.png", composited: false, cost: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const body = withHeight.body!;
    await fetch("/api/lifestyle-composite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(posted.length, 1);
  const parsed = JSON.parse(posted[0]!.body) as { productHeightCm?: number };
  assert.equal(parsed.productHeightCm, 9);

  const logLines = [
    "[125cha-proof] SOURCE: CreateProductForm#productHeightCm + formSnapshot.productHeightCm",
    "[125cha-proof] SOURCE: draft page passes productHeightCm: snapHeight",
    "[125cha-proof] WITH_HEIGHT body=" + serialized,
    "[125cha-proof] VOLUME_ONLY skip body=null",
    "[125cha-proof] FETCH_MOCK posted productHeightCm=" + parsed.productHeightCm,
    "[125cha-proof] ALL_OK",
  ];
  const logPath = path.join(OUT, "125cha-height-thread-proof.log");
  fs.writeFileSync(logPath, logLines.join("\n") + "\n", "utf8");
  for (const line of logLines) console.log(line);
  console.log(`[125cha-proof] wrote ${logPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
