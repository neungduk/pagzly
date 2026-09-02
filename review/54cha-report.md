# 54차 완료 보고 — quick_points(컴팩트 96px) 이미지 선택 개선

생성: 2026-09-01

원칙: 코드 수정 + 무료 검증만. 유료 API 생성 없음.

---

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/assign-section-images.ts` | `quick_points`를 `detail_zoom`/`fabric_composition`에서 분리; 우선순위 **package → hero → detail**. `quick_points`는 `excludeHero: false`로 hero 컷 배정 허용 |
| `scripts/verify-54cha-quick-points.ts` | 6개 시나리오 로컬 검증 스크립트 (신규) |
| `review/54cha-quick-points.md` | 검증 결과 자동 생성 |

작업 B(컴팩트 전용 sharpen)는 작업 A로 충분해 **스킵**.

---

## 핵심 변경

```ts
// detail_zoom / fabric_composition — 기존 유지
if (slot === "detail_zoom" || slot === "fabric_composition") {
  return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
}

// quick_points — 54차 분리
if (slot === "quick_points") {
  return (
    rolePrefer("package") ??
    rolePrefer("hero") ??
    rolePrefer("detail", imageCount > 1 ? 1 : undefined)
  );
}
```

추가: `pick()` 호출 시 `quick_points`만 `excludeHero: false` — 기존에는 imageCount≥3이면 hero 인덱스가 막혀 package 없을 때 hero 폴백이 동작하지 않았음.

---

## tsc 결과

```bash
npx tsc --noEmit
```

| 결과 | 비고 |
|------|------|
| **54차 변경 파일: 에러 0건** | |
| 기존 무관 에러 1건 | `review/pixabay-cosmetics-test/crawl-pixabay.mts` (범위 밖) |

---

## 검증 체크리스트

`npx tsx scripts/verify-54cha-quick-points.ts` → **6/6 PASS**, exit 0

| 시나리오 | 결과 | 상세 |
|----------|------|------|
| 반려동물 — package/hero 우선 (매크로 detail 다수) | PASS | imageIndex=**4** (package), detail@1 회피 |
| 폴백 — package/hero 없음, detail만 | PASS | imageIndex=0 (첫 detail, 정상 폴백) |
| detail_zoom 회귀 없음 | PASS | imageIndex=1 (detail 유지) |
| 화장품 — 기본 역할 순서 | PASS | imageIndex=**3** (package), 기존 detail@1 대신 선명 컷 |
| 전자제품 — package 없으면 hero | PASS | imageIndex=**0** (hero) |
| quick_points 3개 연속 | PASS | **[4, 0, 1]** — 1·2번째 package/hero, 3번째 pool 소진 후 detail 폴백 |

### 체크리스트 대응

| 항목 | 결과 |
|------|------|
| tsc 에러 0건 (54차 파일) | ✅ |
| 반려동물 매크로 detail → package/hero 우선 | ✅ (detail@1 → package@4) |
| package/hero 없을 때 detail 폴백 | ✅ |
| detail_zoom/fabric_composition 회귀 없음 | ✅ |
| 다른 카테고리 부작용 | ✅ 화장품·전자도 선명 컷 우선 (의도된 개선) |

---

## 기대 효과

53차에서 진단한 반려동물 "하루 1~2개" 블러: `quick_points`가 detail 매크로 컷(인덱스 1) 대신 package 컷(인덱스 4)을 받게 되어, `featherCutout` 페더가 96px에서 전체를 뿌옇게 만드는 문제가 완화됩니다. 전역 `featherCutout` 로직은 변경하지 않았습니다.

실제 화면 재확인은 다음 유료 생성 라운드에서 `51cha-final-qa.ts --only=pet` 재캡처로 검증 예정.
