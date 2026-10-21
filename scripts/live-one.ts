/**
 * 399차 — 실생성 1건 실행기 (유료: Anthropic·DeepSeek 텍스트 생성 + 크레딧 차감). 181cha-live-generate.ts 기반.
 *
 *   npx tsx scripts/live-one.ts <시나리오> <출력 폴더> --dry     # 계획만 출력(호출 없음, .env도 읽지 않음)
 *   $env:PAGZLY_PAID_VERIFY_APPROVED = "YYYY-MM-DD"              # 사용자가 승인한 오늘 날짜
 *   npx tsx scripts/live-one.ts electronics review/400-live
 *   npx tsx scripts/live-one.ts fashion review/402-live --photos review/402-input/fashion/photos --info review/402-input/fashion/product-info.txt
 *     (402차: Pexels 검색 대신 로컬 사진·상품 정보. 후기 파일은 올리지 않고 .env.local도 읽지 않는다)
 *
 * 안전장치: PAGZLY_PAID_VERIFY_APPROVED가 오늘 날짜(로컬, YYYY-MM-DD)와 정확히 같을 때만 실행한다.
 * 시나리오: beauty | fashion | food | electronics | living | pet (한 번에 1건만)
 * 필요: dev 서버(:3000), scripts/auth-state.json(사람이 save-login-state.ts로 로그인), PEXELS_API_KEY, 크레딧 100 이상
 * 실행 후: npx tsx scripts/audit-session.ts <출력 폴더>/<시나리오>/session.json <출력 폴더>/<시나리오>/audit
 * 절차서: review/399-after-generation-runbook.md, 비용 근거: review/397-paid-verify-plan.md
 */
import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { freezeDetailScrollReveal } from "./capture-utils";
import { MAX_PRODUCT_IMAGES, MIN_AI_USED_IMAGES } from "../lib/assign-section-images";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const CLI = process.argv.slice(2);
const DRY = CLI.includes("--dry");
const VALUE_FLAGS = new Set(["--photos", "--info"]);
const flagValue = (name: string) => {
  const i = CLI.indexOf(name);
  return i >= 0 ? CLI[i + 1] : undefined;
};
/** 402차 — Pexels 자동 검색 대신 로컬 사진 폴더·상품 정보 파일을 입력으로 쓴다(둘 다 줘야 함) */
const PHOTOS_ARG = flagValue("--photos");
const INFO_ARG = flagValue("--info");
const [SCENARIO_ARG, OUT_ARG] = CLI.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(CLI[i - 1] ?? ""));
const OUT_ROOT = path.resolve(ROOT, OUT_ARG ?? "review/live-one");
const ASSET_DIR = path.join(__dirname, "test-assets", "_live-one");
const REVIEW_FILE = path.join(ROOT, "public", "_verify146", "reviews_148cha.txt");
const SHOT = path.join(OUT_ROOT, "shots");

type ScenarioKey =
  | "beauty"
  | "fashion"
  | "food"
  | "electronics"
  | "living"
  | "pet";

type Scenario = {
  key: ScenarioKey;
  categoryLabel: string;
  productName: string;
  brand: string;
  price: string;
  queries: string[];
  need: number;
  keyFeatures: string;
  ingredients: string;
  certifications: string;
  wholesaleUrl: string;
  target: string;
  withReviews: boolean;
};

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function crawlPexels(
  apiKey: string,
  queries: string[],
  need: number,
  prefix: string,
): Promise<string[]> {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const seen = new Set<number>();
  const files: string[] = [];
  for (const query of queries) {
    if (files.length >= need) break;
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "8");
    url.searchParams.set("orientation", "portrait");
    const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
    if (!res.ok) throw new Error(`Pexels ${res.status} ${query}`);
    const data = (await res.json()) as {
      photos: Array<{ id: number; src: { large2x: string; large: string } }>;
    };
    for (const photo of data.photos) {
      if (files.length >= need) break;
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      const imgRes = await fetch(photo.src.large2x || photo.src.large);
      if (!imgRes.ok) continue;
      const jpegBuf = await sharp(Buffer.from(await imgRes.arrayBuffer()))
        .jpeg({ quality: 90 })
        .toBuffer();
      const file = path.join(ASSET_DIR, `${prefix}-${photo.id}.jpeg`);
      fs.writeFileSync(file, jpegBuf);
      files.push(file);
    }
  }
  if (files.length < need) throw new Error(`${prefix}: need ${need}, got ${files.length}`);
  return files.slice(0, need);
}

async function fillIfExists(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return;
  if (!(await loc.isVisible().catch(() => false))) return;
  const tag = await loc.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    const opts = await loc.locator("option").allTextContents();
    const match = opts.find((o) =>
      value.split(/[\s·,/]/).some((p) => p.length > 1 && o.includes(p)),
    );
    if (match) await loc.selectOption({ label: match });
    else if (opts.length > 1) await loc.selectOption({ index: 1 });
    return;
  }
  await loc.fill(value);
}

