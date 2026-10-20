/**
 * 419차 — 뷰티 표현 변경 플래그. 꺼 두면(또는 뷰티가 아니면) 418차 결과와 같은 화면·HTML이 나온다.
 * 대상: 글·사진 일치 게이트(photo-text-match), 뷰티 인포 강화, 뷰티 히어로 크롭, 장면(합성) 슬롯 표시.
 * 카피 프롬프트·비용 절감은 화면이 아니라 호출 쪽이라 이 플래그와 별개다.
 */
export const BEAUTY_STYLE_ENABLED = true;
export const BEAUTY_CATEGORY = "화장품/뷰티";

/** enabled는 테스트가 flag off를 흉내 낼 때만 넘긴다 */
export const beautyStyleOn = (category: string | undefined | null, enabled: boolean = BEAUTY_STYLE_ENABLED): boolean =>
  enabled && category === BEAUTY_CATEGORY;
