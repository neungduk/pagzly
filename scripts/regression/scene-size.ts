/**
 * 회귀 — 419차 3-6 제품 실물 크기 스펙. 호출 0. 입력 파싱·카테고리+용량 사전·치수/비교 문장·프롬프트 불변(치수 없으면 기존 그대로)·슬롯 메타·크기 게이트 판정 표.
 */
import {
  SIZE_GATE_TOLERANCE, comparisonSentence, detectSizeKind, estimateDimensions, judgeSceneSize, parseSizeHint, resolveProductDimensions, sizeMetaOf, sizeSentence,
} from "../../lib/scene-size";
import { SCENE_COMMON_DIRECTIVES, buildScenePrompt, normalizeSceneImages } from "../../lib/scene-images";

export const name = "장면 이미지 제품 실물 크기 — 입력 파싱·사전 추정·치수/비교 문장·프롬프트 불변·슬롯 메타·크기 게이트 판정";

const OK = "https://example.supabase.co/storage/v1/object/public/x/scene.png";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };

  // 판매자 입력 파싱
  eq("hint 기본", parseSizeHint("35mL, 높이 약 9cm"), { volumeMl: 35, heightCm: 9 });
  eq("hint 지름", parseSizeHint("30ml 높이 10cm 지름 3.3cm"), { volumeMl: 30, heightCm: 10, diameterCm: 3.3 });
  eq("hint mm", parseSizeHint("높이 95mm"), { heightCm: 9.5 });
  eq("hint 터무니없는 값 무시", parseSizeHint("높이 500cm"), {});
  eq("hint 빈 값", parseSizeHint(null), {});

  // 카테고리+용량 사전(사용자 제시 값 + 보간 줄)
  const dim = (k: ReturnType<typeof detectSizeKind>, ml: number | null) => estimateDimensions(k, ml);
  eq("미스트 30mL", dim("bottle", 30), { heightCm: 10, diameterCm: 3.3, volumeMl: 30, estimated: true });
  eq("미스트 50mL ≈ 13cm", dim("bottle", 50)?.heightCm, 13);
  eq("미스트 100mL ≈ 16cm", dim("bottle", 100)?.heightCm, 16);
  eq("미스트 35mL(보간 줄)", dim("bottle", 35)?.heightCm, 11);
  eq("립 용량 없이도 9~12cm", dim("lip", null)?.heightCm, 10);
  if ((dim("lip", null)?.heightCm ?? 0) < 9 || (dim("lip", null)?.heightCm ?? 0) > 12) fails.push("립 크기가 9~12cm 밖");
  eq("병 용량 모르면 null(지어내지 않음)", dim("bottle", null), null);
  eq("종류 모르면 null", dim(null, 30), null);
  eq("종류 판별", ["에센스 미스트", "핸드크림 튜브", "수분 크림", "촉촉 립밤", "노트북"].map((t) => detectSizeKind(t)), ["bottle", "tube", "jar", "lip", null]);

  // 최종 치수 해석
  eq("판매자 높이 우선(추정 아님)", resolveProductDimensions({ sizeHint: "35mL, 높이 약 9cm", kindText: "에센스 미스트" }), { heightCm: 9, volumeMl: 35, estimated: false });
  eq("입력 없으면 사전(추정 표시)", resolveProductDimensions({ sizeHint: "30mL", kindText: "에센스 미스트" })?.estimated, true);
  eq("용량도 종류도 없으면 null", resolveProductDimensions({ sizeHint: null, kindText: "가방" }), null);

  // 문장
  eq("치수 문장", sizeSentence({ heightCm: 10, diameterCm: 3.3, estimated: true }), "a small travel-size bottle about 10 cm tall and 3.3 cm wide");
  const small = { heightCm: 10, diameterCm: 3.3, estimated: true };
  const big = { heightCm: 22, diameterCm: 6.5, estimated: true };
  const has = (label: string, text: string | null, ...parts: string[]) => { for (const p of parts) if (!text?.includes(p)) fails.push(`${label}: "${p}" 없음 → ${text}`); };
  has("사람(작은 병)", comparisonSentence("use-person", small), "about half the height of her face from chin to forehead", "easily held in one hand", "never larger than her hand");
  has("책상(작은 병)", comparisonSentence("scene-desk", small), "A5 notebook", "clearly smaller than the laptop keyboard width");
  has("가방(작은 병)", comparisonSentence("scene-bag", small), "side pocket of a tote bag", "a fraction of the bag's width");
  has("화장대(작은 병)", comparisonSentence("scene-vanity", small), "similar in height to a lipstick or makeup brush handle");
  has("분사", comparisonSentence("use-hand-mist", small), "the hand wraps around the bottle");
  if (comparisonSentence("use-person", big) === comparisonSentence("use-person", small)) fails.push("큰 제품과 작은 제품의 비교 문장이 같음");
  if (/never larger than her hand|travel-size/.test(comparisonSentence("use-person", big) ?? "")) fails.push("큰 제품에 작은 제품 문장이 들어감");
  eq("모르는 슬롯", comparisonSentence("scene-x", small), null);

  // 프롬프트: 치수 없으면 기존 출력 그대로, 있으면 크기 문장이 공통 지시 앞에
  const plain = buildScenePrompt("scene-desk", { productKind: "facial mist bottle" });
  if (/\bcm\b/.test(plain) || !plain.endsWith(SCENE_COMMON_DIRECTIVES)) fails.push("치수 없는 프롬프트가 바뀜");
  const sized = buildScenePrompt("scene-desk", { productKind: "facial mist bottle", dimensions: small });
  if (!sized.includes("about 10 cm tall") || !sized.endsWith(SCENE_COMMON_DIRECTIVES)) fails.push(`치수 프롬프트 형식 이상: ${sized}`);
  if (sized.indexOf("about 10 cm tall") > sized.indexOf("keep the product label")) fails.push("크기 문장이 공통 지시 뒤에 있음");

  // 슬롯 메타
  eq("sizeMetaOf", sizeMetaOf(small), { heightCm: 10, diameterCm: 3.3, estimated: true });
  eq("sizeMetaOf null", sizeMetaOf(null), undefined);
  const n = normalizeSceneImages({
    "use-person": { url: OK, role: "scene", aiGenerated: true, sizeMeta: { heightCm: 10, diameterCm: 3.3, estimated: true } },
    "scene-desk": { url: OK, role: "scene", aiGenerated: true, sizeMeta: { heightCm: -3, estimated: true } },
    "scene-bag": { url: OK, role: "scene", aiGenerated: true, sizeMeta: { heightCm: 10 } },
  });
  eq("메타 보존", n["use-person"]?.sizeMeta, { heightCm: 10, diameterCm: 3.3, estimated: true });
  if (n["scene-desk"]?.sizeMeta || n["scene-bag"]?.sizeMeta) fails.push("잘못된 메타가 통과");
  if (!n["scene-desk"] || !n["scene-bag"]) fails.push("메타가 나빠도 슬롯 자체는 남아야 함");

  // 크기 게이트(기대 비율: 10cm 병 ÷ 얼굴 20cm = 0.5)
  if (SIZE_GATE_TOLERANCE !== 0.35) fails.push("기본 허용 오차가 ±35%가 아님");
  const g = (o: Partial<Parameters<typeof judgeSceneSize>[0]>) => judgeSceneSize({ slot: "use-person", heightCm: 10, bottlePx: 100, referencePx: 200, attempt: 1, ...o });
  eq("정상 → pass", g({}).verdict, "pass");
  eq("경계 +35% → pass", g({ bottlePx: 135 }).verdict, "pass");
  eq("경계 밖 +36% → 재생성", [g({ bottlePx: 136 }).verdict, g({ bottlePx: 136 }).reason], ["regenerate", "too-large"]);
  eq("너무 작음 → 재생성", [g({ bottlePx: 50 }).verdict, g({ bottlePx: 50 }).reason], ["regenerate", "too-small"]);
  eq("재시도에서도 어긋나면 폴백", g({ bottlePx: 160, attempt: 2 }).verdict, "fallback");
  eq("측정 못 함 → 폴백", [g({ bottlePx: null }).verdict, g({ bottlePx: null }).reason], ["fallback", "unmeasured"]);
  eq("0·NaN → 폴백", [g({ referencePx: 0 }).verdict, g({ bottlePx: NaN }).verdict], ["fallback", "fallback"]);
  eq("가방(기준물 없음) → pass", [g({ slot: "scene-bag" }).verdict, g({ slot: "scene-bag" }).reason], ["pass", "no-reference"]);
  eq("허용 오차 지정", g({ bottlePx: 150, tolerance: 0.6 }).verdict, "pass");
  eq("손 기준 — 병 10cm ÷ 손 18cm", g({ slot: "use-hand-mist", bottlePx: 100, referencePx: 180 }).verdict, "pass");
  return fails;
}