const SCENARIOS: Scenario[] = [
  {
    key: "beauty",
    categoryLabel: "화장품/뷰티",
    productName: "AURA LAB 나이아신아마이드 5% 세럼",
    brand: "AURA LAB",
    price: "28000",
    queries: [
      "serum bottle skincare product photography white background",
      "niacinamide serum dropper studio",
    ],
    need: 7,
    keyFeatures:
      "나이아신아마이드 5%, 히알루론산, 판테놀. 비교축: 수분감·흡수속도·끈적임·자극도. 민감피부 추천. 이런 분께 추천: 속건조·톤케어. 확인 후 구매: 레티놀과 동시 사용 시 자극 가능.",
    ingredients:
      "Water, Niacinamide 5%, Sodium Hyaluronate, Panthenol, Glycerin, 1,2-Hexanediol. 전성분 표기 있음.",
    certifications: "화장품책임판매업, 동물실험 없음, 피부자극 테스트 완료(자체, n=32)",
    wholesaleUrl: "ingredient_highlight + comparison_chart(self_assessed) 유도. baselineLabel 화이트리스트만.",
    target: "속건조·톤케어 고민 20~30대 민감피부",
    withReviews: true,
  },
  {
    key: "fashion",
    categoryLabel: "의류/패션",
    productName: "에센셜 오버사이즈 코튼 티셔츠",
    brand: "NEUTRAL LINE",
    price: "39000",
    queries: [
      "oversized cotton t-shirt product photography plain background",
      "beige cotton tee flat lay studio",
    ],
    need: 7,
    keyFeatures:
      "면 100%, 신축성 12%, 세탁 후 수축률 2% 이내, 오버사이즈 핏, 원단 중량 210g/yd. 이런 분께 추천: 루즈핏·데일리. 확인 후 구매: 슬림핏이면 한 사이즈 다운.",
    ingredients: "코튼 100%",
    certifications: "OEKO-TEX Standard 100",
    wholesaleUrl: "혼용률·신축성·수축률로 comparison_chart 가능. 사이즈표는 판매자 확인 필요 허용.",
    target: "데일리 미니멀 룩 20~30대",
    withReviews: true,
  },
  {
    key: "food",
    categoryLabel: "식품/건강기능식품",
    productName: "VITAL LAB 프로바이오틱스 30억",
    brand: "VITAL LAB",
    price: "39000",
    queries: [
      "probiotic powder sachet supplement product photography white background",
      "health supplement stick pack studio white",
      "green probiotic bottle product photo isolated",
    ],
    need: 7,
    keyFeatures:
      "1일 1포 30억 CFU. 임상: 한국화학융합시험연구원 2025.11 n=48 — 유해균 감소 92%, 냄새 개선 86%, 만족도 94%. 단백질·식이섬유 함량 표기. 무첨가(색소·보존료 없음).",
    ingredients:
      "Lactobacillus plantarum, Bifidobacterium lactis, 프락토올리고당, 비타민C. 단백질 2g/포.",
    certifications: "건강기능식품, HACCP, 한국화학융합시험연구원 시험성적서(2025.11, n=48)",
    wholesaleUrl: "stat measured + comparison_chart(함량·무첨가 checklist) 유도.",
    target: "장 건강 관리 직장인",
    withReviews: true,
  },
  {
    key: "electronics",
    categoryLabel: "전자제품",
    productName: "AURA PURE Mini 공기청정기",
    brand: "AURA AIR",
    price: "189000",
    queries: [
      "air purifier product photography white background",
      "compact hepa air cleaner studio",
    ],
    need: 7,
    keyFeatures:
      "소음도 24dB(최저), 조작패널 IPX5, H13 HEPA, CADR 120㎥/h, 타이머 1·2·4·8h, 필터 교체 알림. 비교축: CADR·소음·필터등급.",
    ingredients:
      "소음도 24dB / 방수등급 IPX5 / 소비전력 28W / 필터 H13 / 크기 22×38×22cm / CADR 120㎥/h",
    certifications: "KC 인증, RoHS, 에너지소비효율 1등급",
    wholesaleUrl: "noise + IP diagram + comparison_chart 수치 입력 충분.",
    target: "원룸·침실 공기질 고민 20~40대",
    withReviews: false,
  },
  {
    key: "living",
    categoryLabel: "생활용품",
    productName: "솔리드 스틸 모듈 선반 5단",
    brand: "FRAME HOME",
    price: "89000",
    queries: [
      "metal shelf product photography white background",
      "modular steel rack studio shot",
    ],
    need: 7,
    keyFeatures:
      "최대 하중 80kg/단, 분체도장 스틸, 내구성 수명 설계 5년, 조립 공구 포함 세트. 이런 분께 추천: 수납 확장. 확인 후 구매: 벽 고정 권장(지진 대비).",
    ingredients: "스틸 프레임, ABS 선반판, 분체도장",
    certifications: "KC 생활용품 안전확인, 하중 테스트 성적(자체, 80kg)",
    wholesaleUrl: "하중·수명으로 comparison_chart / tradeoff 유도.",
    target: "원룸·오피스텔 수납 필요 1인 가구",
    withReviews: false,
  },
  {
    key: "pet",
    categoryLabel: "반려동물",
    productName: "PAW PLAIN 그레인프리 독 사료 2kg",
    brand: "PAW PLAIN",
    price: "42000",
    queries: [
      "dog food bag product photography white background",
      "grain free dog kibble package studio",
    ],
    need: 7,
    keyFeatures:
      "조단백질 28%, 수분 10%, 동물성 원료 비율 높음, 그레인프리. 성견 급여 권장. 이런 분께 추천: 건식 급여. 확인 후 구매: 알레르기 원료 확인(닭·연어).",
    ingredients: "닭고기, 연어, 고구마, 완두콩. 조단백질 28%, 조지방 15%, 수분 10%.",
    certifications: "동물용 사료 신고, 원산지 표기(닭: 국산)",
    wholesaleUrl: "조단백·포함여부 checklist comparison_chart. 질병 치료 단정 금지.",
    target: "성견 건식 급여 보호자",
    withReviews: true,
  },
];

