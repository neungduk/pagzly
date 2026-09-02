# 75차 — 캔버스 Phase 4: AI 이미지 생성 요소

## 목표

프롬프트 + 선택적 참조 사진으로 AI 이미지를 생성해 캔버스에 `ai-image` 요소로 삽입한다. 기존 Replicate 파이프라인·토큰 차감을 재사용한다.

## 범위

### 데이터 모델
- `CanvasElement` union에 `kind: "ai-image"` (`prompt`, `refImageUrl?`, `resultUrl?`, `status`)
- `createCanvasAiImageElement()`

### API
- `POST /api/canvas-ai-image` — 인증, 토큰 잔액 확인(20토큰), `generateCanvasAiImage`, 스토리지 업로드, `deduct_credits`

### 생성 파이프라인 (`lib/canvas-ai-image.ts`)
- 참조 없음 / TEST_MODE: flux-schnell
- 참조 사진 있음: nano-banana (`image_input`)

### UI
- 툴바 `AI 이미지` 버튼
- `CanvasAiImagePanel` — 프롬프트, 참조 사진 선택, 생성/재시도, 402 토큰 부족 안내
- 캔버스 placeholder (pending/failed) + 완료 시 이미지 렌더
- export: `status === "done"` && `resultUrl`만 출력

## QA

```bash
npx tsx scripts/capture-75cha-canvas-ai-image.ts
```

## 다음 (76차)

회귀 테스트, 모바일 스케일링, 성능, tsc 전체 통과
