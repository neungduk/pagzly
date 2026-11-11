/**
 * 525 — 랜딩 숫자 띠용 규칙 개수(빌드 시점 상수).
 * 규칙 JSON 전체를 번들에 넣지 않고, 실측 kr/us 개수만 둔다.
 * 값이 바뀌면 회귀(label-check-525)가 실측과 비교해 실패한다.
 */
export const RULE_COUNTS_525 = { kr: 35, us: 13 } as const;
