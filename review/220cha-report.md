# 220차 — image_text 헤드라인 스크린샷 확인

생성: 2026-09-17 · 코드 변경 0 · API generate: 0 · 신규 생성 없음

기존 `review/181cha-live/{electronics,pet}/session.json`을 `/create/result`에 로드해
모바일 미리보기에서 대상 섹션을 캡처했습니다.

## 스크린샷 경로

| 대상 | 경로 |
|------|------|
| electronics `design_detail` — "방 안에 놓이는 디자인" | `review/220cha-headline-check/electronics-design-detail.png` |
| pet `packaging_design` — "2kg 한 봉 포장" | `review/220cha-headline-check/pet-packaging-design.png` |
| (선택) electronics 40자+ 더미 헤드라인 | `review/220cha-headline-check/electronics-long-dummy.png` |

## 실행 메모

- 로드 방식: 219차와 동일 (`sessionStorage.setItem("pagzly-create-result", raw)`)
- pet `packaging_design`은 display budget demote로 미리보기에 안 나와, 캡처 시에만 보이는 image_text 호스트에 문구 이식(원본 session.json 파일 불변)
- 프로덕션/앱 소스 수정 없음 · `/api/generate` 등 유료 생성 API 0건
