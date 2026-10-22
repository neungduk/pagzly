/**
 * 431차 1-2 — 개념 키워드 → 일러스트 매핑과 스타일 선택. 섹션의 제목·본문에 키워드가 실제로 있을 때만 매핑한다(억지로 넣지 않음).
 * 효능·수치를 암시하는 그림은 없다: 매핑 대상은 개념(수분·보호·성분·소재·사이즈…)뿐이고, 키워드가 없으면 null.
 */
import type { IllustId } from "@/lib/illustrations/library";
import type { IllustStyle } from "@/lib/illustrations/core";

/** 기본 켬. 끄려면 NEXT_PUBLIC_ILLUSTRATION_V1=off 로 서버를 시작한다(433차와 같은 화면) */
export const ILLUSTRATION_V1_ENABLED = process.env.NEXT_PUBLIC_ILLUSTRATION_V1 !== "off";

/** 정확도 순서: 앞쪽이 더 구체적인 개념. 한 섹션 텍스트에서 가장 많이 맞는 항목(동점이면 앞쪽)을 고른다 */
const RULES: Array<[IllustId, RegExp]> = [
  ["tape", /사이즈|크기|줄자|치수|기장|총장|어깨|가슴|둘레|신장|\d\s?cm/],
  ["weave", /소재|면 ?\d|순면|저지|코튼|직조|짜임|니트|립\b|조직|원단|혼방|면사|울\b|실이|올이/],
  ["wave", /세탁|세척|빨래|워싱|물세탁|손세탁|헹/],
  ["drop", /수분|촉촉|보습|물방울|워터|수분감|촉촉함/],
  ["shield", /보호|차단|방어|지켜|자외선|방수|보송/],
  ["flask", /포뮬러|배합|함유|추출물|연구|성분표/],
  ["leaf", /성분|식물|천연|잎|허브|병풀|동백|히알루론|판테놀/],
  ["layers", /레이어|겹|층|이중|덧입|레이어드|보온/],
  ["sparkle", /광택|윤기|반짝|글로우|빛/],
  ["wind", /바람|통기|시원|쿨|건조|환기|온도|체온|서늘|따뜻/],
  ["clock", /시간|오래|지속|하루|아침|저녁|분 |빠르|간편|매일/],
  ["hanger", /코디|스타일링|착용|입어|실루엣|옷걸이|아우터/],
  ["box", /배송|포장|구성품|구성|박스|상자|패키지|선물/],
  ["check", /안전|인증|검증|테스트|무자극|검사/],
  ["bag", /휴대|가방|파우치|가벼|미니|들고|여행/],
];

export type IllustPick = { id: IllustId; hits: number };

/** 텍스트에서 가장 알맞은 일러스트(없으면 null). exclude: 이미 쓴 id(인접 중복 방지용) */
export function pickIllustration(text: string, exclude: ReadonlySet<IllustId> = new Set()): IllustPick | null {
  const t = text.replace(/\s+/g, " ");
  let best: IllustPick | null = null;
  for (const [id, re] of RULES) {
    if (exclude.has(id)) continue;
    const g = new RegExp(re.source, "g");
    const hits = t.match(g)?.length ?? 0;
    if (hits > 0 && (!best || hits > best.hits)) best = { id, hits };
  }
  return best;
}

/** 모든 키워드 규칙(회귀가 15종 전부 매핑 가능한지 확인) */
export const ILLUSTRATION_RULE_IDS: readonly IllustId[] = RULES.map(([id]) => id);

/** 스타일 선택: 뷰티=라인+소프트 필, 패션=플랫+레이어, 그 밖(전자·생활·식품…)=입체 오브젝트 */
export function illustStyleFor(category: string | undefined | null): IllustStyle {
  if (category === "화장품/뷰티") return "line";
  if (category === "의류/패션") return "flat";
  return "solid";
}
