# 140차 — 인포 비주얼 모델 A/B (flux-schnell vs recraft-v3)

생성: 2026-09-08

## 요약

`IconModelKey`에 **recraft-v3** 추가(기본값 변경 없음). 동일 라벨로 schnell/recraft 각 1세트 생성·비교.  
`.env.local` `ICON_MODEL`은 원복됨(`flux-schell` — 기존 오타 그대로; `getIconModel()`은 미인식 시 schnell 폴백).

## 스키마 확인 (추측 금지)

Replicate OpenAPI (`GET /v1/models/recraft-ai/recraft-v3`, 2026-09-08):

| 필드 | 비고 |
|------|------|
| `prompt` | required |
| `aspect_ratio` | enum 포함 `1:1`, `16:9` |
| `size` | aspect_ratio 있으면 무시 |
| `style` | enum 포함 `digital_illustration` 등 (vector 전용 키 없음) |
| Output | URI string |

증거: `review/140cha-recraft-v3-input-schema.json`, `*-style-enum.json`, `*-aspect-enum.json`

구현 input:

```ts
{ prompt, aspect_ratio: "1:1"|"16:9", style: "digital_illustration" }
```

## 코드 변경

- `lib/concept-icons.ts`: `recraft-v3` ref/cost/input/`getIconModel` + 429 재시도 + recraft 시 concurrency=1
- `lib/concept-illustration.ts`: 기존처럼 `buildIconModelInput`/`ICON_MODEL` 공유 (코드 변경 없음, 이미 429 재시도 보유)
- `lib/concept-effects.ts`: **미변경**

## A/B 결과 (육안)

보드:

- `review/qa-screenshots/140cha-icon-model-ab-schnell.png`
- `review/qa-screenshots/140cha-icon-model-ab-recraft.png`

단장: `review/140cha-{schnell|recraft}-icon-*.png`, `*-banner.png`

| 항목 | flux-schnell | recraft-v3 |
|------|--------------|------------|
| 배지 선명도 | 보통, 플랫하지만 거친 편 | 선·면이 또렷, 벡터/뱃지 느낌 강함 |
| 스타일 일관성 | 물방울 모티프는 맞으나 품질 편차 | 에디토리얼·브랜드 배지 톤이 확실 |
| 텍스트 환각 | 일부 글리프성 노이즈 | **프롬프트 no-text인데도 영문/한글 장식 문구를 그리는 경향** (철자 오류 포함) |
| illustration_banner | 단순 파동+원 | 금박 잎·레이어드 파동 등 **디테일 우위** |

**권고(다음 라운드 결정용):** 배너·아이콘 **디테일은 recraft가 우위**. 다만 배지에 장식 텍스트가 끼는 문제는 프롬프트 강화(`no letters, no words, blank seal`) 또는 style 재검토 후 기본값 전환을 결정하는 게 안전.

## 비용 로그

| 모델 | 장수 | 단가 | 합계 |
|------|------|------|------|
| flux-schnell | 5 (아이콘4+배너1) | $0.003 | **$0.0150** |
| recraft-v3 | 5 (아이콘4+배너1) | $0.04 | **$0.2000** |
| **A/B 합계** | | | **≈ $0.215** |

참고: 1차 배치에서 저크레딧 rate limit(burst=1)으로 recraft 아이콘 3장이 429 → 순차 refill로 보완. 로그상 `$0.04 × n` 일치.

## 환경 원복

- 비교 전 백업: `ICON_MODEL=flux-schell`
- 비교 후: 동일 라인 복구 확인 (`git diff -- .env.local` 비어 있음)
- **기본값 전환 없음**

## tsc

`tsc --noEmit` EXIT_CODE=**0**

## 보안 메모

A/B 실행 중 Replicate SDK 에러 객체에 Authorization 헤더가 터미널 로그로 찍힐 수 있음. **Replicate API 토큰 로테이션 권장.**
