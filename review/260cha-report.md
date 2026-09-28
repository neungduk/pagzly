# 260차 — 어두운 씬용 광원 쪽 림 하이라이트 QA 프로토타입

완전 오프라인. 유료 API 호출 0. `lib/`·`components/`·`app/` 변경 0. 프로덕션 미반영 — 채택 여부는 판단에 맡김.

- 스크립트: `scripts/260cha-rim-highlight-qa-prototype.ts` (신규)
- 보조 변경: `scripts/258cha-shadow-visibility-diagnose.ts` — `composeLikeProd()`, `lstar()` export + `main`을 `require.main === module` 가드로 감쌈. 동작 변화 없음.
- 실행: `npx tsx scripts/260cha-rim-highlight-qa-prototype.ts` (기본) / `RIM_VARIANT=max` 동일 명령 (브리프 범위 상한)
- 산출: `review/260cha-rim-highlight-qa/`, `review/260cha-rim-highlight-qa-max/` (커밋 안 함)

## 구성

(a) 그림자만 = 258차 `composeLikeProd()` 재조립 결과. 5개 케이스 모두 실제 `pasteCutoutOnScene()` 출력과 **바이트 동일** 확인 (`shadowOnlyIsProdBytes = true`). 259차 그림자 수정·258차 그레인 2.2 그대로.

(b) = (a) 위에 하이라이트 레이어 한 장만 얹음. 하이라이트는 스크립트 안에만 존재.

하이라이트 레이어 (컷아웃 크기, paste 박스 위치에 합성):

1. 밴드: 컷아웃 알파 ≥ 128 픽셀 중, 반경 `bandPx` 원 안에 알파 < 128(또는 이미지 밖) 픽셀이 있는 것 = 안쪽 둘레 밴드.
2. 방향: 바깥 법선 = −∇(σ2 블러 알파). 광원 방향 = `shadowOffsets()`(lib 비공개, 분기 복제) 오프셋의 반대 단위벡터. `DEFAULT_SHADOW`(upper-left) → 광원 (−0.750, −0.662), 즉 좌상단.
   가중치 = clamp(cos(법선, 광원) / 0.5, 0, 1) → 광원 쪽 절반만 남음.
3. 색: `sampleBackdropAmbientColor(scene)` 각 채널 + `lift`, 255 클램프.
4. 레이어 알파 = 255 × 가중치 × `opacity` × (컷아웃 알파/255).
5. 합성: screen, JS 교과서식 `out = b + α·s·(1 − b/255)` (아래 "sharp screen 문제" 참고).
6. 게이트: paste 박스를 가로·세로 각각 박스 크기의 50%씩 사방 확장한 영역의 씬(원본, 합성 전) 평균 휘도(0.2126R+0.7152G+0.0722B) < 60 일 때만 적용. 아니면 (b) = (a) 버퍼 그대로.

## 정확한 상수

| 상수 | 기본 | max 변형 |
|---|---|---|
| 밴드 폭 `bandPx` | 3 px | 4 px |
| 밝기 오프셋 `lift` | 주변색 +50/채널 | +60/채널 |
| opacity | 0.20 | 0.25 |
| blend | screen (JS 교과서식) | 동일 |
| 게이트 임계값 `gateLum` | 평균 휘도 < 60 | 동일 |
| 게이트 영역 `gateExpand` | 박스 ±50% | 동일 |
| 상품 내부 판정 `solidAlpha` | 128 | 동일 |
| 법선 블러 σ | 2 | 동일 |
| 방향 가중치 풀 cos | 0.5 | 동일 |

## 페어별 결과 (기본 상수)

컷아웃은 모두 257차 합성 컷아웃(`PAIRS[0]`, 전자제품/02-pexels-33936400, dark-bg 키 18/40).

| 케이스 | 씬 | 게이트 평균 휘도 | 림 | 림 색 (주변색) | 밴드 / 점등 px | (b)=(a) 바이트 |
|---|---|---|---|---|---|---|
| 1-dark-257scene-palm | 257 어두운 씬, 257 placement | **54.4** | ON | (65,67,65) ← (15.3,17.0,15.1) | 3167 / 1595 | 아님 |
| 2-dark-257scene-top-black | 257 씬, xPct 30 / yPct 6 (상단 검정 영역) | **11.3** | ON | (65,67,65) | 3167 / 1595 | 아님 |
| 3-dark-hand-31203656 | `_168cha-living/hand-31203656` | **34.5** | ON | (81,77,73) ← (31.0,26.9,22.9) | 2684 / 1349 | 아님 |
| 4-mid-food-16513595 | `식품/01-pexels-16513595` | **88.5** | OFF | — | — | **동일** |
| 5-bright-living-6801218 | `생활용품/02-pexels-6801218` (밝은 씬) | **181.8** | OFF | — | — | **동일** |

