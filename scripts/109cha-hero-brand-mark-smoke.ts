/**
 * 109차 — 히어로 브랜드 마크 픽스처 스모크
 * 실행: npx tsx scripts/109cha-hero-brand-mark-smoke.ts
 */
import assert from "node:assert/strict";
import {
  buildHeroBrandMarkHtml,
  detectBrandScript,
  resolveHeroBrandMark,
  shouldShowBrandWordmark,
} from "../lib/hero-brand-mark";

function run() {
  // (a) 투명 PNG 로고 → logo
  const a = resolveHeroBrandMark({
    logoUrl: "https://cdn.example/logo-transparent.png",
    brandName: "glowiest",
    productName: "미스트 35mL",
  });
  assert.equal(a.kind, "logo");
  const aHtml = buildHeroBrandMarkHtml({
    logoUrl: "https://cdn.example/logo-transparent.png",
    brandName: "glowiest",
    productName: "미스트 35mL",
  });
  assert.match(aHtml, /data-hero-brand-mark="logo"/);
  assert.match(aHtml, /logo-transparent\.png/);

  // (b) 흰 배경 JPG 로고 → 여전히 logo (렌더는 패딩 래퍼로 완충)
  const b = resolveHeroBrandMark({
    logoUrl: "https://cdn.example/logo-white.jpg",
    brandName: "마유에스테",
    productName: "크림",
  });
  assert.equal(b.kind, "logo");

  // (c) 로고 없음 + 영문 브랜드 → wordmark latin lowercase
  const c = resolveHeroBrandMark({
    logoUrl: null,
    brandName: "Glowiest",
    productName: "Mist Spray",
  });
  assert.equal(c.kind, "wordmark");
  assert.equal(c.script, "latin");
  assert.equal(c.displayName, "glowiest");
  assert.equal(detectBrandScript("glowiest"), "latin");
  const cHtml = buildHeroBrandMarkHtml({
    brandName: "Glowiest",
    productName: "Mist Spray",
  });
  assert.match(cHtml, /data-hero-brand-mark="wordmark"/);
  assert.match(cHtml, /data-wordmark-script="latin"/);
  assert.match(cHtml, /data-wordmark-scrim="local"/);
  assert.match(cHtml, /rgba\(0,\s*0,\s*0,\s*0\.45\)/);
  assert.match(cHtml, />glowiest</);

  // (d) 로고 없음 + 한글 브랜드 → wordmark cjk
  const d = resolveHeroBrandMark({
    brandName: "마유에스테",
    productName: "마유 크림",
  });
  assert.equal(d.kind, "wordmark");
  assert.equal(d.script, "cjk");
  assert.equal(d.displayName, "마유에스테");
  const dHtml = buildHeroBrandMarkHtml({
    brandName: "마유에스테",
    productName: "마유 크림",
  });
  assert.match(dHtml, /마유에스테/);
  assert.match(dHtml, /data-wordmark-script="cjk"/);

  // 브랜드명 없음 / 상품명과 동일 → none
  assert.equal(shouldShowBrandWordmark(null, "상품"), false);
  assert.equal(shouldShowBrandWordmark("Same", "same"), false);
  assert.equal(
    resolveHeroBrandMark({ brandName: "", productName: "X" }).kind,
    "none",
  );
  assert.equal(
    resolveHeroBrandMark({ brandName: "Same Name", productName: "same name" }).kind,
    "none",
  );
  assert.equal(
    buildHeroBrandMarkHtml({ brandName: "Same", productName: "same" }),
    "",
  );

  // 극단: 긴 로고 URL도 마크업에 포함
  const long = buildHeroBrandMarkHtml({
    logoUrl: "https://cdn.example/very-wide-logo-banner-wordmark-horizontal.svg",
    brandName: "WideCo",
  });
  assert.match(long, /max-width:28%/);
  assert.match(long, /max-height:64px/);

  console.log("109cha-hero-brand-mark-smoke PASS");
}

run();
