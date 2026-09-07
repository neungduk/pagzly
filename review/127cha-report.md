# 127차 — 라이프스타일 합성 실사진 유료 검증 (차단)

생성: 2026-09-07  
전제: 126차 배선 완료. 이번 차는 코드 수정 없이 실폼(`/create/detail`) 경로 라이브 검증만.

## 결과 요약

| 항목 | 상태 |
|------|------|
| 실제 폼 경로 1회 테스트 | ❌ 미실행 (승인 범위와 구조 충돌) |
| 합성 결과 이미지 | ❌ 없음 (유료 호출 0회) |
| 콘솔 로그 (productHeightCm 등) | ❌ 없음 |
| Replicate 호출 횟수·비용 | **0회 / $0** |
| 손 대비 제품 크기 육안 판단 | **판정 불가** (합성 미실행) |
| 코드 수정 | 없음 확인 |

## 왜 “1회만”으로 폼 경로 검증이 안 되는가

실폼 승인 → `runPhotoEnhancementPipeline` 순서는 고정입니다.

1. **히어로 배경** (`generate-backdrop`)  
   - `TEST_MODE=true`: `flux-schnell` **최소 1회** (`lib/photo-enhance.ts` L627)  
   - `TEST_MODE=false`: `flux-fill-dev` × 후보 수 (다수)
2. **사진 보정** (`enhance-image`)  
   - 히어로 1장이면 `851-labs/background-remover` **추가 ≥1회** (TEST_MODE여도 rembg 생략 없음, L1675)
3. **라이프스타일 합성** (`/api/lifestyle-composite`)  
   - `TEST_MODE=true`: 원본 반환, **스케일 붙여넣기 없음** (route L57–68)  
   - `TEST_MODE=false` + `shouldAttempt`: rembg **+1회**, 손 grasp 매칭 시 nano-banana refine **+1회**

`TEST_MODE`는 전역(`isTestMode()` → `process.env.TEST_MODE === "true"`)이라, **합성만 끄고 배경/보정은 유지**가 코드 변경 없이는 불가능합니다.  
CLI/바디 직접 조립·코드 수정은 127차 금지.

따라서:

| 시도 | Replicate | 스케일 육안 |
|------|-----------|-------------|
| 폼 + TEST_MODE 유지 | ≥2 (backdrop+enhance), 합성 스킵 | 불가 |
| 폼 + TEST_MODE 끔 | 다수 (배경·보정·합성) | 가능하나 **1회 초과** |
| 합성만 1회 (rembg) | 폼 경로와 양립 불가 | — |

승인 “유료 Replicate 호출 1회” + “실제 폼 경로” + “스케일 육안”은 **동시에 만족할 수 없습니다.**  
임의로 다수 호출을 태우지 않기 위해 **유료 호출 0회에서 중단**했습니다.

## 다음 진행에 필요한 명시 승인 (하나만)

**A.** 폼 E2E 1회(재시도 없음) — Replicate **상한 N회 / 대략 $X** 를 적어 주세요.  
예: “상한 8회 / $0.50까지, 넘으면 즉시 중단”

**B.** 다음 라운드에서 `lifestyle-composite`만 `TEST_MODE` 우회하는 **임시 1줄 게이트** 허용 후, rembg 1~2회만으로 폼 경로 검증

A 또는 B 지시가 오기 전에는 유료 호출을 시작하지 않습니다.
