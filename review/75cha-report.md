# 75차 리포트 — 캔버스 Phase 4 (AI 이미지)

## 요약

캔버스 편집기에 **AI 이미지 생성 요소**를 추가했다. 프롬프트와 선택적 참조 사진으로 Replicate(flux-schnell / nano-banana)를 호출하고, 성공 시 20토큰을 차감한 뒤 결과 URL을 요소에 저장한다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/types/generate.ts` | `ai-image` kind |
| `lib/canvas-ai-image.ts` | Replicate 생성 로직 |
| `lib/cost/saas-pricing-config.ts` | `TOKEN_COST_CANVAS_AI_IMAGE = 20` |
| `app/api/canvas-ai-image/route.ts` | API + 크레딧 차감 |
| `lib/canvas-section-mutations.ts` | `createCanvasAiImageElement`, 레이블 |
| `components/CanvasAiImagePanel.tsx` | 프롬프트·참조·생성 UI |
| `components/CanvasSectionRenderer.tsx` | 렌더·툴바·패널 연동 |
| `components/DetailSectionRenderer.tsx` | `productContext` 전달 |
| `lib/canvas-section-export-html.ts` | 완료된 AI 이미지만 export |
| `lib/canvas-section-fixture.ts` | QA용 pending/done 요소 |
| `scripts/capture-75cha-canvas-ai-image.ts` | QA 캡처 |

## 동작

1. **AI 이미지 추가** — pending 상태 placeholder가 캔버스에 배치된다.
2. **패널** — 프롬프트 입력, 상품 사진 참조 선택(선택),「이미지 생성」클릭.
3. **API** — 잔액 부족 시 402 + `insufficient_credits`. 성공 시 스토리지 업로드 후 `resultUrl`·`status: done`.
4. **실패** — `status: failed`,「다시 생성」버튼으로 재시도.
5. **Export** — 미완료 요소는 HTML에서 제외.

## QA 스크린샷

- `review/qa-screenshots/75cha-canvas-toolbar-ai.png`
- `review/qa-screenshots/75cha-canvas-ai-image-panel.png`
- `review/qa-screenshots/75cha-canvas-ai-elements.png`

```bash
npx tsx scripts/capture-75cha-canvas-ai-image.ts
```

## 다음 단계

**76차** — 안정화·회귀·모바일·성능
