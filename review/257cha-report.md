# 257차 — 211차 매칭 3축 합성 QA 하네스 (오프라인)

- 날짜: 2026-09-28
- 유료 API: **0건** (rembg/Replicate/`/api/generate`/DeepSeek/Vision 호출 없음)
- 프로덕션 코드 변경: **없음** — 신규 파일은 `scripts/257cha-lifestyle-matching-synthetic-qa.ts` 1개
- 자연스러움 판정은 하지 않음 (Claude 육안 판단 몫). 아래는 사실만.

## 실행

```
npx tsx scripts/257cha-lifestyle-matching-synthetic-qa.ts
```

## 입력

| 항목 | 값 |
|---|---|
| 상품 사진 | `scripts/test-assets/전자제품/02-pexels-33936400.jpeg` (867×1300) |
| 씬 사진 | `scripts/test-assets/전자기기-액세서리/01-pexels-35599938.jpeg` (975×1300) |
| 합성 컷아웃 임계값 | lum = 0.299r + 0.587g + 0.114b · lum < **18** → alpha 0 · lum ≥ **40** → 원래 알파 유지(255) · 18~40 선형 보간 |
| placement | `{ xPct: 28, yPct: 42, wPct: 26, hPct: 22, rotationDeg: -8 }` (브리프 예시값 그대로, 조정 안 함) |

- placement는 배치 정확도 검증용이 아니며 정확한 값은 중요하지 않음. 이 좌표에서 붙여넣은 상품은 씬에 원래 있던 검은 이어버드 케이스의 왼쪽 절반과 엄지 아래 손바닥 위에 겹쳐 놓임.
- 브리프에 없던 처리 1건: 합성 컷아웃을 alpha ≥ 128 픽셀의 bbox(+2% 패딩)로 잘라냄 (98, 323, 717×795). 안 자르면 원본 캔버스의 84%가 투명이라 placement 박스 안에서 상품이 아주 작게 들어감. 매칭·붙이기 두 버전 모두 잘라낸 같은 버퍼를 씀.
- `pasteCutoutOnScene`에 넘긴 `confidence: "high"`는 타입 필수 필드일 뿐이고 함수 안에서 쓰이지 않음.

## 합성 컷아웃 통계 (원본 867×1300 기준)

| 투명 (lum<18) | 부드러운 경계 (18~40) | 불투명 (≥40) |
|---|---|---|
| 83.88% | 6.65% | 9.47% |

## 산출 파일 (`review/257cha-lifestyle-matching-qa/`)

| 파일 | 내용 |
|---|---|
| `electronics-A-matched.png` | `pasteCutoutOnScene()` 그대로 호출 (페더 → WB → 선명도 → 그레인 → 실루엣 그림자) |
| `electronics-A-raw-baseline.png` | 같은 컷아웃·같은 기하(회전 → inside 리사이즈 → 박스 중앙 → 클램프)로 `sharp().composite()`만. 페더·매칭·그림자 없음 |
| `electronics-A-side-by-side-raw-left-matched-right.png` | 왼쪽 raw, 오른쪽 matched |
| `electronics-A-raw-baseline-zoom2x.png` / `electronics-A-matched-zoom2x.png` | 붙인 영역 주변 크롭, nearest 2배 확대 (경계·그레인 확인용) |
| `electronics-A-synthetic-cutout.png` | 합성 컷아웃 자체 (알파 포함) |
| `results.json`, `run.log` | 수치 기록 |

- B 페어: **만들지 않음 (선택 항목)**. `생활용품/`, `_168cha-living/`, `식품/`, `화장품-뷰티/`에서 후보를 봤지만 전부 배경이 복잡하거나(커튼·실외·인물) 상품과 배경 밝기가 비슷해서(흰 머그 + 밝은 회색 배경) 휘도 임계값만으로는 컷아웃이 안 나옴.

## 수치 (붙인 박스 영역 273, 552, 254×274 px — 상품 + 주변 씬 포함)

| 버전 | R mean / stdev | G mean / stdev | B mean / stdev |
|---|---|---|---|
| 씬 원본 (붙이기 전) | 56.79 / 69.23 | 49.66 / 52.45 | 48.01 / 50.67 |
| raw 붙이기 | 61.44 / 72.56 | 57.30 / 51.05 | 58.97 / 53.13 |
| matched | 55.65 / 66.10 | 49.83 / 48.62 | 49.32 / 47.18 |

(박스에 상품 외 씬 픽셀이 섞여 있어 상품 자체의 색 변화량이 아니라 영역 평균임.)

## 검증

- `rg -i "replicate|fetch\(" scripts/257cha-lifestyle-matching-synthetic-qa.ts` → **0건**
- `lib/`, `components/` 전체 262개 파일 mtime을 실행 전에 스냅샷(`mtime-before.txt`) → 스크립트 작성·실행 후 비교 **차이 0건**. `git status -- lib components app` 변경 없음.
- `lib/lifestyle-product-composite.ts`는 모듈 최상단에서 `replicate`를 import하지만 클라이언트 생성은 함수 안(`process.env.REPLICATE_API_TOKEN` 읽는 곳)에서만 일어나고, 이 스크립트는 `pasteCutoutOnScene`만 호출함.