/* ---------- 402차: 로컬 사진·상품 정보 입력 ---------- */

type LocalInput = {
  scenario: Scenario;
  images: string[];
  /** 사진별 역할 선택칸 라벨(착장·디테일·코디·패키지·기타 등) — "## 사진 설명"의 "파일 → 라벨: 설명" */
  roleLabels: Array<string | null>;
  /** 타깃 고객 선택칸 값 그대로("## 타깃 선택") */
  targetOption: string;
  mapping: string[];
  unmapped: string[];
};

/** "## 항목" 머리글 단위로 나눈 상품 정보 파일 */
function parseProductInfo(file: string): Map<string, string> {
  const out = new Map<string, string>();
  let key: string | null = null;
  const buf: string[] = [];
  const flush = () => {
    if (key) out.set(key, buf.join("\n").trim());
    buf.length = 0;
  };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      key = m[1]!;
    } else if (key) buf.push(line);
  }
  flush();
  return out;
}

function listPhotos(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => path.resolve(dir, f));
}

/** 상품 정보 항목 → 생성 폼 입력칸. 폼에 없는 항목은 버리지 않고 unmapped로 돌려준다 */
function buildLocalInput(base: Scenario, photosDir: string, infoFile: string): LocalInput {
  const info = parseProductInfo(infoFile);
  const get = (k: string) => info.get(k)?.trim() ?? "";
  const used = new Set<string>();
  const take = (k: string) => {
    used.add(k);
    return get(k);
  };
  const lines = (k: string) => take(k).split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const pasteBlock = ["타깃 고객", "사이즈별 실측표", "모델 정보", "핏", "계절", "색상 옵션", "세탁·관리", "배송·교환·반품"]
    .filter((k) => get(k))
    .map((k) => `[${k}]\n${take(k)}`)
    .join("\n\n");
  const cert = take("인증·검사");
  const targetOption = take("타깃 선택");
  const images = listPhotos(photosDir);
  const roleByFile = new Map<string, string>();
  // 404차 — 사진 폴더에 roles.txt("## 사진 설명" 같은 형식)가 있으면 상품 정보 파일의 사진 설명보다 우선한다.
  // 상품 정보는 그대로 두고 사진 순서·역할만 바꿔 다시 쓸 수 있게 한다
  const rolesFile = path.join(photosDir, "roles.txt");
  const photoNotes = fs.existsSync(rolesFile) ? parseProductInfo(rolesFile).get("사진 설명") ?? "" : take("사진 설명");
  used.add("사진 설명");
  for (const line of photoNotes.split(/\n+/)) {
    const m = line.match(/^\s*(\S+)\s*→\s*([^:：]+)[:：]/);
    if (m) roleByFile.set(m[1]!, m[2]!.trim());
  }
  const roleLabels = images.map((f) => roleByFile.get(path.basename(f)) ?? null);
  const scenario: Scenario = {
    ...base,
    categoryLabel: take("카테고리") || base.categoryLabel,
    productName: take("상품명"),
    brand: take("브랜드"),
    price: take("가격").replace(/[^\d]/g, ""),
    queries: [],
    need: 0,
    keyFeatures: [...lines("특징"), get("핏") && `핏: ${get("핏")}`, get("계절") && `계절: ${get("계절")}`, get("색상 옵션") && `색상: ${get("색상 옵션")}`]
      .filter(Boolean)
      .join(", "),
    ingredients: take("소재 혼용률"),
    // 인증은 지어내지 않는다 — "해당 없음"이면 칸을 비운다
    certifications: /해당\s*없음|없음/.test(cert) ? "" : cert,
    wholesaleUrl: pasteBlock,
    target: take("타깃 고객"),
    // 가상 상품에 다른 상품용 후기 파일을 붙이면 근거 없는 후기가 된다
    withReviews: false,
  };
  const mapping = [
    `카테고리 → 카테고리 선택: ${scenario.categoryLabel}`,
    `상품명 → #productName: ${scenario.productName}`,
    `브랜드 → #brandName: ${scenario.brand}`,
    `가격 → #price: ${scenario.price}`,
    `소재 혼용률 → #ingredients: ${scenario.ingredients}`,
    `특징 + 핏·계절·색상 → #keyFeatures: ${scenario.keyFeatures.slice(0, 120)}…`,
    `타깃 고객(문구) → 생성 폼 타깃 칸은 선택형이라 원본 붙여넣기 칸에 함께 넣음: ${scenario.target}`,
    `타깃 고객·사이즈별 실측표·모델 정보·핏·계절·색상 옵션·세탁·관리·배송·교환·반품 → #wholesaleUrl(원본 판매 페이지 붙여넣기 칸): ${pasteBlock.length}자`,
    `인증·검사 → #certifications: ${scenario.certifications || "(비움 — 해당 없음)"}`,
    `타깃 선택 → #targetCustomer(선택칸): ${targetOption || "(없음 — 타깃 고객 문구로 비슷한 항목 고름)"}`,
    `사진 설명${fs.existsSync(rolesFile) ? "(사진 폴더 roles.txt)" : ""} → 사진별 역할 선택칸: ${roleLabels.map((r, i) => `${i + 1}=${r ?? "기본값"}`).join(", ")}`,
    `후기 파일 → 올리지 않음(가상 상품)`,
  ];
  const unmapped = [...info.keys()].filter((k) => !used.has(k)).map((k) => `${k}: ${get(k).split(/\n/)[0]!.slice(0, 60)}${get(k).includes("\n") ? " …" : ""}`);
  return { scenario, images, roleLabels, targetOption, mapping, unmapped };
}

