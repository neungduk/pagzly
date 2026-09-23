# 251차 보고 — illustration_banner 실사진 배너 전환

생성: 2026-09-23 · **API generate: 0** (기존 세션 자산 재사용) · **Replicate illustration_banner 호출 제거** ($0.04~$0.08/장 절감)

## 요약

AI 추상 일러스트(recraft) 생성을 끊고, 업로드된 상품 사진을 `assignDistinctSectionImages`로 배정해 풀블리드 배경으로 씀. 249차 다크 패널 스크림·`line-clamp-2`는 유지. 레거시 `illustrationUrl`은 우선 표시.

| 항목 | 결과 |
|------|------|
| `generateIllustrationBanner` in `route.ts` | **제거됨** (`rg` 매치 0) |
| 배너↔hero/image_text 인덱스 충돌 | **없음** (verify PASSED) |
| 레거시 `illustrationUrl` | HTML에 URL 유지, imageIndex 폴백 안 함 |
| before / after | 249차 일러스트 vs 이번 실사진 |

---

## 변경 파일

1. **`lib/types/generate.ts`** — `imageIndex?: number` 추가, `illustrationUrl` optional(레거시)
2. **`lib/assign-section-images.ts`** — `collectUsedIndexes` / `countPlacements` / placement·pick·map / freq 진단에 `illustration_banner` 편입. `preferForSlot("illustration_banner")` → lifestyle 우선 + `pickBestIndexByCopy`
3. **`app/api/generate/route.ts`** — Replicate 루프·import·`illustrationCost` 제거. 프롬프트/스키마를 imageIndex 배정 안내로 변경
4. **`components/DetailSectionRenderer.tsx`** — `illustrationUrl` 우선, 없으면 `resolveImage(..., imageIndex)`. blur/장식 폴백 제거. 249 스크림 유지
5. **`lib/export-detail-html.ts`** — `illustrationUrl \|\| imageUrls[imageIndex] \|\| imageUrls[0]`. 스크림/clamp 유지
6. **`lib/section-templates.ts`** — 노트: 실사진·imageIndex
7. **`lib/concept-illustration.ts` / `illustration-banner-fallback.ts`** — 파일 유지(미호출)

---

## 검증

`npx tsx scripts/251cha-illustration-banner-photo-verify.ts` → **PASSED**

- 247 `session.json` imageUrls 13장 + dummy: hero + image_text×2 + illustration_banner
- `assignDistinctSectionImages` → banner `imageIndex=2`, hero/it와 비충돌
- export HTML에 배정 사진 URL 포함, blur 폴백 없음, 249 스크림 유지
- 레거시: `illustrationUrl` 있으면 그 URL 렌더, `imageUrls[imageIndex]` 미사용

### 스크린샷

| before (249차 일러스트) | after (251차 실사진) |
|-------------------------|----------------------|
| `review/251cha-illustration-banner-photo/before-249cha-illustration.png` | `review/251cha-illustration-banner-photo/after.png` |

after: 앰버 세럼 병 실사진 위 다크 패널 + 「맑게 스며드는 하루」.

---

## grep

```
rg generateIllustrationBanner app/api/generate/route.ts
→ (no matches, exit 1)
```

---

## git diff --stat (핵심)

```
 app/api/generate/route.ts    | 209 ++++++++++----------
 lib/assign-section-images.ts | 213 +++++++++++++++++++++---------
 lib/section-templates.ts     |  12 +--
 lib/types/generate.ts        |  49 ++++++++-
```

(+ `DetailSectionRenderer` / `export-detail-html` 라이브·export 패리티, 누적 diff 포함)

신규: `scripts/251cha-illustration-banner-photo-verify.ts`, `review/251cha-illustration-banner-photo/`

---

## API

**generate: 0** · illustration Replicate **−1회/상품** (호출 경로 삭제)
