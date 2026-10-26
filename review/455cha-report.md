# 455차 보고서 — 사진 로드 실패·빈 틀 마감

## 결과 / 커밋 (로컬 커밋만, push 안 함)
- `013270d` 455차 0: TASK_455 지시서 저장
- `75add84` 455차 1: 빈 틀 면 톤·사선·비율 예약(v4), 색상 옵션 alt 노출 수정, 재현 도구·회귀
- `3b503c9` 455차 2: 라이브 쌍둥이(watchNoPhotoFrames)·4c 기준을 438차 코드로·문서
- 보고서·캡처는 커밋하지 않음(review/*).

**핵심 요약**
1. "alt 글자 노출"은 대부분 **캡처 도구 오탐**: eye-lib가 `onload/onerror` 속성을 덮어써 438차의 실패 숨김이 꺼졌다. 실제 export는 438차부터 숨겼다(442차 오진과 같은 계열). 도구를 고침. 진짜 노출은 색상 옵션 큰 사진 1곳(CSS `display:block!important`가 인라인 숨김을 이김)이라 고침.
2. 진짜 결함은 **빈 틀**(링·아치·카드·흰 카드)과 **높이 0 붕괴**. 실패한 사진의 틀에 면 톤+사선 무늬를 깔고 비율을 예약. 새 문구 0.

## 결함 전/후 (상세: review/455-verify/broken-list.md)
| 측정(사진 전부 실패) | 전 | 후 |
|---|---|---|
| export 합성 21종×390: 빈 틀·붕괴 | 94 | 0 |
| export 합성 21종×390: 보이는 대체 글자 | 2 | 0 |
| export 31입력×390·750(62조합): 빈 틀 / 대체 글자 / 가로 넘침 | 395(붕괴 감지 전) / 6 / 0 | 0 / 0 / 0 |
| 라이브 합성 21종×390: 빈 틀 | 100 | 0 |
| 라이브 62조합: 빈 틀·대체 글자·가로 넘침 | — | 0 / 0 / 0 |
| 사진 실패 퍼징 30건 린트 error(R7·R9·R10 포함) | — | 0 |

전/후 대표 장면(s418 흰 카드·링·아치): `review/455-verify/s418-before-after.png`. 전체 시트: `broken-before/`, `broken-after/`(export), `live-after/`(라이브), 첫 화면 접촉 시트 `broken-after-contact.png`.

## 수정
- `lib/photo-fallback.ts`(신규): 실패한 사진의 틀(overflow:hidden)에 `data-pz-np` + 비율 예약 + deepAccent 틴트와 밝고 어두운 사선 한 쌍(밝은 면·어두운 면 모두 보임).
- export: v4일 때 문서 머리 error 캡처 리스너 1개 + CSS 규칙 1개(개별 `<img>` 문자열 불변). 라이브: `hideImgOnError`·`SectionImage`·루트 `watchNoPhotoFrames`(문자열 HTML 속 사진, 하이드레이션 전 실패 포함).
- 히어로: 438차 폴백이 이미 텍스트 중심으로 접음. D형 고스트(글 영역 소속)는 원래 디자인이라 변경 없음(눈 검수: 일부 고스트가 히어로 하단에서 잘려 보이나 의도된 블리드로 판단 — 마음에 안 들면 사람 결정).
- 사진 있음 출력: 25입력 export·라이브를 454차 끝 코드와 비교 → 추가분(스크립트 1줄·CSS 1규칙)을 빼면 diff 0.
- off: 4a·4b·4c diff 0.

## 4c 438차 기준
- 438차 커밋 `08c4e73` worktree(npm ci, node_modules 링크 없음)에서 `check-v4-off-section.tsx --write`로 기준 재생성(저장 세션 6 + 합성 21 = 27파일), 경로 `review/455-verify/snap-section-438`. 현재 코드 4c 결과 **diff 0 (1298건)** → 453차 기준과 438차 기준이 일치했음.
- `--make-baseline`이 4c까지 만들도록 확장, docs/pc-verify.md 갱신.

## stat_infographic이 export에서 `<section>` 둘로 나뉘는 원인
`lib/export-detail-html.ts` stat_infographic 끝(약 1113줄): 정보형 레이아웃(`infoOn(layout)`)이면 숫자 블록을 본 섹션에서 빼고 `data-info="statnum"` 두 번째 `<section>`으로 내보낸다. 428차 design-v2 면 예산(`statnum`을 stat과 따로 하드 면/틴트로 칠함)이 쓰는 **의도된 구조**. 변경 없음.

## 검증
- tsc 0 · 회귀 128/128(신규 photo-fail-455 포함) · pc-verify(--skip-build --skip-smoke) 불합격 0, 4a·4b·4c 합격, 세션 패리티 일치.
- 못 한 것: `next build`·launch-smoke·`--full`(라이브 하네스)는 이번에 돌리지 않음(build는 환경값 상속이라 퇴근 전 한 번 권장). 라이브 사진 실패 "전" 시트는 저장 세션 없이 합성만(worktree에 세션이 없음).

## 사람 결정 대기
- D형 히어로 고스트 하단 잘림을 실패 상태에서 숨길지.

## 정리 / 퇴근 때 할 일
- 임시 worktree wt455는 제거함. 남은 임시 로그(..wt455-npmci.log·next-dev-455*.log·reg455.log·pcv455.log)와 scripts/_455-* 는 삭제해도 됨(커밋 안 함).
- `git push origin cloud-work` (main 금지).

## 다음 후보
- 사진 실패 시 히어로 D형 고스트 정리, 실사진이 만료된 세션을 열 때 사용자에게 "사진 불러오기 실패" 안내(새 문구라 별도 결정), `--full` 라이브 퍼징에 사진 실패 모드 추가.
