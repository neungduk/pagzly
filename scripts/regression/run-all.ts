/**
 * 400차 — 회귀 점검 한 번에 돌리기 (무료: 생성 API·Replicate·dev 서버·브라우저 모두 불필요).
 *   npx tsx scripts/regression/run-all.ts
 * 하나라도 실패하면 종료 코드 1. 입력은 모두 각 파일 안의 고정값이다.
 */
import * as keywordSplit from "./keyword-split";
import * as iconRules from "./icon-rules";
import * as deadTracking from "./dead-tracking";
import * as liveExportRender from "./live-export-render";
import * as sizeDiagram from "./size-diagram";
import * as conceptIconPolicy from "./concept-icon-policy";
import * as fashionCompositePolicy from "./fashion-composite-policy";
import * as fashionDisplay405 from "./fashion-display-405";
import * as backdropSkip from "./backdrop-skip";
import * as costMerge from "./cost-merge";
import * as costStrip from "./cost-strip";
import * as fashionSpecFallback from "./fashion-spec-fallback";
import * as specRowCap from "./spec-row-cap";
import * as rhythmTokens from "./rhythm-tokens";
import * as pcVerify447 from "./pc-verify-447";
import * as ghostReplace447 from "./ghost-replace-447";
import * as motifGap447 from "./motif-gap-447";
import * as stylePacks from "./style-packs";
import * as packLayout from "./pack-layout";
import * as heroVariants from "./hero-variants";
import * as flowPhotoFirst from "./flow-photo-first";
import * as galleryVariants from "./gallery-variants";
import * as promptRules412 from "./prompt-rules-412";
import * as styleSpec from "./style-spec";
import * as styleAxes from "./style-axes";
import * as variants413 from "./variants-413";
import * as styleDirector from "./style-director";
import * as infoStyle from "./info-style";
import * as infoBackdrop from "./info-backdrop";
import * as infoBackdropRun from "./info-backdrop-run";
import * as photoTextMatch from "./photo-text-match";
import * as beautyHeroTheme from "./beauty-hero-theme";
import * as visionCacheCalls from "./vision-cache-calls";
import * as beautyInfo from "./beauty-info";
import * as sceneImages from "./scene-images";
import * as sceneSize from "./scene-size";
import * as sceneGen from "./scene-gen";
import * as numericClaimGate from "./numeric-claim-gate";
import * as sessionRoundtrip from "./session-roundtrip";
import * as beautyQuickCards from "./beauty-quick-cards";
import * as beautyAccent from "./beauty-accent";
import * as usageGuard from "./usage-guard";
import * as uploadSafety from "./upload-safety";
import * as completionCharge from "./completion-charge";
import * as logPolicy from "./log-policy";
import * as signupFree from "./signup-free";
import * as comparisonPolicy from "./comparison-policy";
import * as landingClaims from "./landing-claims";
import * as designV2 from "./design-v2";
import * as designMetrics from "./design-metrics";
import * as fontPairs from "./font-pairs";
import * as storyOrder from "./story-order";
import * as impactTemplates from "./impact-templates";
import * as evidenceModules from "./evidence-modules";
import * as illustrationMap from "./illustration-map";
import * as photoLayouts from "./photo-layouts";
import * as impactBoost from "./impact-boost";
import * as productArchetype from "./product-archetype";
import * as archetypeRecipes from "./archetype-recipes";
import * as specialSections from "./special-sections";
import * as heroSpec from "./hero-spec";
import * as referenceSections from "./reference-sections";
import * as typoRhythm from "./typo-rhythm";
import * as paletteHarmony from "./palette-harmony";
import * as packStructure from "./pack-structure";
import * as packContrast from "./pack-contrast";
import * as flowStory from "./flow-story-after-photo";
import * as packFinish from "./pack-finish";
import * as checkV4Off from "../check-v4-off";
import { DESIGN_V4_ENABLED, setDesignV4ForTests } from "../../lib/design-v4";
import * as layoutVariants from "./layout-variants";
import * as motifs from "./motifs";
import * as typeTreatments from "./type-treatments";
import * as paletteV4 from "./palette-v4";
import * as heroLayers from "./hero-layers";
import * as designLint from "./design-lint";
import * as v4EyeFixes from "./v4-eye-fixes";
import * as iconsV4 from "./icons-v4";
import * as v4Tokens from "./v4-tokens";
import * as variantAudit from "./variant-audit";
import * as headingSystem from "./heading-system";
import * as infoSectionsV4 from "./info-sections-v4";
import * as finishComponents from "./finish-components";
import * as trustStrip from "./trust-strip";
import * as paddingScale from "./padding-scale";
import * as designTokensV4 from "./design-tokens-v4";
import * as twinSections from "./twin-sections";
import * as photoTone from "./photo-tone";
import * as ghostFade from "./ghost-fade";
import * as fixturePhotos from "./fixture-photos";
import * as gapMetrics from "./gap-metrics";
import * as eyeFixes444 from "./eye-fixes-444";
import * as rhythmV4 from "./rhythm-v4";
import * as decisions444 from "./decisions-444";
import * as legacyRhythm445 from "./legacy-rhythm-445";
import * as heroQuick445 from "./hero-quick-445";
import * as reviewFixture445 from "./review-fixture-445";
import * as contrastWheel446 from "./contrast-wheel-446";
import * as colorBudget446 from "./color-budget-446";
import * as heroFinish446 from "./hero-finish-446";
import * as flow446 from "./flow-446";
import * as checkV4OffLive from "../check-v4-off-live";

