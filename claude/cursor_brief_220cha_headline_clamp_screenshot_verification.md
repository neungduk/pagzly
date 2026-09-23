# 220차 지시서 — `image_text` 헤드라인 line-clamp 수정 스크린샷 확인 (코드 변경 없음, API 0)

## 배경

219차에서 `image_text` 섹션(`DetailSectionRenderer.tsx` `case "image_text"`)의 헤드라인(`<h3>`)이
`line-clamp-2` → `line-clamp-5`로, 그리고 `pagzly-ink-headline` 클래스 제거로 수정됐습니다
(219cha-report.md 기준). Cursor가 보고한 근거는 `pagzly-ink-headline`(`display:inline-block`,
`app/globals.css` 191~196행, unlayered CSS)이 Tailwind의 layered `.line-clamp-N` 유틸리티
(`display:-webkit-box`)를 CSS cascade layers 규칙상 항상 이겨서 line-clamp을 무력화시킨다는
것이었습니다.

Claude가 이 메커니즘 자체는 별도 Playwright 격리 테스트로 실재함을 확인했지만, Cursor가 제출한
`clamp-before.json`/`clamp-after.json`의 실제 프로덕션 수치는 electronics·pet 헤드라인 둘 다
before/after가 **완전히 동일**했습니다(electronics `scrollHeight/clientHeight` 216/211 → 216/211,
pet 38/34 → 38/34). 즉 코드가 바뀌었는데 측정값이 하나도 안 바뀐 것이라, 이 수정이 실제로 해당
헤드라인의 렌더링 결과에 영향을 줬다는 증거가 되지 못합니다. 코드 변경 자체는 저위험(롱더미
40자 안전장치는 여전히 작동)이라 되돌릴 필요는 없다고 판단했지만, "확정 완료"로 표시하지 않고
가장 저비용인 방법 — **실제 화면 스크린샷 1장** — 으로 마무리하려 합니다.

## 요청 사항 (코드 변경 없음, 유료 API 0건, 신규 생성 없음)

1. 로컬 dev 서버(`localhost:3000`)에서 `review/181cha-live/electronics/session.json`을
   `/create/result` 페이지의 `sessionStorage.setItem("pagzly-create-result", raw)`로 로드
   (219차 검증 스크립트 `scripts/219cha-clamp-overflow-verify.ts`와 동일한 방식 — 재사용 가능).
2. electronics `design_detail` 섹션(헤드라인 "방 안에 놓이는 디자인")을 모바일 뷰포트
   (219차와 동일 폭)로 렌더링한 뒤, 해당 섹션 카드 전체가 보이도록 스크린샷 1장 저장 —
   파일명 `review/220cha-headline-check/electronics-design-detail.png`.
3. 동일하게 `review/181cha-live/pet/session.json`을 로드해 `packaging_design` 섹션
   (헤드라인 "2kg 한 봉 포장")도 스크린샷 1장 — `review/220cha-headline-check/pet-packaging-design.png`.
4. (선택, 여유 있으면) 219차가 썼던 40자 더미 헤드라인 주입 케이스도 스크린샷 1장 —
   line-clamp 안전장치가 육안으로도 실제로 잘리는지 확인용.
5. `review/220cha-report.md`에 스크린샷 경로만 기록. 코드 파일은 어떤 것도 수정하지 않습니다.

## 완료 기준

- 스크린샷 2~3장이 `review/220cha-headline-check/`에 저장됨.
- `tsc`/코드 변경 0, API 호출 0.
- Claude가 스크린샷을 직접 열어 헤드라인 전체 노출 여부를 육안으로 확인하고 219차 항목을
  §1(완료됨) 또는 §2(취향/버그 아님)로 최종 분류합니다.
