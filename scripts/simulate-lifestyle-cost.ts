/**
 * 일상샷·사진 파이프라인 원가 시뮬레이션 (USD / KRW@1400)
 * 실행: npx tsx scripts/simulate-lifestyle-cost.ts
 */
import {
  estimateLifestyleShotUnitCostUsd,
  getLifestyleShotConfig,
  countLifestyleShotsToGenerate,
  type LifestyleShotConfig,
} from "../lib/lifestyle-shot-config";
import { computeStudioCompositeLimit } from "../lib/lifestyle-shot-planner";

const FX_KRW = 1400;

const REPLICATE = {
  backdropFluxFillPerCandidate: 0.025,
  backdropCandidates: 7,
  sectionSchnell: 0.003,
  sectionCount: 2,
  rembgClarityPerComposite: 0.01647,
  decorSchnell: 0.003,
  conceptBriefDeepseek: 0.003,
  shadowHaiku: 0.005,
  haikuPerComposite: 0.012,
} as const;

function krw(usd: number): number {
  return Math.round(usd * FX_KRW);
}

function photoPipelineUsd(uploadCount: number, lifestyleShots: number, lifestyleUnitUsd: number) {
  const composites = computeStudioCompositeLimit(uploadCount);
  const backdrop =
    REPLICATE.backdropFluxFillPerCandidate * REPLICATE.backdropCandidates +
    REPLICATE.conceptBriefDeepseek +
    REPLICATE.shadowHaiku;
  const sections = REPLICATE.sectionSchnell * REPLICATE.sectionCount;
  const enhanceReplicate =
    composites * REPLICATE.rembgClarityPerComposite + REPLICATE.decorSchnell;
  const enhanceClaude = composites * REPLICATE.haikuPerComposite + REPLICATE.shadowHaiku;
  const lifestyle = lifestyleShots * lifestyleUnitUsd;
  const replicateTotal = backdrop + sections + enhanceReplicate + lifestyle;
  const claudeTotal = enhanceClaude;
  return {
    backdrop,
    sections,
    enhanceReplicate,
    lifestyle,
    replicateTotal,
    claudeTotal,
    total: replicateTotal + claudeTotal,
    composites,
    lifestyleShots,
  };
}

const PRESETS: Record<string, Partial<LifestyleShotConfig>> = {
  "이전 (premium×3)": {
    enabled: true,
    maxCount: 3,
    qualityLevel: "premium",
    resolution: "1024",
    minUploadCount: 3,
  },
  "현재 기본 (standard×2)": {
    enabled: true,
    maxCount: 2,
    qualityLevel: "standard",
    resolution: "768",
    minUploadCount: 3,
  },
  "초저가 (standard×1)": {
    enabled: true,
    maxCount: 1,
    qualityLevel: "standard",
    resolution: "768",
    minUploadCount: 5,
  },
  "일상샷 OFF": {
    enabled: false,
    maxCount: 0,
    qualityLevel: "standard",
    resolution: "768",
    minUploadCount: 3,
  },
};

function simulatePreset(name: string, overrides: Partial<LifestyleShotConfig>, uploadCount: number) {
  const base = getLifestyleShotConfig();
  const cfg: LifestyleShotConfig = { ...base, ...overrides };
  const shots = countLifestyleShotsToGenerate(uploadCount, cfg);
  const unit = cfg.enabled ? estimateLifestyleShotUnitCostUsd(cfg) : 0;
  const p = photoPipelineUsd(uploadCount, shots, unit);
  return { name, shots, unit, ...p };
}

const UPLOAD = 10;

console.log("=== Pagzly 사진 파이프라인 원가 시뮬레이션 (업로드 " + UPLOAD + "장) ===\n");
console.log(
  "| 프리셋 | 일상샷 | $/장 | 일상샷 $ | 사진합 $ | ₩ | 합성장 |",
);
console.log("|--------|--------|------|----------|----------|-----|--------|");

for (const [name, overrides] of Object.entries(PRESETS)) {
  const r = simulatePreset(name, overrides, UPLOAD);
  console.log(
    `| ${name} | ${r.shots}장 | $${r.unit.toFixed(2)} | $${r.lifestyle.toFixed(3)} | $${r.total.toFixed(3)} | ₩${krw(r.total)} | ${r.composites}장 |`,
  );
}

console.log("\n=== 업로드 장수별 (현재 기본 preset) ===\n");
const defaultOverrides = PRESETS["현재 기본 (standard×2)"]!;
for (const n of [3, 5, 8, 10]) {
  const r = simulatePreset("기본", defaultOverrides, n);
  console.log(
    `  ${n}장 → 일상샷 ${r.shots}장, lifestyle $${r.lifestyle.toFixed(3)}, 사진합 $${r.total.toFixed(3)} (₩${krw(r.total)})`,
  );
}

console.log("\n=== env 권장 (최저가) ===");
console.log("  LIFESTYLE_SHOT_QUALITY=standard   # Kontext ~$0.04/장");
console.log("  LIFESTYLE_SHOT_MAX_COUNT=1        # 1장만");
console.log("  LIFESTYLE_SHOT_RESOLUTION=768");
console.log("  LIFESTYLE_SHOT_MIN_UPLOADS=5      # 5장 이상만 생성");

const ultra = simulatePreset("초저가", PRESETS["초저가 (standard×1)"]!, UPLOAD);
console.log(
  `\n  10장 + 초저가 preset → 일상샷 $${ultra.lifestyle.toFixed(3)}, 사진합 $${ultra.total.toFixed(3)} (₩${krw(ultra.total)})`,
);
console.log(
  `  vs 이전 premium×3 → 절감 $${(simulatePreset("이전", PRESETS["이전 (premium×3)"]!, UPLOAD).total - ultra.total).toFixed(3)} / 건`,
);
