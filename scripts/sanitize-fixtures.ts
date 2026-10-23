/**
 * 439차 — 합성 픽스처(scripts/fixtures/archetype-*.json)의 외부 저장소 사진 주소·저장 경로를 로컬 사본으로 바꾼다(영구 스크립트).
 *   npx tsx scripts/sanitize-fixtures.ts [대응표.json]
 *
 * 왜: 저장 세션을 복제한 픽스처에는 저장소 호스트와 계정 식별자가 든 주소가 있어 커밋할 수 없었다(새 체크아웃에서 말뭉치가 비어 회귀가 건너뜀).
 * 규칙
 *  - 주소 `https://<저장소>/storage/v1/object/public/images/<계정>/<상대경로>` → `/qa-fixtures/synth/<상대경로'>`, 저장 경로 `<계정>/<상대경로>` → `synth/<상대경로'>`
 *  - 상대경로'는 타임스탬프(10자리 이상 숫자)·UUID만 가짜 값으로 일관되게 바꾸고 나머지(-enhanced·-texture·compare-before 등)는 그대로 둔다
 *    → lib/gallery-dedupe.ts sourceKey(업로드 id 기준 같은 촬영본 묶음)가 원본과 똑같이 묶여 표시 결과가 주소 문자열 말고는 같다
 *  - 파일 내용은 이미 저장소에 있는 public/qa-fixtures/<분류>/ 샘플을 작게 줄인 사본(원본 업로드 사진은 내려받지 않는다)
 *  - 인포 배경(section-backdrops/)·장면 이미지(scene-images/)는 https 주소만 받는 검사(lib/info-backdrop.ts·lib/scene-images.ts, 보안 장치라 그대로)를
 *    통과해야 원본과 같은 마크업이 나오므로 예약 도메인 https://qa-fixtures.invalid/synth/…로 둔다(연결되지 않음 — 미리보기에서는 색 오버레이만 보인다)
 * 이미 정제된 픽스처는 건드리지 않는다(바꿀 주소가 없음).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = "scripts/fixtures";
const OUT_DIR = "public/qa-fixtures/synth";
const HTTPS_ONLY = /^(section-backdrops|scene-images)\//;
const urlOf = (r: string) => (HTTPS_ONLY.test(r) ? `https://qa-fixtures.invalid/synth/${r}` : `/qa-fixtures/synth/${r}`);
const SAMPLE: Record<string, string> = { "화장품/뷰티": "cosmetics", "의류/패션": "fashion", 식품: "food", 전자제품: "electronics", 생활용품: "living", 반려동물: "pet" };
const URL_RE = /https?:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/images\/[0-9a-f-]{36}\/([^"\s\\)?#]+)/g;
const PATH_RE = /"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/([^"]+)"/g;
/** UUID와 타임스탬프를 한 번에 왼쪽부터(바꾼 값을 다시 바꾸지 않게) */
const TOKEN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{10,}/g;

const tokenMap = new Map<string, string>();
let uuidN = 0;
let tsN = 0;
const fake = (rel: string) =>
  rel.replace(TOKEN, (t) => {
    if (!tokenMap.has(t)) tokenMap.set(t, t.includes("-") ? `00000000-0000-4000-8000-${(uuidN++).toString(16).padStart(12, "0")}` : String(1700000000000 + tsN++));
    return tokenMap.get(t)!;
  });

async function main() {
  const files: Array<{ rel: string; cat: string }> = [];
  const seen = new Set<string>();
  const report: Record<string, Record<string, string>> = {};
  for (const f of fs.readdirSync(DIR).filter((x) => x.startsWith("archetype-") && x.endsWith(".json")).sort()) {
    const file = path.join(DIR, f);
    const src = fs.readFileSync(file, "utf8");
    const cat = SAMPLE[(JSON.parse(src) as { category?: string }).category ?? ""] ?? "cosmetics";
    const map: Record<string, string> = {};
    let s = src.replace(URL_RE, (all, rel: string) => {
      const r = fake(rel);
      if (!seen.has(r) && !HTTPS_ONLY.test(r)) { seen.add(r); files.push({ rel: r, cat }); }
      map[all] = urlOf(r);
      return urlOf(r);
    });
    s = s.replace(PATH_RE, (_all, rel: string) => `"synth/${fake(rel)}"`);
    if (/supabase\.co|"[0-9a-f-]{36}\//.test(s)) throw new Error(`${f}: 남은 저장소 주소/경로`);
    JSON.parse(s);
    if (s !== src) fs.writeFileSync(file, s);
    report[`fx-${f.replace("archetype-", "").replace(".json", "")}`] = map;
  }
  // 로컬 사본: 분류별 샘플 4장을 돌려 가며, 390폭 미리보기에 충분한 크기로 줄여 저장
  const counters: Record<string, number> = {};
  for (const { rel, cat } of files) {
    const out = path.join(OUT_DIR, rel);
    if (fs.existsSync(out)) continue;
    const dir = path.join("public/qa-fixtures", cat);
    const pool = fs.readdirSync(dir).filter((x) => /\.(png|jpe?g)$/i.test(x)).sort();
    const k = (counters[cat] = (counters[cat] ?? 0) + 1) - 1;
    const img = sharp(path.join(dir, pool[k % pool.length]!)).resize({ width: 480, withoutEnlargement: true });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await (/\.png$/i.test(rel) ? img.png({ palette: true, quality: 70 }) : img.jpeg({ quality: 72 })).toFile(out);
  }
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report));
  const total = files.reduce((a, { rel }) => a + (fs.existsSync(path.join(OUT_DIR, rel)) ? fs.statSync(path.join(OUT_DIR, rel)).size : 0), 0);
  console.log(`사본 ${files.length}개, ${(total / 1024 / 1024).toFixed(2)}MB`);
}

void main();
