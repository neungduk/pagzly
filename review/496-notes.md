# 496차 노트

## 제안 커버리지
- 필수: `kr_label_rules` 중 `KR-PEND-*` 제외 + `ad-phrases` 전 id.
- `KR-PEND-001`은 제안 초안 55개에 없음(의도적 제외로 보고 커버리지에서 제외).

## robots / noindex
- `/label-check` 레이아웃: **noindex** (486 이후 현행 유지). 공개 인덱싱 여부는 기획·사용자 결정 대기.
- `/label-check/new`, `/label-check/history*`: 전용 layout으로 **noindex** 명시.

## 오류 경로 점검
| 상황 | 코드 경로 | 결과 |
|------|-----------|------|
| 저장 실패 | API `saveError`, 점검 JSON은 그대로 반환 | 화면 멈춤 없음 |
| 로그인 만료 | 401 → 안내 후 `/login?next=` | 복귀 가능 |
| 업로드 중 새로고침 | 브라우저 기본(진행 중 fetch 중단) | 서버 상태 없음·재선택 필요 |
| 용량 초과·비PDF·레이트 | 기존 한글 오류 + role=alert | 입력 유지 |

## 접근성 수정
- 게스트/신청: 시장 radio `name="market"`, PDF `htmlFor`+`aria-label`.
- 삭제: `window.confirm`(Esc 취소 기본).
- 320px 실렌더: **미실시**(정적: max-w-3xl·break-words 유지).

## 320px
실제 렌더링 시험 미실시. `break-words`·`max-w-3xl`·그리드 `grid-cols-2`로 가로 넘침 완화만 확인.
