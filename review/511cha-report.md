# 511차 보고서 — 사이트 전체 화면 리디자인

## 확인하지 못한 항목
- 실제 브라우저 렌더·호버·애니메이션 재생 여부
- 320px / 390px 뷰포트 실측(가로 스크롤). 정적 CSS(`overflow-x:hidden`, `max-width`, clamp)로만 점검
- `animation-timeline: view()` 스크롤 등장 지원 브라우저 실측(미지원 시 CSS상 그냥 보이게 `@supports` 가드)
- 점검 중 오버레이가 느린 네트워크에서 “즉시 닫힘” 체감 확인(로직상 `busy=false` 즉시 언마운트)

## 화면별 변경
| 화면 | 파일 | 시안과 다르게 한 부분 |
|------|------|----------------------|
| 공통 | `components/label-check/ui-511/*`, `app/layout.tsx`(IBM Plex Mono) | 로고는 시안형 `LabelMark511`만 라벨 헤더에 사용 |
| 랜딩 | `LabelCheckLanding.tsx` + Proof/Belt/TryIt, `app/page.tsx` | `DETAIL_PAGE_ENABLED` 분기·상세 랜딩은 미변경. metadata 유지 |
| 점검 | `UploadCard.tsx`, `app/label-check/page.tsx`, `new/page.tsx`, `CheckBusyOverlay.tsx` | 제품 정보 `<details>`·OCR 버튼은 기존 동작 유지(시안에 상세 폼 없음) |
| 결과 | `ResultView.tsx`, `CopyButton.tsx` | 탭 UI 유지. “이렇게 수정해 보세요” 블록·고쳤어요 로컬 토글·진행 막대 추가 |
| 목록·저장 | `history/page.tsx`, `history/[id]/page.tsx` | 상태 표기를 고칠 것/확인할 것/확인 못 함/문제 없음으로 통일 |
| 인증·약관 | login/signup/forgot/reset, privacy/terms, not-found, error | 조항 본문 문자열 미변경. 겉모양·헤더·푸터만 |

## “고쳤어요” 토글
- 구현함. `ResultView507`의 `doneMap`/`doneTick` 로컬 state만 사용.
- `result`·API·DB·`label_check_runs`·`fixSheet`에 쓰지 않음. 결과 바뀌면 `useEffect`로 맵 초기화.

## 기존 테스트 수정
- `label-check-483.ts`: 업로드 제목 “어떤 문구를 점검할까요?” 허용; privacy/terms를 `LabelFooter`에서도 인정
- `feature-flag-489.ts`: 동일 privacy/terms 경로
- `label-check-495.ts`: 게스트 로그인/내 결과를 `LabelHeader`에서도 인정
- 신규 `label-check-511-ui.ts` + suites 등록

## 시안 문구 중 쓰지 않은 표현
- 업로드 시안 제목 외 제품정보 접힘·OCR 전용 CTA는 기존 서비스 동작 문구 유지(시안에 없는 기능)
- 랜딩 “샘플 결과 보기”는 `/label-check`로 연결(게스트 페이지의 샘플 버튼과 동일 진입)

## 검증
- `npx tsc --noEmit` 통과
- `npm run build` 통과
- `npm run regression:label-check` 23/23 통과
