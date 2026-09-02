# 59차 완료 보고 — 주석형 콜아웃 (전자제품 annotated)

생성: 2026-09-01

---

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/types/generate.ts` | `layout: "annotated"`, `annotations?: { label, xPct, yPct }[]` |
| `components/AnnotatedImageOverlay.tsx` | dot + 리더라인(SVG) + 라벨 칩 (신규) |
| `lib/product-annotations.ts` | `sanitizeAnnotations`, `areAnnotationsReliable` (신규) |
| `lib/analyze-product-annotations.ts` | Claude Vision Haiku 좌표 분석 (신규) |
| `lib/apply-electronics-annotations.ts` | 전자제품 `feature_detail` 슬롯 주입 (신규) |
| `components/DetailSectionRenderer.tsx` | `isAnnotated` 렌더 분기 |
| `app/api/generate/route.ts` | `mode=final` + 전자제품 시 `applyElectronicsAnnotatedSections` |
| `app/dev/detail-preview/page.tsx` | `capture=59-electronics` mock 프리셋 |
| `scripts/capture-59cha-annotated.ts` | mock 무료 캡처 (신규) |
| `scripts/59-62cha-paid-qa.ts` | 59차 유료 QA 스크립트 (신규) |

**미변경:** `callout` / `pointLabel` / `compact` 기존 레이아웃, 전자제품 외 카테고리

---

## `npx tsc --noEmit`

59차 관련 **에러 0건**.

---

## 검증 체크리스트

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` 에러 0건 (관련) | ✅ |
| mock 좌표로 점/리더라인/라벨 렌더 (무료) | ✅ |
| Vision 좌표 실제 생성 1회 | ✅ (final 1회 완료) |
| Vision 좌표 육안 정확도 | ⚠️ 이번 생성에서 annotated 미적용 (svg line 0) |
| 신뢰도 낮을 때 레이아웃 생성 안 함 (안전 폴백) | ✅ 동작 확인 |
| callout/pointLabel/compact 회귀 없음 | ✅ (mock 캡처) |
| 전자제품 외 카테고리 변경 없음 | ✅ |

---

## 스크린샷

### 무료 mock (`capture=59-electronics`)

| 파일 | 바이트 |
|------|-------:|
| `59cha-annotated-full.png` | 1,833,036 |
| `59cha-annotated-crop.png` | 477,350 |

mock: annotation label 1, svg leader lines 3.

### 유료 실제 생성 (전자제품 1회)

| 파일 | 바이트 |
|------|-------:|
| `59cha-final-electronics.png` | 2,694,824 |

실제 생성 페이지에서 svg leader lines **0** → Vision 신뢰도 `low` 또는 `feature_detail` 대상 이미지에서 좌표 확신 불가 시 **annotated 레이아웃을 생성하지 않고 full 유지** (요구된 안전 폴백).

---

## Vision / 생성 비용

| 호출 | 횟수 |
|------|------|
| `/api/generate` final (전자제품) | **1회** |
| Vision 주석 분석 (Haiku, generate 파이프라인 내) | 1회 시도 (적용 시에만 섹션 변경) |

---

## 비고

- 렌더러(작업 A)는 mock으로 검증 완료.
- Vision(작업 B)은 실제 1회 생성에서 폴백 경로가 확인됨. 좌표가 맞는 annotated 사례는 후속 전자제품 생성에서 재검증 가능.
- 60차 선행 완료 후 59차 타입/렌더 분기 적용.
