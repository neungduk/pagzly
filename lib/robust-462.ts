import { DESIGN_V4_UP1_ENABLED } from "@/lib/design-v4";

/**
 * 462차 — 렌더러 견고성 수정의 공용 판정(라이브·export가 같은 값을 읽는다). 정상 길이의 입력은 이전과 같은 출력이고, 긴 입력에서만 달라진다.
 */

/**
 * R1 — 페르소나 줄의 글이 이 길이를 넘으면 3줄 말줄임 대신 4줄까지 보인다(최대 30자 문장이 320~360px 폭에서 한 줄 8자 안팎이라 4줄이 필요).
 * 22자 넘는 정상 문장(예: 23자)의 출력이 바뀌므로 **UP1 뒤**에서만 켜진다(꺼짐 = 이전 출력 그대로 3줄).
 */
export const PERSONA_LONG_CHARS = 22;
export const personaClampLines = (text: string, up1: boolean = DESIGN_V4_UP1_ENABLED): 3 | 4 => (up1 && text.length > PERSONA_LONG_CHARS ? 4 : 3);

/** R2 — 비교 막대의 값 칸은 숫자+단위를 한 덩어리(nowrap, 줄어들지 않음)로 둔다. 단위가 길면(예: 문장형 단위) 이 칸이 라벨을 밀어내 가로로 넘치므로 이 경우만 줄바꿈을 허용한다 */
export const LONG_UNIT_CHARS = 4;
export const isLongUnit = (unit: string): boolean => unit.length > LONG_UNIT_CHARS;

/** R3 — 통계 막대의 값 칸도 같은 이유로(값이 10자를 넘는 문구형) 이 경우만 줄바꿈을 허용한다. 숫자·짧은 값은 이전과 같다 */
export const LONG_STAT_VALUE_CHARS = 10;
export const isLongStatValue = (value: string): boolean => String(value ?? "").length > LONG_STAT_VALUE_CHARS;
