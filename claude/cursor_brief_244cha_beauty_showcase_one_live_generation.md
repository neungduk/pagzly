# 244차 — 화장품 카테고리 실사 1건 생성·캡처 (사용자 명시 허가, 정확히 1건)

생성: 2026-09-23 · 유료 API **정확히 1건 실사(사용자 명시 허가) — 새 코드 작성 불필요**

## 한줄 결론

새 스크립트 설계 없음. 기존 `scripts/generate-beauty-showcase-one.ts`(139차 시점 제작, 현재
export 함수와 호환 확인)를 **정확히 1회** 실행해 화장품 카테고리 실사 상세페이지 결과물을
캡처·보고.

---

## 0. 허가 범위 (반드시 준수)

사용자 지시 원문: "상세페이지 길게 딱 한개의 카테고리만 만들어 보자 / 커서에 상세페이지
화장품 카테고리로 만들어 보라고 하고 정보들은 그냥 자동으로 가짜정보들 싹 넣고 한번 제작
해보라해 / 결과물 한번 봐보자"

- **정확히 1회 실행**만 허가됨. 실패해도 사용자 재확인 없이 재시도 금지 — 실패 시 원인과
  로그를 그대로 보고하고 멈출 것 (이 프로젝트의 "허가 없이 유료 API 호출 금지" 표준
  원칙 — 214/216차와 동일 스코프 한정 허가).
- 카테고리: 화장품/뷰티 고정. 제품 정보는 전부 스크립트에 이미 하드코딩된 가짜 정보
  그대로 사용 — 수정하지 말 것(사용자가 "가짜정보들 싹 넣고"라 명시).
- 실행 전 `npm run dev`(또는 기존 dev 서버)가 `http://localhost:3000`에 떠 있어야 함.
  `scripts/auth-state.json`·`.env.local`의 `PEXELS_API_KEY`가 이미 있어야 함(이전
  라운드들에서 이미 쓰던 것과 동일 파일 — 새로 만들 필요 없음, 없으면 그 사실만 보고).

## 1. 실행

```
npx tsx scripts/generate-beauty-showcase-one.ts
```

스크립트가 이미 하는 일(수정 없이 그대로 실행만):
1. Pexels 무료 사진 검색으로 화장품 세럼류 8장 크롤 (`ASSET_DIR`에 저장, 유료 아님).
2. `/create` 폼에 `PRODUCT` 상수(제품명 "라이트 워터 히알루론 세럼", 브랜드 "페이즐리랩",
   가격 34800원, 타겟/핵심기능/성분/인증/도매상세 — 전부 더미 텍스트) 자동 입력 + 사진
   업로드.
3. 제출 → `/create/draft` 이동 → "승인하고 최종 생성" 클릭 → **여기서 실제 프로덕션
   생성 파이프라인(유료 API) 1회 실행** → 배경 후보 피커가 뜨면 첫 번째 후보 자동 선택.
4. `/create/result` 도착 → `sessionStorage`의 `pagzly-create-result`를 `session.json`으로
   저장 → 같은 세션 데이터로 `buildDetailPageHtml()` 호출해 `showcase.html`(export) 생성.
5. 상세 미리보기 스크린샷(`showcase-detail.png`) + 결과 페이지 전체 스크린샷
   (`showcase-full.png`) 캡처.

## 2. 산출물 확인 (보고에 반드시 포함)

`review/beauty-showcase-one/`에 다음이 전부 생성됐는지 확인 후 보고:

- `showcase-detail.png` — 상세 미리보기 1장
- `showcase-full.png` — 결과 페이지 전체
- `showcase.html` — export HTML
- `session.json` — 생성된 섹션·이미지·테마 원본 데이터
- `meta.json` — 섹션 수·이미지 수·타임스탬프
- `pexels-sources.json` — 크롤한 사진 출처

## 3. 보고 형식

`review/244cha-report.md`에 다음을 반드시 포함:

- **API generate: 정확히 몇 건**(1건이어야 함 — 재시도로 2건 이상 됐다면 그 사실과 원인을
  숨기지 말고 그대로 보고) + 실제 비용(달러 단위, session.json이나 로그에서 확인 가능하면).
- 생성된 섹션 개수·타입 목록(`session.json`의 `sections[].type` 나열).
- 스크린샷 2장·export HTML 파일 크기.
- 실행 중 에러·재시도·타임아웃이 있었다면 전부 그대로 기록(성공했다고 얼버무리지 말 것).

이번 라운드는 코드 수정이 없으므로 별도 검증 스크립트 불필요 — Claude가 산출물(스크린샷·
session.json·export.html)을 직접 열람해 육안·코드로 독립 검토함.
