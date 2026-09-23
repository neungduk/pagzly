# 219차 — image_text 헤드라인 잘림 + 초대형 키워드 오버플로우 수정

생성: 2026-09-17 · **유료 API 0건**

## 한줄 결론

키워드 숫자 토큰 가드 + `break-words`/`overflow-wrap` 방어선 적용.  
`image_text` 본문은 `line-clamp-5→7`로 electronics 실측 overflow 해소(207/148 → 207/207).  
헤드는 제안 `line-clamp-3`만으로는 부족했고, 더 큰 원인으로 **`pagzly-ink-headline { display:inline-block }`이 `line-clamp`의 `-webkit-box`를 덮어 줄 수 제한이 무력화**되는 충돌을 발견 — 이 분기에서 ink 클래스를 빼고 `line-clamp-5`로 최종 적용.

---

## 1. 코드 변경 요약

### `lib/detail-visual-enhancements.ts` — `parseMegaKeywordHeading`

숫자가 섞인 첫 토큰(`210g/yd` 등)은 키워드 승격 제외. 라틴 분기는 미변경.

### `components/DetailSectionRenderer.tsx`

- `TYPO.keywordDisplay`에 `break-words` 추가
- `image_text` 기본 분기(EDITORIAL_BLEED 제외):
  - 헤드: `line-clamp-5` + `pagzly-display-headline` 타이포( **`pagzly-ink-headline` 제외** )
  - 본문: `line-clamp-7`
- `HEADLINE_CLAMP` 전역 상수는 그대로(다른 섹션 영향 없음)

### `lib/export-detail-html.ts`

`keywordClamp` / `keywordClampCard` 인라인 style 3곳에 `overflow-wrap:break-word;` 추가.

---

## 2. 검증 A — keyword guard

`npx tsx scripts/219cha-keyword-guard-verify.ts`

```
ok: 210g/yd keyword null (got null)
ok: 210g/yd remainder intact (got "210g/yd")
ok: 코튼 100% keyword (got "코튼")
ok: 코튼 100% remainder (got "100%")
ok: 수축 2%↓ keyword (got "수축")
ok: AURA LAB latin keyword (got "AURA")
ok: 단당 80kg still promotes (got "단당")
API generate: 0
VERIFY:0
```

---

## 3. 검증 B — Playwright 실측 (before/after)

픽스처: `review/181cha-live/{electronics,pet}/session.json` (신규 생성 없음).  
뷰포트 1280×900, 모바일 미리보기 프레임. pet `packaging_design`은 display budget(EXTRA_IMAGE demote)으로 안 보여, 검증 시에만 보이는 `usage_scenario` 호스트에 문구 이식(원본 JSON 파일 불변).

### before (`review/219cha-live/clamp-before.json`)

| key | h3 sh/ch | h3 overflow | p sh/ch | p overflow |
|-----|----------|-------------|---------|------------|
| electronics | 216/211 | true* | **207/148** | **true** |
| pet | 38/34 | true* | — | — |

\*헤드 before의 5px 차는 `pagzly-ink-headline` 때문에 `line-clamp-2`가 실제로 2줄로 안 줄고(대조 실험: ink 제거 시 clamp-2 → ch=106), 폰트 메트릭 허상에 가깝습니다. **본문 207 vs 148이 명확한 잘림 증거**입니다.

### after (`review/219cha-live/clamp-after.json`) — 최종 clamp **헤드 5 / 본문 7**

| key | h3 sh/ch (delta) | p sh/ch | long dummy overflow |
|-----|------------------|---------|---------------------|
| electronics | 216/211 (δ=5 ≤8) | **207/207** | true (안전장치 유지) |
| pet | 38/34 (δ=4 ≤8) | — | true |

### 조정 서사 (숨기지 않음)

1. 제안 3/7 → 본문 OK, 헤드 δ 잔존  
2. 4/5/웹킷 important 시도 → `pagzly-ink-headline`의 `inline-block`이 clamp display를 덮는 것 확인  
3. ink 제거 + `line-clamp-2` 대조 → ch=106으로 진짜 2줄 클램프 확인  
4. 최종 **line-clamp-5**(잉크 제외) + **line-clamp-7** 채택  

---

## 4. 검증 C — 기존 회귀

```
# 211cha-lifestyle-matching-verify.ts
… VERIFY:0

# 218cha-matching-intensity-verify.ts
… reduction=35.3% … VERIFY:0
```

(이번 변경과 무관 — 통과)

---

## 5. API generate: 0

Replicate / Claude Vision / DeepSeek / `/api/generate` **호출 없음**.  
Playwright는 기존 세션 JSON 로드 + 로컬 렌더만. 테스트 유저 온보딩은 auth 복구용(생성 API 아님).

---

## 산출물

```
review/219cha-report.md
review/219cha-live/clamp-before.json
review/219cha-live/clamp-after.json
scripts/219cha-keyword-guard-verify.ts
scripts/219cha-clamp-overflow-verify.ts
```
