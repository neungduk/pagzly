# 249차 보고 — illustration_banner 가독성 + shipping 표 중복행

생성: 2026-09-23 · **API generate: 0** (로직/레이아웃만, 새 이미지·카피 생성 없음)

## 요약

| 버그 | 수정 | 검증 |
|------|------|------|
| 1. `illustration_banner` 텍스트가 AI 패턴 위에 낮은 대비 | 텍스트 블록 전용 다크 패널 스크림 + `line-clamp-2` (라이브·export 동일) | 기존 일러스트 URL 재사용 before/after PNG |
| 2. `shipping_info` spec_table 중복행 | `mergeSpecRows` 누락분 유지를 `rowMatches`로 통일 + `배송\s*기간` 정규식 | 유닛 테스트 6행→3행 + 상품 정보 회귀 |

---

## 버그 2 — 배송·교환 표 중복행

### 원인

`mergeSpecRows()`가 스켈레톤 흡수에는 `rowMatches`(정규식)를 쓰고, 누락분 유지에는 `m.label === row.label`만 써서 AI 변형 라벨(`배송 기간`, `교환·반품`, `환불`)이 다시 append됨.  
추가로 `/배송기간/`은 공백 포함 `배송 기간`을 매칭하지 못해 기간 행이 스켈레톤+원본으로 이중 존재.

### 수정 (`lib/enrich-product-sections.ts`)

- 누락분 유지: `skeleton.some((skel) => rowMatches(row, skel))`이면 skip → shipping·상품 정보 공통 경로 수정
- `SHIPPING_SKELETON` 기간 match: `/배송\s*기간|출고|발송/`
- verify용 `mergeSpecRows` / `enrichSpecTableSection` export

### 유닛 테스트

`npx tsx scripts/249cha-spec-table-dedupe-verify.ts` → **PASSED**

**BEFORE** (구 exact-label append 재현, 248차 fixture):

| # | label | value |
|---|-------|-------|
| 1 | 배송비 | 구매 금액·지역에 따라 달라질 수 있습니다 |
| 2 | 배송기간 | 판매자 확인 필요 |
| 3 | 교환·환불 | 판매자 확인 필요 |
| 4 | 배송 기간 | 판매자 정책을 확인해주세요 |
| 5 | 교환·반품 | 판매자 정책을 확인해주세요 |
| 6 | 환불 | 판매자 정책을 확인해주세요 |

→ **6행**

**AFTER** (`enrichSpecTableSection` / 현재 `mergeSpecRows`):

| # | label | value |
|---|-------|-------|
| 1 | 배송비 | 구매 금액·지역에 따라 달라질 수 있습니다 |
| 2 | 배송기간 | 판매자 확인 필요 |
| 3 | 교환·환불 | 판매자 확인 필요 |

→ **3행** (스켈레톤 항목당 1)

**회귀**: 화장품 상품 정보 spec_table — 브랜드/용량 보존, `내용량`→`용량` 동의어 중복 없음.

---

## 버그 1 — illustration_banner 텍스트 가독성

### 원인

오버레이가 항상 정중앙이라는 좌표 보장이 없고, `bannerTitle`/`bannerSub`에 line-clamp가 없으며, 가독성 보정은 상·하단 범용 그라디언트뿐이라 긴 2줄 카피가 밝은/복잡한 AI 패턴 위에 얹힘.

### 수정

- `components/DetailSectionRenderer.tsx` `illustration_banner`: 텍스트 블록 뒤 `BRAND.ink` 0.9 패널 + soft shadow, title/body에 `HEADLINE_CLAMP` (`line-clamp-2`)
- `lib/export-detail-html.ts` 동일 의도 (패널 + `-webkit-line-clamp:2`)
- 일러스트 재생성 없음

### 검증 (기존 자산 재사용)

일러스트: `…/icons/1790140648028-illustration-11.png` (247차 recovered showcase)

더미 긴 body(의도적 2줄+ 초과)로 단독 렌더:

- before: `review/249cha-illustration-banner/before.png` — 스크림·clamp 없음, 흰 글자가 소용돌이 패턴과 겹침
- after: `review/249cha-illustration-banner/after.png` — 다크 패널 + 2줄 clamp(말줄임)

`npx tsx scripts/249cha-illustration-banner-verify.ts` → scrim/clamp assert + PNG 작성 완료

---

## git diff --stat (249 관련 핵심)

워킹트리에 이전 차수 누적 diff가 섞여 있어 `DetailSectionRenderer` / `export-detail-html` 전체 stat은 비대함. **이번 차수 논리 변경의 핵심**:

```
 lib/enrich-product-sections.ts       | 28 ++++++++++++++++++++++------
```

추가로:

- `components/DetailSectionRenderer.tsx` — `illustration_banner` 스크림/clamp
- `lib/export-detail-html.ts` — 동 케이스 export 패리티
- `scripts/249cha-spec-table-dedupe-verify.ts` (신규)
- `scripts/249cha-illustration-banner-verify.ts` (신규)
- `review/249cha-illustration-banner/{before,after}.{html,png}`

---

## API

**generate: 0** — DeepSeek / Replicate / Claude `/api/generate` 호출 없음.