const SUITES = [keywordSplit, iconRules, deadTracking, liveExportRender, sizeDiagram, conceptIconPolicy, fashionCompositePolicy, fashionDisplay405, backdropSkip, costMerge, costStrip, fashionSpecFallback, specRowCap, rhythmTokens, stylePacks, packLayout, heroVariants, flowPhotoFirst, galleryVariants, packStructure, packContrast, flowStory, packFinish, promptRules412, styleSpec, styleAxes, variants413, styleDirector, infoStyle, infoBackdrop, infoBackdropRun, photoTextMatch, beautyHeroTheme, visionCacheCalls, beautyInfo, sceneImages, sceneSize, sceneGen, numericClaimGate, sessionRoundtrip, beautyQuickCards, beautyAccent, usageGuard, uploadSafety, completionCharge, logPolicy, signupFree, comparisonPolicy, landingClaims, designV2, designMetrics, fontPairs, paletteHarmony, storyOrder, impactTemplates, evidenceModules, illustrationMap, photoLayouts, impactBoost, productArchetype, archetypeRecipes, specialSections, heroSpec, referenceSections, typoRhythm, checkV4Off, paletteV4, motifs, typeTreatments, layoutVariants, heroLayers, designLint, v4EyeFixes, iconsV4, v4Tokens, variantAudit, headingSystem, infoSectionsV4, finishComponents, trustStrip, paddingScale, designTokensV4, twinSections, photoTone, ghostFade, fixturePhotos, gapMetrics, eyeFixes444, rhythmV4, decisions444, legacyRhythm445, heroQuick445, reviewFixture445, contrastWheel446, colorBudget446, heroFinish446, flow446, pcVerify447, ghostReplace447, motifGap447, checkV4OffLive];

/** 439차 — 이전 차수 단계(스토리 순서·임팩트·사진 레이아웃·보강·비교 정책)를 검사하는 묶음은 v4 레이아웃 계획 없이 돌린다(v4는 자기 묶음이 검사) */
const V4_OFF_SUITES = new Set<unknown>([storyOrder, impactTemplates, photoLayouts, impactBoost, comparisonPolicy, archetypeRecipes, rhythmTokens]);

async function main() {
  let failed = 0;
  for (const suite of SUITES) {
    let fails: string[];
    try {
      if (V4_OFF_SUITES.has(suite)) setDesignV4ForTests(false);
      fails = await suite.run();
    } catch (e) {
      fails = [`실행 오류: ${e instanceof Error ? e.message : String(e)}`];
    } finally {
      setDesignV4ForTests(DESIGN_V4_ENABLED);
    }
    console.log(`${fails.length ? "실패" : "통과"}  ${suite.name}`);
    for (const f of fails) console.log(`      - ${f}`);
    if (fails.length) failed += 1;
  }
  console.log(failed ? `\n회귀 점검 실패 ${failed}/${SUITES.length}` : `\n회귀 점검 통과 ${SUITES.length}/${SUITES.length}`);
  process.exit(failed ? 1 : 0);
}

void main();