/** 이 이상이면 비정상 반복으로 보고 즉시 멈춘다(402차 지시: 같은 요소 이미지 생성 반복 정황) */
const API_REPEAT_LIMIT: Record<string, number> = {
  "/api/generate": 2,
  "/api/generate-backdrop": 4,
  "/api/section-backdrops": 4,
  "/api/info-backdrops": 2,
  // 422차: 뷰티 인물 사용 컷(슬롯 2장 = 모델 호출 2회). 라우트 호출은 보통 1번, 이 이상이면 반복으로 보고 멈춘다
  "/api/scene-images": 2,
  "/api/protect-product-images": 2,
};
/** 승인되지 않은 사용 장면·일상샷 생성 경로 — 한 번이라도 불리면 멈춘다 */
const FORBIDDEN_API = ["/api/generate-lifestyle-shots", "/api/lifestyle-composite", "/api/canvas-ai-image", "/api/generate-social"];

async function runScenario(cfg: Scenario, local?: LocalInput) {
  const outDir = path.join(OUT_ROOT, cfg.key);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });
  if (!fs.existsSync(STORAGE_STATE_PATH)) throw new Error("scripts/auth-state.json 없음");

  let images: string[];
  if (local) {
    // 로컬 사진 모드: .env.local을 읽지 않는다(Pexels 키가 필요 없음)
    images = local.images;
    console.log(`[${cfg.key}] 로컬 사진 ${images.length}장 사용`);
  } else {
    const env = loadEnvLocal();
    for (const [k, v] of Object.entries(env)) {
      if (!process.env[k]) process.env[k] = v;
    }
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error("PEXELS_API_KEY 필요");
    console.log(`[${cfg.key}] crawl images…`);
    images = await crawlPexels(apiKey, cfg.queries, cfg.need, cfg.key);
  }

  const inputSnapshot = {
    ...cfg,
    imageCount: images.length,
    imageFiles: images.map((f) => path.basename(f)),
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, "input.json"), JSON.stringify(inputSnapshot, null, 2));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(180_000);

  let generateHits = 0;
  const costLogs: string[] = [];
  // 402차 — 원가 계측용 API 호출 집계 + 승인 밖 호출·비정상 반복 즉시 중단
  const apiRequests: Record<string, number> = {};
  // enhance-image는 사진마다 최대 2회(재시도) + 비용 집계 1회가 정상 — 사진 수로 상한을 정한다
  const limits: Record<string, number> = { ...API_REPEAT_LIMIT, "/api/enhance-image": images.length * 2 + 1 };
  let abortReason = "";
  let pickerShown = false;
  // 404차 — 서버 안 Replicate 호출은 셀 수 없으므로, 응답·브라우저 로그의 오류 문구를 모은다.
  // 키 미설정 같은 문구가 하나라도 있으면 summary.json에 따로 표시한다. URL·저장 경로는 지운다
  const apiErrors: Array<{ path: string; status: number; error: string }> = [];
  const browserWarnings: string[] = [];
  const scrub = (t: string) => t.replace(/https?:\/\/\S+/g, "<url>").replace(/[\w-]+\/[\w./-]+\.(png|jpe?g|webp)/gi, "<path>").slice(0, 240);
  const KEY_ERROR_RE = /API_TOKEN|API_KEY|키.{0,6}(설정|없)|not (set|configured)|unauthori[sz]ed|invalid.{0,10}(token|key)|authentication/i;
  page.on("request", (req) => {
    const u = req.url();
    if (req.method() === "POST" && u.includes("/api/")) {
      const p = new URL(u).pathname;
      apiRequests[p] = (apiRequests[p] ?? 0) + 1;
      const limit = limits[p];
      if (!abortReason && FORBIDDEN_API.includes(p)) abortReason = `승인되지 않은 호출 감지: ${p}`;
      else if (!abortReason && limit != null && apiRequests[p]! > limit) abortReason = `비정상 반복 감지: ${p} ${apiRequests[p]}회(상한 ${limit})`;
      if (abortReason) {
        console.log(`[${cfg.key}] 즉시 중단 — ${abortReason}`);
        fs.writeFileSync(path.join(outDir, "abort.txt"), `${abortReason}
apiRequests=${JSON.stringify(apiRequests)}
`, "utf8");
        void browser.close();
      }
    }
    if (
      req.method() === "POST" &&
      u.includes("/api/generate") &&
      !u.includes("/api/generate-backdrop")
    ) {
      generateHits += 1;
      console.log(`[${cfg.key}] /api/generate #${generateHits}`);
    }
  });
  page.on("console", (msg) => {
    const t = msg.text();
    if ((msg.type() === "warning" || msg.type() === "error") && /API (실패|error)|FALLBACK|생략|설정되지|실패/i.test(t)) {
      if (browserWarnings.length < 40) browserWarnings.push(scrub(t));
    }
    if (/\[cost\]|generationCost|photoProcessing|replicate|recraft/i.test(t)) {
      costLogs.push(t.slice(0, 400));
      console.log(`[browser] ${t.slice(0, 220)}`);
    }
  });

  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    throw new Error(`auth expired — ${page.url()}`);
  }
  await page.waitForSelector("select", { timeout: 60_000 });

  const catSelect = page.locator("select").first();
  const labels = await catSelect.locator("option").allTextContents();
  const matchLabel =
    labels.find((l) => l.includes(cfg.categoryLabel.split("/")[0]!)) ||
    labels.find((l) =>
      cfg.categoryLabel.split(/[/\s]/).some((p) => p.length > 1 && l.includes(p)),
    );
  if (!matchLabel) throw new Error(`category not found: ${cfg.categoryLabel} in ${labels.join("|")}`);
  await catSelect.selectOption({ label: matchLabel });

  const fileInput = page.locator('input[type="file"][accept*="image"]').first();
  await fileInput.setInputFiles(images);
  await page.waitForTimeout(1500);
  const thumbCount = await page.locator('img[src^="blob:"], img[alt*="업로드"]').count().catch(() => 0);
  console.log(`[${cfg.key}] uploaded thumbs≈${thumbCount} files=${images.length}`);

  await page.fill("#productName", cfg.productName);
  await fillIfExists(page, "#brandName", cfg.brand);
  await page.fill("#price", cfg.price);
  if (local?.targetOption) await page.locator("#targetCustomer").selectOption({ label: local.targetOption });
  else await fillIfExists(page, "#targetCustomer", cfg.target);
  if (local) {
    for (const [i, label] of local.roleLabels.entries()) {
      if (label) await page.locator(`[data-testid="image-role-${i}"]`).selectOption({ label });
    }
  }
  await fillIfExists(page, "#keyFeatures", cfg.keyFeatures);
  await fillIfExists(page, "#ingredients", cfg.ingredients);
  await fillIfExists(page, "#certifications", cfg.certifications);
  await fillIfExists(page, "#wholesaleUrl", cfg.wholesaleUrl);
  if (local) console.log(`[${cfg.key}] 입력 매핑 완료(후기 파일 없음, 인증 ${cfg.certifications ? "입력" : "비움"})`);
  if (cfg.withReviews && fs.existsSync(REVIEW_FILE)) {
    const rev = page.locator("#reviewFile");
    if (await rev.count()) await rev.setInputFiles(REVIEW_FILE);
  }

  await page.screenshot({
    path: path.join(outDir, "00-input.png"),
    fullPage: true,
  });
  fs.copyFileSync(path.join(outDir, "00-input.png"), path.join(SHOT, `${cfg.key}-input.png`));

  const apiHits: string[] = [];
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/api/")) {
      apiHits.push(`${res.status()} ${res.request().method()} ${u.replace(BASE_URL, "")}`);
      console.log(`[${cfg.key}] api ${apiHits[apiHits.length - 1]}`);
      if (res.status() >= 400) {
        const status = res.status();
        const p = new URL(u).pathname;
        void res
          .text()
          .then((body) => {
            let error = body;
            try {
              error = String((JSON.parse(body) as { error?: unknown }).error ?? body);
            } catch {
              // JSON이 아니면 본문 앞부분
            }
            apiErrors.push({ path: p, status, error: scrub(error) });
            // 지시: 401·402·키 오류는 그대로 멈춘다(재시도 없음)
            if (!abortReason && (status === 401 || status === 402 || KEY_ERROR_RE.test(error))) {
              abortReason = `오류로 중단: ${p} ${status} ${scrub(error)}`;
              console.log(`[${cfg.key}] 즉시 중단 — ${abortReason}`);
              fs.writeFileSync(path.join(outDir, "abort.txt"), `${abortReason}\napiRequests=${JSON.stringify(apiRequests)}\napiErrors=${JSON.stringify(apiErrors)}\n`, "utf8");
              void browser.close();
            }
          })
          .catch(() => apiErrors.push({ path: p, status, error: "(본문 읽기 실패)" }));
      }
    }
  });

  const submit = page.getByRole("button", { name: /AI 상세페이지 생성하기/ });
  await submit.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await submit.click({ force: true });
  console.log(`[${cfg.key}] waiting draft…`);
  try {
    await page.waitForURL(/\/create\/draft/, { timeout: 480_000 });
  } catch (e) {
    await page.screenshot({ path: path.join(outDir, "00-stuck.png"), fullPage: true });
    const body = await page.locator("body").innerText().catch(() => "");
    const errEl = await page.locator(".text-red-600, [role=alert]").allTextContents().catch(() => []);
    fs.writeFileSync(
      path.join(outDir, "stuck.txt"),
      `url=${page.url()}\napiHits=${JSON.stringify(apiHits)}\nerrors=${JSON.stringify(errEl)}\nbody=${body.slice(0, 4000)}\n`,
      "utf8",
    );
    throw e;
  }
  await page.screenshot({ path: path.join(outDir, "01-draft.png"), fullPage: true });

  await page.getByRole("button", { name: /승인하고 최종 생성/ }).click();
  // 404차 — 배경 후보 선택 화면은 나오지 않을 수도 있다(패션 히어로가 원본이면 선택 없이 첫 후보 사용).
  // 선택 화면·"원본으로 계속"·결과 화면 중 먼저 오는 것을 기다린다. 선택 화면이면 첫 후보 + 확인만 누른다(재생성 금지)
  const picker = page.locator('[data-testid="backdrop-picker"]');
  const continueBtn = page.getByRole("button", {
    name: /이대로 최종 생성|이대로 진행|원본.*진행|원본으로/,
  });
  const nextStep = () =>
    Promise.race([
      picker.waitFor({ state: "visible", timeout: 1_020_000 }).then(() => "picker" as const),
      continueBtn.waitFor({ state: "visible", timeout: 1_020_000 }).then(() => "continue" as const),
      page.waitForURL(/\/create\/result/, { timeout: 1_020_000 }).then(() => "result" as const),
    ]);
  let pickerHandled = false;
  let continueHandled = false;
  for (let step = 0; step < 30; step++) {
    const got = await nextStep().catch(() => "timeout" as const);
    if (got === "picker" && !pickerHandled) {
      pickerHandled = true;
      const c0 = page.locator('[data-testid="backdrop-candidate-0"]');
      if (await c0.count()) await c0.click();
      await page.locator('[data-testid="backdrop-confirm"]').click();
      console.log(`[${cfg.key}] backdrop picker → 첫 후보 확인`);
      continue;
    }
    if (got === "continue" && !continueHandled) {
      // backdrop 실패 시 draft가 photoPending 확인 UI를 띄움 — 원본으로 계속
      continueHandled = true;
      console.log(`[${cfg.key}] backdrop failed → continue with originals`);
      await continueBtn.click();
      continue;
    }
    if (got === "result" || got === "timeout") break;
    // 같은 화면이 다시 보이면(아직 닫히는 중) 잠깐 기다린다
    await page.waitForTimeout(2000);
  }
  if (!pickerHandled) console.log(`[${cfg.key}] no backdrop picker`);
  pickerShown = pickerHandled;

  await page.waitForURL(/\/create\/result/, { timeout: 600_000 });
  await page.waitForTimeout(2500);
  await freezeDetailScrollReveal(page).catch(() => undefined);

  const sessionRaw = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  if (sessionRaw) fs.writeFileSync(path.join(outDir, "session.json"), sessionRaw, "utf8");
  const session = sessionRaw
    ? (JSON.parse(sessionRaw) as {
        generated?: {
          sections?: Array<{
            type: string;
            slot?: string;
            metrics?: unknown[];
            baselineLabel?: string;
            presentationStyle?: string;
          }>;
        };
        generationCost?: number;
        photoProcessingCost?: number;
        imageRoles?: string[];
        imageOrigins?: string[];
      })
    : {};
  // 404차 — 사진별 역할·origin(original 원본 / enhanced 합성). 업로드 순서와 같은 인덱스. URL은 남기지 않는다
  const photoTable = images.map((file, i) => ({
    index: i + 1,
    file: path.basename(file),
    roleLabel: local?.roleLabels[i] ?? null,
    role: session.imageRoles?.[i] ?? null,
    origin: session.imageOrigins?.[i] ?? null,
  }));
  const keyErrorDetected = [...apiErrors.map((e) => e.error), ...browserWarnings].some((t) => KEY_ERROR_RE.test(t));
  const sections = session.generated?.sections ?? [];
  const types = sections.map((s) => `${s.type}:${s.slot ?? ""}`);
  const chart = sections.find((s) => s.type === "comparison_chart");

  const preview = page.locator('[data-testid="detail-preview"]').first();
  await preview.waitFor({ state: "visible", timeout: 45_000 });
  const expand = page
    .locator('[data-testid="result-desktop-split"] [data-testid="detail-preview-expand"]')
    .first();
  if (await expand.count()) {
    await expand.click();
    await page.waitForTimeout(400);
  }
  await preview.screenshot({ path: path.join(outDir, "02-preview.png") });
  fs.copyFileSync(path.join(outDir, "02-preview.png"), path.join(SHOT, `${cfg.key}-preview.png`));
  await page.screenshot({ path: path.join(outDir, "03-result-full.png"), fullPage: true });
  fs.copyFileSync(
    path.join(outDir, "03-result-full.png"),
    path.join(SHOT, `${cfg.key}-full.png`),
  );

  // mid-page rhythm capture
  await page.evaluate(() => window.scrollBy(0, 1200));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "04-mid.png") });
  fs.copyFileSync(path.join(outDir, "04-mid.png"), path.join(SHOT, `${cfg.key}-mid.png`));

  const summary = {
    key: cfg.key,
    category: cfg.categoryLabel,
    productName: cfg.productName,
    generateHits,
    sectionCount: sections.length,
    hasComparisonChart: Boolean(chart),
    chartBaseline: chart?.baselineLabel ?? null,
    chartStyle: chart?.presentationStyle ?? null,
    chartMetrics: chart?.metrics?.length ?? 0,
    generationCost: session.generationCost ?? null,
    photoProcessingCost: session.photoProcessingCost ?? null,
    costLogs: costLogs.slice(0, 20),
    apiRequests,
    backdropPickerShown: pickerShown,
    photoTable,
    keyErrorDetected,
    apiErrors,
    browserWarnings,
    types,
  };
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  await browser.close();
  return summary;
}

