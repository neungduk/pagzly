/**
 * 업로드 사진의 인물 여부 — 로컬(브라우저 WASM) 검출 결과를 받는 자리. 외부 서비스 호출 없음.
 * 기본 꺼짐: 꺼져 있으면 힌트를 받아도 무시하고 지금 동작(AI 일상컷·합성컷만 인물로 취급) 그대로다.
 * 힌트에는 "사람 있음 여부 + 대략 세로 위치"만 담고 얼굴 특징·좌표 원본은 받지도 저장하지도 않는다.
 * 켜면 사람이 있는 업로드 사진도 사용 장면 크롭·사진 위 글자 금지 규칙(markUsageSceneSlots)을 따른다.
 */
export const PERSON_DETECT_ENABLED = false;

/** 검출기 기준 신뢰도 — 평가셋에서 0.5일 때 사람 없는 사진 오검출 0 */
export const PERSON_DETECT_MIN_SCORE = 0.5;

export type PersonHint = {
  hasPerson: boolean;
  /** 0(위)~1(아래) — 사람 영역의 대략 세로 중심. 없으면 위치 모름 */
  centerY?: number;
};

export function personIndexesFromHints(
  hints: ReadonlyArray<PersonHint | null | undefined> | undefined,
  imageCount: number,
): number[] {
  if (!PERSON_DETECT_ENABLED || !hints) return [];
  const out: number[] = [];
  hints.forEach((hint, i) => {
    if (hint?.hasPerson && i < imageCount) out.push(i);
  });
  return out;
}
