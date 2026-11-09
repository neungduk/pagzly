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
