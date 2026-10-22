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
import * as paletteHarmony from "./palette-harmony";
import * as packStructure from "./pack-structure";
import * as packContrast from "./pack-contrast";
import * as flowStory from "./flow-story-after-photo";
import * as packFinish from "./pack-finish";

const SUITES = [keywordSplit, iconRules, deadTracking, liveExportRender, sizeDiagram, conceptIconPolicy, fashionCompositePolicy, fashionDisplay405, backdropSkip, costMerge, costStrip, fashionSpecFallback, specRowCap, rhythmTokens, stylePacks, packLayout, heroVariants, flowPhotoFirst, galleryVariants, packStructure, packContrast, flowStory, packFinish, promptRules412, styleSpec, styleAxes, variants413, styleDirector, infoStyle, infoBackdrop, infoBackdropRun, photoTextMatch, beautyHeroTheme, visionCacheCalls, beautyInfo, sceneImages, sceneSize, sceneGen, numericClaimGate, sessionRoundtrip, beautyQuickCards, beautyAccent, usageGuard, uploadSafety, completionCharge, logPolicy, signupFree, comparisonPolicy, landingClaims, designV2, designMetrics, fontPairs, paletteHarmony, storyOrder, impactTemplates, evidenceModules, illustrationMap, photoLayouts, impactBoost, productArchetype, archetypeRecipes];

async function main() {
  let failed = 0;
  for (const suite of SUITES) {
    let fails: string[];
    try {
      fails = await suite.run();
    } catch (e) {
      fails = [`실행 오류: ${e instanceof Error ? e.message : String(e)}`];
    }
    console.log(`${fails.length ? "실패" : "통과"}  ${suite.name}`);
    for (const f of fails) console.log(`      - ${f}`);
    if (fails.length) failed += 1;
  }
  console.log(failed ? `\n회귀 점검 실패 ${failed}/${SUITES.length}` : `\n회귀 점검 통과 ${SUITES.length}/${SUITES.length}`);
  process.exit(failed ? 1 : 0);
}

void main();
