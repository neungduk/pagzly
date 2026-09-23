# 221차 — image_text 헤드라인 가로 오버플로우 수정

생성: 2026-09-18 · 유료 API 0건 · tsc 0

## 한줄 결론

`image_text` 헤드라인에 `break-words` + `![overflow-wrap:anywhere]`를 적용해, 공백 없는 긴 토큰도 카드 밖으로 흘러넘치지 않고 `line-clamp-5`로 `···` 처리됨을 확인.

---

## 1. 코드 변경

### `components/DetailSectionRenderer.tsx` — `case "image_text"` 헤드라인 (~1930)

```tsx
className={`break-words ![overflow-wrap:anywhere] line-clamp-5 pagzly-display-headline font-heading text-[2rem] font-bold leading-[1.2] tracking-[-0.03em] text-ink sm:text-[2.75rem]`}
```

- 지시서의 `break-words` 추가에 더해 `![overflow-wrap:anywhere]`가 필요했음.
- 원인: `app/globals.css`의 `[data-pagzly-preview][data-headline-face=…] .pagzly-display-headline`이 `word-break:keep-all; overflow-wrap:break-word`를 **더 높은 특이도**로 이미 지정. Tailwind `break-words`(= `overflow-wrap:break-word`)만으로는 무공백 CJK 토큰이 줄바꿈되지 않음.
- `anywhere`는 keep-all을 유지한 채 overflow 시에만 강제 줄바꿈 → 자연어 헤드라인("방 안에 놓이는 디자인")은 공백 단위로 유지.

### 본문 (`<p>`, ~1938)

`TYPO.body`에 `break-words` 없음 → `break-words` 추가 (`line-clamp-7 ${TYPO.body}`). 중복 아님.

### `lib/export-detail-html.ts` — `image_text` 분기

callout / split / default 헤드·본문 인라인에 `overflow-wrap:anywhere` 적용(기존 `break-word`만으로는 export CSS의 `keep-all`과 동일 이슈).

---

## 2. 검증 (API 0)

스크립트: `scripts/221cha-headline-screenshot.ts`  
세션: `review/181cha-live/{electronics,pet}/session.json` 로드 (생성 API 없음)

| 대상 | 경로 | 결과 |
|------|------|------|
| electronics 40자+ 무공백 더미 | `review/221cha-headline-check/electronics-long-dummy-after.png` | `overflowX:false`, 5줄+`···` |
| electronics "방 안에 놓이는 디자인" | `review/221cha-headline-check/electronics-design-detail.png` | 회귀 없음 |
| pet "2kg 한 봉 포장" (이식) | `review/221cha-headline-check/pet-packaging-design.png` | 가로 오버플로우 없음 |

계측(더미): `hRight` 787.9 ≤ `previewRight` 876, `ch` 264 ≈ line-clamp-5 높이.

---

## 3. 완료 기준

- [x] 헤드라인 `break-words` (+ keep-all 특이도 대응 `anywhere`)
- [x] 본문 `break-words` (필요 시)
- [x] export `image_text` overflow-wrap 대응
- [x] 더미 스크린샷으로 뷰포트 이탈 없음 확인
- [x] tsc 0 · API generate 0
