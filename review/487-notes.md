# 487차 노트 — 프리뷰 타입 오류

## A. 원인 확인

### 호출 → 함수
| 호출 위치 | 호출식 | 피호출 |
|-----------|--------|--------|
| `components/DetailSectionRenderer.tsx:6524` | `calloutSourcesFromDetail482(sections, keyFeatures)` | `lib/keyvisual-482.ts` **`calloutSourcesFromDetail482`** (약 248행) |
| `lib/export-detail-html.ts:2322` | `calloutSourcesFromDetail482(visibleSections, opts.keyFeatures)` | 동일 |

### 인라인 매개변수 타입 (오류 시점)
```ts
sections: Array<{
  type: string;
  slot?: string;
  heading?: string;
  emphasis?: string;
  callout?: string;
  items?: string[];   // ← FAQ는 {question,answer}[]
  cards?: Array<{ title?: string; body?: string }>;
}>
```
`DetailSection[]`를 넘기면 `FaqSection.items`가 `string[]`에 안 맞아 TS2322.

### 최초 도입
- `git log -S "calloutSourcesFromDetail482" -- lib/keyvisual-482.ts`
- **`bb5e17f`** `feat(482): add local SVG/CSS keyvisual for product hero and summary` (2026-11-03) — **482차**.

### items 실제 사용
본문은 **`s.type === "checklist"`일 때만** `s.items`를 순회하며 `String(it)`로 push.
- FAQ(`type: "faq"`) 경로는 items를 읽지 않음.
- `image_text`는 emphasis/heading/callout만, `highlight_box`는 cards.title만.
→ 타입만 `DetailSection[]`로 맞추면 본문 로직 변경 불필요. checklist 분기 후 `items`는 여전히 `string[]`.

## B. 수정
- `lib/keyvisual-482.ts`: 매개변수 `sections: DetailSection[]` (+ type-only import). 본문 로직 불변.

## C. 빌드 게이트
| 명령 | 결과 |
|------|------|
| `npx tsc --noEmit` | 통과 (exit 0) |
| `npm run build` | 통과 — Compiled + Running TypeScript Finished, 55 pages |

추가 타입 오류 없음. 이후 차수 마무리: `review/CHECKLIST.md`에 `npx tsc --noEmit` 한 줄 추가.

## D. 회귀
| 항목 | 결과 |
|------|------|
| `keyvisual-482.ts` | 통과(V5 off 미삽입·마크업 상한 포함) |
| `label-check-483.ts` | 통과 |
| `contrast-render-479.ts` 단독 | 통과 |
| `run-all` | 실패 **25**/172 — 기존 24 + `렌더 대비 479` **시간 초과(721s>720s)** 1건. 단독 재실행은 통과 → 목록 변동 없음(타임아웃 플레이크). |
| 동작 | 타입 선언만 변경. export HTML 로직 경로 불변. |