/** 397-paid-verify-plan.md 3절 — 새 수치를 지어내지 않는다 */
const COST_NOTE = [
  "예상 비용(일반 생성 1건, 패션): 약 $0.2 + 100크레딧 (411차 실측: Replicate 켜짐 — 앱 기록 $0.213 / 서버 합산 $0.191, 배경 이미지 생략·합성 0건). Replicate 꺼짐은 실측 기록 없음 — 사진 보정 호출이 빠져 이보다 적을 것",
  "(393차 F-1의 \"$0.9~1.1\"은 배경 이미지·개념 아이콘 생성이 포함된 옛 기준이라 405차 이후 패션에는 맞지 않는다)",
  "이 실행기는 사용 장면 생성(USAGE_SCENE_GENERATION_ENABLED)을 켜지 않는다 — 사용 장면 3건(약 $0.15~0.20)은 별도 승인",
];
const PRECHECK = [
  "1. .env.local의 REPLICATE_API_TOKEN 상태가 승인 범위와 같은지(꺼짐: 텍스트 생성만 / 켜짐: 실제 서비스 조건 원가 측정) — 사람이 직접 확인",
  "2. ANTHROPIC_API_KEY·DEEPSEEK_API_KEY가 켜져 있는지, PEXELS_API_KEY(무료)가 있는지",
  "3. 테스트 계정 크레딧 100 이상(long), 부족하면 402로 끝남",
  "4. scripts/auth-state.json 로그인 세션이 살아 있는지(만료면 npx tsx scripts/save-login-state.ts로 직접 로그인)",
  "5. dev 서버(npm run dev)가 켜져 있고, 키를 바꿨다면 dev 서버를 다시 켰는지",
];