케이스 3~5 placement: xPct 36 / yPct 50 / wPct 26 / hPct 22 / rot −8. 케이스 1은 257차 placement 그대로(28/42/26/22/−8).

밝은 페어(5)와 중간 페어(4): 게이트 OFF → (b) 파일이 (a)와 바이트 동일 (`withRimIdenticalToShadowOnly = true`). 시각적으로 동일.

림 변화량 (변경된 픽셀만, ΔL* = L*(b) − L*(a)):

| 케이스 | 변경 px | 평균 ΔL* | 최대 ΔL* | ΔL*≥1 | ΔL*≥2 |
|---|---|---|---|---|---|
| 1 기본 | 1558 | 2.76 | 5.58 | 84.1% | 68.5% |
| 2 기본 | 1559 | 2.75 | 5.62 | 84.2% | 69.3% |
| 3 기본 | 1333 | 3.24 | 6.13 | 84.9% | 73.4% |
| 1 max | 1988 | 4.13 | 7.88 | 89.4% | 80.9% |
| 2 max | 1989 | 4.14 | 7.92 | 89.6% | 80.9% |
| 3 max | 1674 | 4.75 | 8.70 | 90.9% | 83.4% |

(max 변형의 게이트·바이트 동일 결과는 기본과 같음: 1~3 ON, 4·5 OFF & 동일.)

관찰 (사실만): 3× 줌에서 케이스 뚜껑 좌상단 모서리·좌측 모서리, 이어버드 윗면에 얇은 회백색 선이 보임. 우하단 쪽 모서리에는 없음. 마스크(`*-rim-mask.png`)는 연속선.

## sharp `screen` 문제 (기록)

sharp(libvips) `composite({ blend: "screen" })`는 부분 알파 레이어에서 교과서 screen보다 훨씬 약함. 단색 4×4 테스트 (레이어 색 65):

| 알파 | 바탕 | sharp screen | 교과서 screen | sharp lighten | 교과서 lighten |
|---|---|---|---|---|---|
| 0.2 | 30 | 32 | 41.5 | 30 | 37.0 |
| 0.2 | 120 | 121 | 126.9 | 120 | 120.0 |
| 0.5 | 30 | 44 | 58.7 | 31 | 47.5 |
| 1.0 | 30 | 87 | 87.4 | 65 | 65.0 |

알파 1에서는 일치, 부분 알파에서 약 α² 수준으로 줄어듦. `lighten`은 부분 알파에서 사실상 무변화. 그래서 이 프로토타입은 screen을 JS로 직접 합성함.

같은 레이어를 sharp screen으로 합성했을 때(참고, `sharpScreenRimDelta`): 기본 상수 평균 ΔL* 0.50~0.55 / 최대 0.98 / ΔL*≥1 0%, max 상수 평균 0.76~0.90 / 최대 1.89 / ΔL*≥2 0%.

같은 테스트에서 `multiply`(프로덕션 그림자 blend, 색 40)는 교과서식과 거의 일치(알파 0.2·바탕 120: sharp 96 vs 99.8, 약간 더 진함). 즉 258차 "어두운 씬에서 multiply 그림자가 안 보임" 결론은 이 문제와 무관.

진행 중 버그 1건 수정: `sharp(1채널 raw).blur().raw()`가 3채널로 나와 법선 계산이 틀렸음(점선 마스크, 반대쪽 점등) → `.extractChannel(0)` 추가, 길이 검사 추가.

## 검증

- `rg -i "replicate|fetch\("` on `scripts/260cha-rim-highlight-qa-prototype.ts`, `scripts/258cha-shadow-visibility-diagnose.ts` → 0건.
- `lib/`·`components/`·`app/` 313개 파일 mtime: 작업 전 스냅샷(`review/260cha-rim-highlight-qa/mtime-before.txt`) 대비 변경 0.
- `git status -- lib components app` → 깨끗.
- (a) = 실제 `pasteCutoutOnScene()` 바이트 동일: 5/5.
- 밝은 페어 (b) = (a) 바이트 동일: 케이스 4·5.

## 산출 파일 (케이스별)

`review/260cha-rim-highlight-qa/` (기본), `review/260cha-rim-highlight-qa-max/` (max):

- `<case>-a-shadow-only.png` — 그림자만 (= 현재 프로덕션)
- `<case>-b-shadow-plus-rim.png` — 그림자 + 림
- `<case>-c-side-by-side.png` — (a)|(b), 게이트 값 라벨
- `<case>-d-zoom3x-side-by-side.png` — paste 박스 주변 3× nearest 확대
- `<case>-rim-mask.png` — 림 레이어 알파 (적용 케이스만, opacity로 정규화)
- `results.json` — 상수 + 케이스별 수치

자연스러움 판단·채택 여부는 포함하지 않음.
