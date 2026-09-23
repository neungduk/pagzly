# 224차 — 라이브·export POINT 카운터 패리티

생성: 2026-09-18 · 유료 API 0건 · tsc 0

## 한줄 결론

라이브 `isFullPoint`가 에디토리얼 블리드를 카운트에 넣어 export와 POINT 번호·60:40·이미지 좌우가 어긋나던 문제를, `shouldUseSplitLayout()` 공유 재사용으로 해소.

---

## 1. 변경

### `components/DetailSectionRenderer.tsx`

- import에 `shouldUseSplitLayout` 추가
- `isFullPoint` 인라인 조건 → `shouldUseSplitLayout(section)`

### `lib/export-detail-html.ts`

무변경 (이미 `shouldUseSplitLayout` 사용).

---

## 2. 검증

`npx tsx scripts/224cha-point-counter-parity-verify.ts` → **ALL PASS**

합성 배열 (hero → feature_detail → usage_scenario[BLEED] → material_detail → checklist → quality_detail):

| 섹션 | 수정 전(legacy live) | 수정 후(=export) |
|------|----------------------|------------------|
| feature_detail | POINT 01 | POINT 01 |
| usage_scenario | 카운트됨(배지 없음) | 제외 |
| material_detail | POINT 03 · img L | POINT 02 · img R |
| quality_detail | POINT 04 | POINT 03 |

- 수정 전≠수정 후 증명 OK
- 수정 후 live===export OK
- 블리드 없는 배열: legacy===fixed (회귀 없음) OK
- 181cha-live 6카테고리 전부 bleed 존재 시 diverge + fixed===export OK

---

## 3. 완료 기준

- [x] DetailSectionRenderer import + isFullPoint 교체
- [x] export 무변경
- [x] tsc 0 · API 0
- [x] 검증 스크립트 (before 불일치 → after 일치 + 회귀)
