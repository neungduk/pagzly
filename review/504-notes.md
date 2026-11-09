# 504 notes

## 광고 v0.2
- 로더: `ad-phrases-kr_draft_v0.2.json` (v0.1 파일 유지·미삭제).
- `regex_patterns`: `iu` 플래그. 스캔 문자열 상한 `AD_REGEX_SCAN_MAX_CHARS_504=80000`. 패턴 길이>120·위험 수량자는 컴파일 거부.
- `condition: non_functional` + 기능성 체크: **생략하지 않고** 「심사·보고 범위 내인지 확인」으로 낮춤.
- 수정 제안: 항목 `fix_ko` 우선. `fix-suggestions-kr`의 AD-*는 주제 중복 시 표시하지 않음(광고 finding에 이미 fix).
- 짧은 영문: `free`/`spf`/`natural` 등 단어 경계. 전성분 영역 마스킹으로 `Natural Source` 오탐 완화.

## 주의사항
- 주의 구간 식별 실패 시 **전체 텍스트 폴백**(오탐↑ 가능) — 한계.
- `type_cautions`는 UI 세부 유형 복수 선택 시에만.

## 별표4
- 중복 표: `ADDENDA_OVERLAP_504`. ADD-004는 비누 입력 없어 「비누」 문구 있을 때만 soft 안내.

## 픽스처
- ad 변이 회귀는 텍스트 경로 사용(PDF는 `label-check-make-fixtures-492`로 재생성 가능).
