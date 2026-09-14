# 174차 — 인포그래픽 다이어그램 Recraft 정적 아이콘 라이브러리

생성: 2026-09-14

## 요약

| 항목 | 결과 |
|------|------|
| Recraft `recraft-v4-svg` 호출 | **10회 (1회성)** · 약 **$0.80** |
| 정적 자산 | `public/icons/diagrams/*.svg` + `lib/diagram-icon-assets.ts` |
| 런타임 Recraft | **0** (페이지 생성마다 호출하지 않음) |
| 숫자·좌표 로직 | **미변경** (방수 IPX7 cx 전후 동일 검증) |
| `npx tsc --noEmit` | **EXIT 0** |

---

## 원인 정리

데이터가 있는 인포그래픽을 AI 이미지로 대체하면 안 된다(141차 텍스트/숫자 환각)는 173차 결론은 유지.  
“하찮아 보인다”의 실제 원인은 **코드로 그린 도형에 디자이너급 아이콘이 없음** — 고정 도상(물방울·박스 등)만 정적 자산으로 한 번 만들어 둔다.

---

## 생성한 아이콘 (다이어그램별)

| 다이어그램 | 아이콘 ID | 파일 |
|------------|-----------|------|
| WaterproofIp | `waterproof-droplet`, `waterproof-shield` | `public/icons/diagrams/waterproof-*.svg` |
| PackageContents | `package-box`, `package-kit` | `package-*.svg` |
| VolumeComparison | `volume-bottle`, `volume-beaker` | `volume-*.svg` |
| FoodRatio | `food-bowl`, `food-ratio` | `food-*.svg` |
| UsageOrderFlow | `usage-arrow`, `usage-flow` | `usage-*.svg` |

- 단색 실루엣 → `currentColor` 정규화 → 렌더 시 3색 토큰(`accentText` / `deepAccent`)으로 tint
- C2PA 메타데이터 제거 (`scripts/174cha-normalize-diagram-icons.ts`)

### 우선순위 낮은 다이어그램 (확인만)

Noise / Size / Weight / Power — 트랙+눈금 스타일로 이미 손본 상태. 이번 라운드 아이콘 미적용.

---

## 변경 파일

| 파일 | 역할 |
|------|------|
| `scripts/174cha-generate-diagram-icons.ts` | Recraft 1회성 생성 |
| `scripts/174cha-normalize-diagram-icons.ts` | SVG 정규화(API 없음) |
| `scripts/174cha-diagram-icons-preview.ts` | 전후·tint 스모크 |
| `lib/diagram-icon-assets.ts` | 임베드 SVG 문자열 |
| `lib/diagram-icons.ts` | tint / title / group 헬퍼 |
| `lib/waterproof-ip-diagram.ts` | 제목 옆 droplet |
| `lib/package-contents-diagram.ts` | 행별 box/kit + 제목 |
| `lib/volume-comparison-diagram.ts` | 제목 옆 bottle |
| `lib/food-ratio-diagram.ts` | 제목 옆 bowl |
| `lib/usage-order-diagram.ts` | 제목 옆 flow (노드/화살표 좌표 불변) |
| `components/WaterproofIpDiagram.tsx` | export 빌더와 동일 마크업 |
| `public/icons/diagrams/*.svg` | 정적 원본 10개 |

`export-detail-html.ts`는 이미 위 `build*DiagramSvg`를 쓰므로 **별도 수정 없이** export 경로에도 동일 적용.

---

## 검증

- 스크린샷: `review/qa-screenshots/174cha-waterproof-before-after.png`
- 4종 묶음: `review/qa-screenshots/174cha-diagrams-with-icons.png`
- 토큰 tint: `review/qa-screenshots/174cha-icon-tint-compare.png` (beauty slate / food mustard / pet red)
- 메타: `review/174cha-diagram-icons-meta.json` — `recraftCalls: 10`
- 방수 제품 좌표: before/after `circle cx` **동일**

## 하지 않은 것

- 수치·비교·좌표를 AI 이미지로 대체하지 않음
- 아이콘 다색(무지개) 금지 — 단색 + 토큰 tint만
- 생성 API 경로에 Recraft 재호출 배선 없음
- 173 Nano Banana probe와 무관
