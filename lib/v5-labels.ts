/**
 * 465차 V5 — 닫힌 구조 라벨 목록. 새 변형·장식이 쓸 수 있는 **글자**는 이 파일의 짧은 영문 표지와 순번(01, 02, I, II …)뿐이다. 한글 문장·주장·설명은 만들지 않는다.
 * 사용자가 목록을 승인/삭제할 수 있도록 보고서에 전체를 표로 적는다. 스위치 `V5_LABELS_ENABLED`를 false로 두면 모든 표지가 빈 문자열이 되어 순번·기호만 남는다.
 */
export const V5_LABELS_ENABLED = true;

export const V5_LABELS = {
  step: "STEP",
  point: "POINT",
  no: "NO.",
  q: "Q",
  a: "A",
  chapter: "CHAPTER",
  spec: "SPEC",
  note: "NOTE",
  check: "CHECK",
  story: "STORY",
  detail: "DETAIL",
} as const;
export type V5LabelKey = keyof typeof V5_LABELS;

/** 표지 글자. 스위치가 꺼져 있으면 빈 문자열 */
export const v5Label = (key: V5LabelKey): string => (V5_LABELS_ENABLED ? V5_LABELS[key] : "");

/** 로마자 순번(1~20) — 번호 양식 "roman"용. 범위 밖은 아라비아 숫자 */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
export const romanOf = (n: number): string => ROMAN[n - 1] ?? String(n);

/** 회귀용: 렌더 문자열에서 허용되는 표지 전체(순번은 별도 규칙) */
export const V5_ALLOWED_LABEL_TEXTS: readonly string[] = [...Object.values(V5_LABELS), ...ROMAN];
