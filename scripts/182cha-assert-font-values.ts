/**
 * 182차 — FONT_SIZE 값 assert + before/after HTML Track A-only 증명.
 *   npx tsx scripts/182cha-assert-font-values.ts
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { FONT_SIZE } from "../lib/design-tokens";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "182cha-export");

const EXPECTED: Record<string, string> = {
  micro: "9.5px",
  diagramTick: "9px",
  label: "10px",
  caption: "11px",
  xs: "12px",
  sm: "13px",
  bodySm: "14px",
  body: "15px",
  bodyLg: "16px",
  checkMark: "18px",
  bentoValue: "15px",
  bentoValueHero: "19px",
  diagramLabel: "12px",
  diagramEmph: "10px",
  diagramTitle: "11px",
  root: "16px",
  footnoteSup: "0.6em",
  section: "1.5rem",
  sectionLg: "1.75rem",
  sectionXl: "2rem",
  sectionSm: "1.35rem",
  sectionXs: "1.25rem",
  price: "2.25rem",
  statNumber: "3rem",
  statBarValue: "1.5rem",
  keywordClamp: "clamp(2rem,10vw,3.5rem)",
  keywordClampCard: "clamp(1.5rem,8vw,2.25rem)",
  categoryKeyword: "clamp(2.25rem,11vw,4rem)",
  seoH2: "1rem",
  brandMono: "1.15rem",
};

function sha(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function countSizes(html: string) {
  const m: Record<string, number> = {};
  const re = /font-size:([^;"']+)/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(html))) m[x[1]] = (m[x[1]] || 0) + 1;
  return m;
}

function pickAfterLabel(html: string, label: string, preferH2 = false): string | null {
  const needle = `>${label}</p>`;
  const i = html.indexOf(needle);
  if (i < 0) return null;
  const slice = html.slice(i, i + 600);
  if (preferH2) {
    const h2 = slice.match(/<h2[^>]*font-size:([^;]+)/);
    if (h2) return h2[1];
  }
  const m = slice.match(/font-size:([^;]+)/);
  return m?.[1] ?? null;
}

/** Track A 두 곳만 before 값으로 되돌림 (style 속성 내부 따옴표 무시) */
function revertTrackA(after: string): string {
  let s = after;
  const noticeIdx = s.indexOf(">NOTICE</p>");
  if (noticeIdx >= 0) {
    const windowEnd = noticeIdx + 350;
    const head = s.slice(0, noticeIdx);
    let win = s.slice(noticeIdx, windowEnd);
    win = win.replace(/<h2 style="font-size:1\.5rem;margin:0"/, '<h2 style="font-size:1.25rem;margin:0"');
    s = head + win + s.slice(windowEnd);
  }
  const storyIdx = s.indexOf(">STORY</p>");
  if (storyIdx >= 0) {
    const windowEnd = storyIdx + 700;
    const head = s.slice(0, storyIdx);
    let win = s.slice(storyIdx, windowEnd);
    // STORY 직후 첫 번째 font-size:1.5rem (디스플레이 헤드라인)
    win = win.replace(/font-size:1\.5rem/, "font-size:1.35rem");
    s = head + win + s.slice(windowEnd);
  }
  return s;
}

const valueMismatch = Object.keys(EXPECTED).filter(
  (k) => (FONT_SIZE as Record<string, string>)[k] !== EXPECTED[k],
);

const cats = ["beauty", "fashion", "food", "electronics", "living", "pet"];
const trackAProof: Record<string, unknown> = {};
let allOk = true;

for (const k of cats) {
  const before = fs.readFileSync(path.join(OUT, `before-${k}.html`), "utf8");
  const after = fs.readFileSync(path.join(OUT, `after-${k}.html`), "utf8");
  const reverted = revertTrackA(after);
  const same = sha(reverted) === sha(before);
  const cb = countSizes(before);
  const ca = countSizes(after);
  const sizeDelta: Record<string, { before: number; after: number }> = {};
  for (const key of new Set([...Object.keys(cb), ...Object.keys(ca)])) {
    if ((cb[key] || 0) !== (ca[key] || 0)) {
      sizeDelta[key] = { before: cb[key] || 0, after: ca[key] || 0 };
    }
  }
  // 기대: font-size 카운트 변화가 1.25/1.35/1.5rem 세 키뿐, 순증감 = caution+story
  const expectedDelta =
    Object.keys(sizeDelta).every((x) => ["1.25rem", "1.35rem", "1.5rem"].includes(x)) &&
    (sizeDelta["1.5rem"]?.after ?? 0) - (sizeDelta["1.5rem"]?.before ?? 0) === 2 &&
    (sizeDelta["1.35rem"]?.before ?? 0) - (sizeDelta["1.35rem"]?.after ?? 0) === 1 &&
    (sizeDelta["1.25rem"]?.before ?? 0) - (sizeDelta["1.25rem"]?.after ?? 0) === 1;

  trackAProof[k] = {
    hashSameIfRevert: same,
    expectedSizeDeltaOnly: expectedDelta,
    sizeDelta,
    caution: {
      before: pickAfterLabel(before, "NOTICE", true),
      after: pickAfterLabel(after, "NOTICE", true),
    },
    story: {
      before: pickAfterLabel(before, "STORY"),
      after: pickAfterLabel(after, "STORY"),
    },
    beforeSha: sha(before),
    afterSha: sha(after),
  };
  if (!same || !expectedDelta) allOk = false;
}

const report = {
  at: new Date().toISOString(),
  valueMismatch,
  fontSizeKeys: Object.keys(FONT_SIZE).length,
  trackAProof,
  allTrackAOnly: allOk,
  noLiteralLeak: cats.every((k) => {
    const after = fs.readFileSync(path.join(OUT, `after-${k}.html`), "utf8");
    return !after.includes("${FONT_SIZE");
  }),
};

fs.writeFileSync(
  path.join(ROOT, "review", "182cha-value-assert.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

if (valueMismatch.length || !report.allTrackAOnly || !report.noLiteralLeak) {
  console.error("[182] ASSERT FAIL");
  process.exit(1);
}
console.log("[182] FONT_SIZE values OK · Track A-only proven · no literal leak");
