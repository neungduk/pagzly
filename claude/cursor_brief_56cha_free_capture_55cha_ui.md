# 56차 — 55차 신규 UI 3종 무료 캡처 검증 (실제 생성 호출 없음)

생성: 2026-09-01

## 배경

55차에서 만든 사이즈 다이어그램·퀵팩트 스트립·앵커 내비를 실제 화면으로 눈으로
확인하고 싶습니다. 다만 `scripts/51cha-final-qa.ts`를 그대로 재활용하는 건 비용
없이는 안 됩니다 — 코드를 보면 `/create/detail` → draft 생성(DeepSeek 카피) →
"승인하고 최종 생성"(Claude Vision·Replicate·Bria 합성)까지 실제 유료 생성
파이프라인을 그대로 타는 스크립트라, 다시 돌리면 52차 recapture 때처럼 카테고리당
실제 API 비용이 또 발생합니다.

대신 `scripts/capture-new-sections-preview.ts`가 쓰는 `/dev/detail-preview?capture=1`
경로를 재활용해주세요. 이 라우트는 `/api/generate`를 전혀 호출하지 않고 목업 섹션
데이터를 `DetailSectionRenderer`에 직접 주입해서 렌더링만 하는 개발용 프리뷰입니다
(19차 새 섹션 타입 검증 때도 이 방식으로 캡처했습니다). 이번에도 같은 방식이면
실제 생성 비용이 0원입니다.

## 이번 라운드 원칙 — 비용 발생 없음

`/api/generate`, `/api/enhance` 등 실제 생성 엔드포인트 호출 금지. draft/final
생성 플로우를 타는 스크립트(`51cha-final-qa.ts` 등)는 이번 라운드에 실행하지
마세요.

---

## 작업 A — `/dev/detail-preview` 목업 데이터 보강

`app/dev/detail-preview/page.tsx`의 기존 목업 데이터를 확인하고, 55차 3개 기능이
실제로 눈에 보이도록 다음을 보강해주세요:

- **사이즈 다이어그램**: 패션(`의류/패션`) 카테고리 시나리오를 하나 포함하고,
  `size_table` 섹션의 `rows`에 `어깨너비`/`가슴단면`/`총장`/`소매길이` 라벨에
  실제 cm 값(플레이스홀더 아닌 값, 예: "52cm")을 채워주세요. 이게 있어야
  `matchSizeDiagramRows`가 화살표를 실제로 그립니다.
- **퀵팩트 스트립**: 기존 시나리오의 `spec_table` rows에 `QUICK_FACT_LABEL_WHITELIST`
  (소재/원산지/용량/색상 등)에 걸리는 값이 이미 있는지 확인하고, 없으면 2~4개
  추가해주세요. `brandName`도 채워져 있어야 T1-A 브랜드 카드가 뜨고 그 직후에
  스트립이 나옵니다.
- **앵커 내비**: 여러 앵커가 동시에 뜨는 걸 보려면 `spec_table`(제품정보),
  `size_table`(사이즈), `gallery`(구성), `faq` 등 서로 다른 섹션 타입이 한 시나리오
  안에 섞여 있어야 합니다. 기존 목업에 없는 타입이 있으면 최소한으로 추가해주세요.

## 작업 B — 캡처 스크립트

`scripts/capture-new-sections-preview.ts`를 참고해서 새 스크립트
(`scripts/capture-56cha-preview.ts` 등)를 작성해주세요:

- `/dev/detail-preview?capture=1` 풀페이지 스크린샷 1장
- 앵커 내비 바 부분만 확대 캡처 1장 (`page.locator("nav[aria-label='섹션 이동']")`
  등으로 특정해서)
- 브랜드 카드 + 퀵팩트 스트립 부분 확대 캡처 1장
- 사이즈 다이어그램(SVG) 부분 확대 캡처 1장
- 저장 위치: `review/qa-screenshots/56cha-*.png`

`/api/generate` 호출이 스크립트 실행 중 발생하지 않는지 (51차 스크립트처럼)
response 리스너로 한 번 확인해서 보고에 포함해주세요.

## 작업 C — export HTML 쪽도 무료로 확인

`buildDetailPageHtml`을 같은 목업 섹션 데이터로 직접 호출해서 정적 `.html` 파일로
저장하고(`review/56cha-export.html` 등), Playwright로 그 파일을 `file://` 경로로
열어서 스크린샷 1장 찍어주세요. 이것도 API 호출 없이 순수 함수 호출 + 로컬 파일
렌더링이라 무료입니다.

---

## 하지 않는 것

- `scripts/51cha-final-qa.ts` 실행 (실제 유료 생성 발생 — 이번 라운드 제외)
- 신규 상품 실제 생성, `/create/detail` 플로우를 통한 draft/final 생성
- Supabase 크레딧 조정 (이번 라운드는 크레딧 소모 자체가 없어야 함)

## 검증 체크리스트

- [ ] 스크립트 실행 중 `/api/generate`, `/api/enhance` 요청이 발생하지 않았는지
      response 리스너로 확인
- [ ] 사이즈 다이어그램 스크린샷에서 화살표 4개(어깨너비/가슴단면/총장/소매길이)가
      실제로 보이는지
- [ ] 퀵팩트 스트립 스크린샷에서 브랜드 카드 직후에 스트립이 보이는지
- [ ] 앵커 내비 스크린샷에서 실제 존재하는 섹션 라벨만 보이는지 (없는 섹션 링크
      없음)
- [ ] export HTML 스크린샷에서도 동일 3종이 보이는지

## 완료 보고 형식

기존과 동일 — 변경/신규 파일, 위 체크리스트 결과, 스크린샷 경로와 바이트 크기.
이번엔 실제 생성 로그(API 호출 0건)도 함께 보고해주세요.
