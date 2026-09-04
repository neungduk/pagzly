# 112차 — AI 사용샷 단독 저비용 검증 (실행 결과)

생성: 2026-09-04  
전제: 사용자 승인 후 실행. `.env.local` 파일 미수정.

## 비용 합계

| 단계 | 결과 | 비용 |
|------|------|------|
| 1차 `--execute` (cookies 오류) | Replicate 미호출 | $0 |
| 2차 `--execute` (CLI job tracking 수정) | Kontext 빈손 씬 성공, `file://`로 합성 fetch 실패 | **$0.0405** |
| 3차 `--composite-only` (data URL 수정, 빈손 씬 재사용) | pixel-paste 성공 | **$0.0150** |
| **합계** | | **~$0.0555** |

`TEST_MODE` restore 후 `true` 확인됨.

## 산출물

- `review/112cha-lifestyle-empty-scene.png` — Kontext 빈손 씬 (실제로는 **흰 병이 이미 그려짐**)
- `review/112cha-lifestyle-composite-sample.png` — 픽셀 합성 결과 (`method=pixel-paste`)
- 원본 제품 참조: `review/112cha-source-product.png` (라벨 있는 미스트병)

## 육안 진단

1. **빈손 지시 미준수 (Kontext)**  
   empty scene에 이미 흰 드로퍼/병이 있음. `PRODUCT_LIFESTYLE_EMPTY_SCENE` 프롬프트가 무시된 케이스로 보임.

2. **픽셀 합성은 파이프라인상 성공**  
   empty↔composite `meanAbsDiff≈43.8` (880×1184). hand placement 3회 후 reliable=true → `direct-paste success`.

3. **픽스처 URL이 병이 아님 (검증 무효에 가깝음)**  
   기본 `productImageUrl`이 `…enhanced-fx-moisture.png` — **잎·물방울 FX 컷**이라 rembg 후 손 위에 잎/방울이 붙여짐.  
   “병 크기가 손에 맞는지 / 라벨=원본” 검증 목적에는 **부적합**.  
   올바른 라벨 병 URL로 `--url=` 재실행이 필요 (추가 비용·승인 필요).

4. **스케일 과대 문제**  
   이번 컷으로는 병 스케일을 판정할 수 없음 (입력이 병이 아님).

## 스크립트 수정 (재실행용)

- `IMAGE_JOB_TRACKING=false` — CLI cookies 우회
- upload를 **data URL**로 (file:// fetch 불가 수정)
- `--composite-only` — 기존 empty 씬 재사용 (Kontext 재과금 방지)

## 세럼병 composite-only 재검증 (승인 2차)

- 입력: QA 라벨 세럼병 URL (기본값 수정본)
- 빈손 씬: 기존 `112cha-lifestyle-empty-scene.png` 재사용 (Kontext $0)
- 결과: `pixel-paste` 성공, **billed $0.0053**
- `TEST_MODE` restore → true

### 육안 (세럼병)

1. **원본 라벨 병(호박색 드로퍼)이 손 위에 픽셀 합성됨** — FX컷 문제 해소.
2. **사이즈**: 손 대비 과대하지 않음(한 손에 들어오는 병 스케일). 111차 물리 스케일이 이번 컷에서는 정상 범위.
3. **빈손 씬 실패 잔존**: empty에 이미 **흰 병**이 있어, 합성 후 **흰 병 + 호박 병 이중**으로 보임.  
   → “제품만 진짜” 목표에 대해 **씬 생성 품질이 병목**. 스케일 로직보다 empty-scene 거부 게이트가 후속 과제.
4. 라벨/형태: 호박 병은 컷아웃으로 보이며 그림자는 씬과 완전 일치하진 않음(합성 한계).

## 누적 비용

| 구간 | 비용 |
|------|------|
| 이전 (Kontext+실패 합성+FX합성) | ~$0.0555 |
| 세럼병 composite-only | **$0.0053** |
| **누적** | **~$0.061** |

