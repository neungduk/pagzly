# 50차 완료 보고 — 실제 쇼핑몰 벤치마킹 품질 개선

생성: 2026-09-01  
검증: 코드 리뷰 + `npx tsc --noEmit` + `npx tsx scripts/verify-50cha-static.ts` (유료 생성 없음)

## 변경 파일

| 파일 | 항목 |
|------|------|
| `lib/detail-preview-collapse.ts` | A — 접기 split 로직 |
| `components/DetailSectionRenderer.tsx` | A 더보기 UI, B trust 배너 렌더, D category→배경 |
| `app/create/result/page.tsx` | A 미리보기 접기 연동, PNG 캡처 시 자동 펼침 |
| `lib/section-inserts.ts` | B `insertSellerTrustEvidence` |
| `lib/types/generate.ts` | B `sellerTrustEvidence` 필드 |
| `components/CreateProductForm.tsx` | B 입력 UI + payload |
| `app/api/generate/route.ts` | B 서버 삽입, C 3단 카피 프롬프트 |
| `lib/design-tokens.ts` | D 패션 알파 50% |
| `lib/export-detail-html.ts` | D export에도 category 전달 |
| `lib/image-roles.ts` | E 클로즈업 안내 |
| `lib/section-templates.ts` | C/E 슬롯 note |
| `review/upgrade-proposals.md` | 크로스셀·가상피팅 P2 기록 |
| `scripts/verify-50cha-static.ts` | 정적 검증 스크립트 |

## tsc

- 변경 파일 기준 **에러 0건**
- 기존 무관: `review/pixabay-cosmetics-test/crawl-pixabay.mts`

## 체크리스트

| # | 항목 | 결과 |
|---|------|------|
| A | 더보기 접기/펼치기 | PASS — `computePreviewCollapseEnd` + `PreviewCollapseBar`, static script end index=2 |
| B | 근거 없으면 섹션 미생성 | PASS — `insertSellerTrustEvidence("", …)` 길이 동일 |
| C | 3단 구조 + 숫자 입력값만 | PASS — `generate/route.ts` 프롬프트 + `buildSectionLengthGuide` |
| D | 패션 알파 조정, 3색 구조 유지 | PASS — `getSectionBackground(..., "의류/패션")` ≠ 다른 카테고리 |
| E | texture/detail 힌트 | PASS — `image-roles.ts`, `section-templates.ts` |

## 구현 요약

### A — 상세정보 더보기
히어로 + (직후 GIF) + 본문 2섹션만 기본 노출. HTML export는 전체 유지. PNG/ZIP 다운로드 시에만 잠시 전체 펼침.

### B — 판매자 입력 근거 배너
`highlight_box` 슬롯 `seller_trust_evidence`를 서버가 히어로 직후 삽입. AI 호출 없음. 빈 입력 → 삽입 안 함.

### C — 3단 카피 프롬프트
고객 인용 → #해시태그 → 입력 근거 수치. 근거 없으면 단계 생략, 숫자 지어내기 금지 명시.

### D — 패션 미니멀 배경
`의류/패션`만 패턴 A/B/D/E accent 알파를 약 50%로 낮춤. 슬롯·3색 필드 불변.

### E — 클로즈업 안내
패션 `detail`, 뷰티/식품 텍스처 role hint 및 `detail_zoom`/`texture_closeup` slot note 보강.

## 로컬 확인

```bash
npx tsx scripts/verify-50cha-static.ts
# dev: /app/dev/detail-preview — 더미 섹션으로 접기 UI 수동 확인 가능
```