function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function main() {
  const base = SCENARIOS.find((s) => s.key === SCENARIO_ARG);
  if ((PHOTOS_ARG && !INFO_ARG) || (!PHOTOS_ARG && INFO_ARG)) {
    console.error("--photos와 --info는 함께 줘야 합니다.");
    process.exit(2);
  }
  const local = base && PHOTOS_ARG && INFO_ARG ? buildLocalInput(base, path.resolve(ROOT, PHOTOS_ARG), path.resolve(ROOT, INFO_ARG)) : undefined;
  const scenario = local?.scenario ?? base;
  if (!scenario || !OUT_ARG) {
    console.error("사용법: npx tsx scripts/live-one.ts <beauty|fashion|food|electronics|living|pet> <출력 폴더> [--dry]");
    process.exit(2);
  }
  console.log(`[live-one] 시나리오: ${scenario.key} (${scenario.categoryLabel}) · 상품: ${scenario.productName}`);
  console.log(`[live-one] 출력: ${path.relative(ROOT, path.join(OUT_ROOT, scenario.key))}`);
  for (const line of COST_NOTE) console.log(`[live-one] ${line}`);
  console.log("[live-one] 사전 확인:");
  for (const line of PRECHECK) console.log(`  ${line}`);
  if (local) {
    console.log(`[live-one] 입력: 로컬 사진 ${local.images.length}장(${path.relative(ROOT, path.resolve(ROOT, PHOTOS_ARG!))}) + 상품 정보(${path.relative(ROOT, path.resolve(ROOT, INFO_ARG!))}) — Pexels 검색 안 함`);
    for (const f of local.images) console.log(`  사진 ${path.basename(f)}`);
    console.log("[live-one] 매핑:");
    for (const line of local.mapping) console.log(`  ${line}`);
    console.log("[live-one] 매핑 안 된 항목(폼에 맞는 칸 없음):");
    for (const line of local.unmapped) console.log(`  ${line}`);
    const missing = [["상품명", scenario.productName], ["가격", scenario.price], ["카테고리", scenario.categoryLabel]].filter(([, v]) => !v).map(([k]) => k);
    // 생성 폼이 사진 최소 MIN_AI_USED_IMAGES(7)장을 요구한다(402차: 6장으로 제출하다 폼에서 막혔다 — API 호출 0)
    const fewPhotos = local.images.length < MIN_AI_USED_IMAGES || local.images.length > MAX_PRODUCT_IMAGES;
    if (missing.length || fewPhotos) {
      console.error(`[live-one] 필수 입력 부족: ${[...missing, fewPhotos ? `사진 ${local.images.length}장(${MIN_AI_USED_IMAGES}~${MAX_PRODUCT_IMAGES}장 필요)` : ""].filter(Boolean).join(", ")}`);
      process.exit(2);
    }
    // 403차 — 1번 사진은 히어로(세로 비율)에 쓰인다. 가로 사진이면 몸통 일부만 남아 상품이 안 읽힌다(402차 패션). 경고만 하고 중단하지 않는다
    const first = local.images[0];
    if (first) {
      const meta = await sharp(first).metadata();
      if ((meta.width ?? 0) > (meta.height ?? 0)) {
        console.warn(
          `[live-one] 경고: 1번 사진(${path.basename(first)})이 가로 사진입니다(${meta.width}×${meta.height}). 1번은 히어로에 쓰여 몸통 일부만 남을 수 있습니다. 패션이면 세로 전신 착용컷을 1번에 두세요(파일명 순서).`,
        );
      }
    }
  }
  console.log(`[live-one] 승인 밖 호출(즉시 중단): ${FORBIDDEN_API.join(", ")} / 반복 상한: ${Object.entries(API_REPEAT_LIMIT).map(([k, v]) => `${k} ${v}회`).join(", ")}`);
  console.log("[live-one] 배경 후보: 선택 화면이 나오면 첫 후보를 선택해 계속(재생성 버튼은 누르지 않음), 안 나오면(패션 히어로 원본) 그대로 진행, 실패하면 원본으로 계속");
  console.log(`[live-one] 순서: ${local ? "로컬 사진" : "Pexels 사진 받기"} → /create/detail 입력` + " → 초안(draft) → 승인하고 최종 생성(크레딧 차감) → 배경 실패 시 원본으로 계속 → /create/result 저장");
  console.log(`[live-one] 다음 단계: npx tsx scripts/audit-session.ts ${path.relative(ROOT, path.join(OUT_ROOT, scenario.key, "session.json"))} ${path.relative(ROOT, path.join(OUT_ROOT, scenario.key, "audit"))}`);
  if (DRY) {
    console.log("[live-one] --dry: 계획만 출력했습니다. 생성 API·Pexels·.env 모두 건드리지 않았습니다.");
    return;
  }
  const approved = process.env.PAGZLY_PAID_VERIFY_APPROVED ?? "";
  if (approved !== localToday()) {
    console.log(`유료 검증 승인이 없어 실행하지 않습니다. (PAGZLY_PAID_VERIFY_APPROVED=${approved || "(없음)"}, 오늘=${localToday()})`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const result = await runScenario(scenario, local);
  fs.writeFileSync(path.join(OUT_ROOT, `${scenario.key}-rollup.json`), JSON.stringify({ at: new Date().toISOString(), result }, null, 2));
  console.log("[live-one] 끝. 위의 '다음 단계' 명령으로 점검하세요.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
