# 247차 — 246차 결과 `/create/history` 복구 **성공**

생성: 2026-09-23 · 유료 API **0** (열람·캡처·HTML 다운로드만)

## 한줄 결론

history 최상단이 246차 상품과 일치 → `/create/result?id=…` 정상 로드 → 스크린샷 2장 + session + export HTML 확보. 246차는 서버 저장까지 성공했고, 실패한 건 Playwright result 대기뿐이었음이 확인됨.

---

## 1. History 최상단

| 항목 | 값 |
|------|-----|
| product_name | **라이트 워터 히알루론 세럼** |
| category | **화장품/뷰티** |
| created_at (UI) | **2026년 9월 23일 오후 02:17** |
| id | `6c3c7d7e-dbbc-4ff8-a7cf-a768d04930b4` |
| 링크 | `/create/result?id=6c3c7d7e-dbbc-4ff8-a7cf-a768d04930b4` |

246차 일치: 제품명·카테고리·당일 시각 **모두 OK** (목록 링크 1개뿐).

---

## 2. Result 복구

| 단계 | 결과 |
|------|------|
| `/create/history` | OK |
| result 네비게이션 | OK |
| `detail-preview` | 존재 (count=2, 첫 영역 캡처) |
| sessionStorage `pagzly-create-result` | **있음** → `session.json` 저장 |
| HTML 보내기 | 다운로드 성공 → `showcase.html` **103,732 B** |
| 결과 페이지 표시 비용 | **AI 비용 $1.2522** (배경 $0.16 · 섹션배경 $0.003 · 보정 $0.0748 · 카피 $0.0981 등) |

섹션 **28개** types:

`hero, brand_story, checklist, image_text×3, target_persona, image_text×3, highlight_box, illustration_banner, step_card, gallery, stat_infographic, image_text, comparison_chart, tradeoff_card, spec_table, faq, caution, image_text×4, spec_table, ai_disclosure, cta_price`

---

## 3. 산출물

`review/247cha-recovered/`

| 파일 | 크기 |
|------|------|
| `showcase-detail.png` | 958,590 B |
| `showcase-full.png` | 1,252,158 B |
| `showcase.html` | 103,732 B |
| `session.json` | 19,684 B |
| `history-page.png` | 43,138 B |
| `recover-meta.json` | — |

---

## 4. 실패 단계

없음. `stage: "recovered"`.

API generate: **0**
