# 134차 — 결과 화면 "직접 편집" 영역 UI 리프레시

## 요약
결과 화면(`/create/result`) 우측·좌측 편집 사이드바를 A안(소프트 색 배지) 톤으로 시각만 갱신. 핸들러·상태·API 호출 변경 없음.

## 체크리스트
- [x] SectionPatchChat: 헤더 / 섹션 선택 배지 / 빈 상태 / 추천 칩 / 아바타 / 입력창 pill
- [x] DetailToolsAccordion: 아이콘 배지 + chevron 회전
- [x] DetailStructureSidebar: 활성 red/10 + dot, 숨김 eye SVG
- [x] result/page.tsx 직접 편집 연필 배지
- [x] 로직/핸들러/상태 변경 없음 (diff 확인)
- [x] 신규 색상 값 없음 (ink/paper/registration-red/slate-blue/mustard/line + opacity)
- [x] data-testid 보존
- [x] 스크린샷 3장
- [x] `npx tsc --noEmit` EXIT_CODE=0
- [x] `git diff --stat` 4파일 범위

## 스크린샷
- `review/qa-screenshots/134cha-edit-panel-open.png` — 편집 중 + AI 채팅 패널 (칩→입력 채움 확인)
- `review/qa-screenshots/134cha-tools-upload.png` — 원클릭 업로드 펼침 (mustard)
- `review/qa-screenshots/134cha-tools-ai.png` — AI 자동 생성 펼침 (slate-blue)
- (참고) `review/qa-screenshots/134cha-edit-sidebar-full.png`

## 동작 스모크
- 추천 칩 클릭 → `patch-instruction`에 `"헤드라인을 더 짧게"` 채워짐 (전송/패치 API 미호출)

## tsc
```
EXIT_CODE=0
```
(`review/134cha-tsc-output.txt`)

## git diff --stat
```
 app/create/result/page.tsx            |  25 +++++-
 components/DetailStructureSidebar.tsx |  30 ++++++-
 components/DetailToolsAccordion.tsx   |  72 +++++++++++++++-
 components/SectionPatchChat.tsx       | 157 ++++++++++++++++++++++++++++------
 4 files changed, 248 insertions(+), 36 deletions(-)
```

## data-testid 보존
- `patch-section-index`, `patch-instruction`, `patch-submit`, `patch-reference-attach`
- `desktop-tools-accordion`, `desktop-structure-sidebar`

## 검증용 스크립트
`scripts/134cha-edit-panel-capture.ts` (세션 시드 + 스크린샷; 제품 로직 변경 없음)
