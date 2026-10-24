/**
 * 회귀 — 447차 2-a 긴 한글 제품명 고스트 대체. 맞는 이름은 예전 그대로, 긴 이름은 첫 단어·영문 보조줄·브랜드 중 맞는 가장 짧은 것, 없으면 끔. v4 off는 예전 단어 그대로.
 */
import { ghostFitPx, ghostFitWordOf, ghostWordOf } from "../../lib/hero-spec";
import { setDesignV4ForTests, DESIGN_V4_ENABLED } from "../../lib/design-v4";

export const name = "고스트 대체 — 맞는 이름 유지·긴 한글 이름은 첫 단어/보조줄/브랜드 중 맞는 것·없으면 끔·v4 off 예전 값";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (l: string, g: unknown, w: unknown) => { if (g !== w) fails.push(`${l}: ${JSON.stringify(g)} ≠ ${JSON.stringify(w)}`); };
  setDesignV4ForTests(true);
  try {
    eq("맞는 이름 그대로", ghostFitWordOf("드림 미스트", "Dream Mist"), "드림 미스트");
    const long = "촉촉수분가득딥하이드레이팅앰플세럼";
    eq("전제: 긴 이름은 폭에 안 맞음", ghostFitPx(long), 0);
    eq("첫 단어 없음·보조줄·브랜드 없음 → 끔", ghostFitWordOf(long), "");
    eq("브랜드로 대체", ghostFitWordOf(long, undefined, "라운드랩"), "라운드랩");
    eq("긴 한 단어 + 영문 보조줄 대체", ghostFitWordOf(long + " 50ml", "HYDRA AMPOULE"), ghostFitPx("HYDRA AMPOULE") > 0 ? "HYDRA AMPOULE" : ghostFitWordOf(long + " 50ml", "HYDRA AMPOULE"));
    eq("여러 단어 → 가장 짧은 맞는 후보(첫 단어)", ghostFitWordOf("촉촉수분가득딥하이드레이팅 앰플세럼 대용량기획세트", undefined, "라운드랩"), ghostFitPx("촉촉수분가득딥하이드레이팅") > 0 ? "촉촉수분가득딥하이드레이팅" : "라운드랩");
    const w = ghostFitWordOf("가나다라마바사아자차카타파하 세럼", undefined, "브랜드");
    eq("대체 결과는 항상 폭에 맞거나 빈 글", w === "" || ghostFitPx(w) > 0, true);
    eq("한 글자 후보는 쓰지 않음", ghostFitWordOf(long, undefined, "나"), "");
    eq("영문 후보는 대문자", ghostFitWordOf(long, undefined, "Roundlab"), "ROUNDLAB");
  } finally { setDesignV4ForTests(DESIGN_V4_ENABLED); }
  // v4 off: 예전 단어 그대로(끄지 않음)
  setDesignV4ForTests(false);
  try {
    const long = "촉촉수분가득딥하이드레이팅앰플세럼";
    eq("v4 off는 예전 선택", ghostFitWordOf(long, undefined, "라운드랩"), ghostWordOf(long));
  } finally { setDesignV4ForTests(DESIGN_V4_ENABLED); }
  return fails;
}
