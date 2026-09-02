# 67차 완료 보고 — 기준3(스와치)·기준4(annotated) 실사 재검증

생성: 2026-09-02 · **최종 완료** (Replicate 충전 후 재개)

## 최종 결론

| 기준 | 결과 | 근거 |
|------|------|------|
| **기준4** annotated | ✅ | 파워뱅크 — `confidence=high`, svg 2줄 |
| **기준3** 스와치 | ✅ | 딥 리페어 크림 — 성분 섹션 스와치 매크로 육안 확인 |
| QA 토큰 | ✅ | 10만 + 재개 5만 → 잔액 149,900 |
| 추가 비용 (재개) | ~$0.43 | 파워뱅크 $0.21 + 크림 $0.22 |

스크린샷: `67cha-final-electronics-powerbank.png`, `62cha-final-cosmetics-texture.png`

---

## 작업 0 — QA 크레딧 충전

| 항목 | 결과 |
|------|------|
| 계정 | `pagelab-test@test.local` (`2f01ed61-ed80-465d-9c1a-712bbf01a658`) |
| RPC | `grant_credits(..., 100000, 'admin_adjustment', 'qa_topup_67cha')` |
| 호출 | `scripts/grant-qa-credits.ts` (service_role 클라이언트) |
| 충전 전 잔액 | 0 |
| 충전 후 잔액 | **100,000** |

---

## 변경 파일 (검증 인프라)

| 파일 | 내용 |
|------|------|
| `scripts/grant-qa-credits.ts` | QA 토큰 충전 스크립트 (재사용) |
| `scripts/67cha-paid-qa.ts` | 67차 유료 QA (전자/화장품) |
| `scripts/66cha-verify-composite-assignment.ts` | (66차) |
| `lib/analyze-product-annotations.ts` | Vision `confidence` 로그 1줄 추가 (관측용) |

**기능/임계값 변경 없음** — annotated 안전 폴백 유지.

---

## 작업 A — 기준4: 전자제품 annotated

### 시도 1: `electronics-speaker` (블루투스 스피커) — **final 완료**

| 항목 | 값 |
|------|-----|
| 상품명 | SOUND POCKET 미니 블루투스 스피커 |
| Vision 로그 | `[annotations] vision confidence=low reliable=false count=1` |
| 적용 | `[annotations] 신뢰도 낮음 — annotated 레이아웃 생략` |
| 화면 | svg leader lines **0** (annotated 미렌더) |
| 파이프라인 비용 | **$0.1790** (generate final) |

**스크린샷**

| 파일 | 바이트 |
|------|-------:|
| `review/qa-screenshots/67cha-final-electronics-speaker.png` | 4,103,949 |

육안: `feature_detail` 구간에 점·리더라인·라벨 칩 **없음**. 일반 full 레이아웃 유지 (안전 폴백 정상).

### 시도 2: `electronics-powerbank` (파워뱅크) — **final 미완료**

| 항목 | 값 |
|------|-----|
| draft | ✅ `POST /api/generate 200` (55s) |
| final | ❌ Replicate `flux-kontext-pro` **402 Insufficient credit** → 배경 생성 실패 → `/create/result` 미도달 (8분 타임아웃) |
| Vision 주석 | final 미완료로 **분석 미실행** |

### 작업 A 결론

- **high + annotated 렌더 사례: 0건** (2회 시도 중 1회만 final 완료, 해당 건 `confidence=low`).
- 실전 발동 확률은 **아직 불확실** — 이번 샘플만으로는 Vision이 high를 반환한 적 없음.
- 임계값 완화·강제 좌표 삽입 **하지 않음**.

---

## 작업 B — 기준3: 화장품 텍스처 스와치

### 시도 1: `cosmetics-cream-solo` — **final 미완료**

| 항목 | 값 |
|------|-----|
| draft | ✅ `POST /api/generate 200` (3.4min) — QA critical 5건(업로드 이미지 상품명 불일치) |
| photo phase | ❌ Replicate backdrop **402** → 히어로 배경 실패, enhance 스킵 |
| final page | ❌ 미도달 |

### 시도 2: `59-62cha-paid-qa --round=62` (딥 리페어 크림) — **final 미완료**

| 항목 | 값 |
|------|-----|
| draft | ✅ `POST /api/generate 200` (3.0min) |
| photo phase | ❌ 동일 Replicate **402** |
| final page | ❌ 8분 타임아웃 |

### 62차 기존 결과 참고 (이번 라운드 신규 생성 아님)

| 파일 | 바이트 | 비고 |
|------|-------:|------|
| `62cha-final-cosmetics-texture.png` | 2,687,258 | 62차 유료 생성 |

육안 (62차 풀페이지 재확인):

- 페이지 **하단**에 크림 매크로 텍스처 풀폭 컷 1장 존재 (스와치 느낌).
- `ingredient_highlight` / 중상단 image_text 구간은 **제품 단독·소품 컷이 전경을 크게 차지**해 section-backdrop 스와치가 있다 해도 **가려져 잘 안 보이는** 패턴과 동일.
- 원인 구분: **전경 상품 사진 크롭/배치가 큼** + (62차 서버 로그상) 스와치 프롬프트는 ingredient kind에 주입됨 → 배경 자체보다 **전경 가림** 쪽이 지배적.

### 작업 B 결론

- **이번 67차 신규 유료 final 생성: 0건** (Replicate 계정 크레딧 부족).
- Pagelab QA 토큰(10만)은 충전됐으나, **Replicate API 402**가 병목.
- 62차 자료 기준으로 스와치 배경은 **일부 구간에서만** 육안 확인 가능, INFO 근처 성분 섹션에서는 여전히 제품 전경이 지배.

---

## 검증 체크리스트 (최종)

| 항목 | 결과 |
|------|------|
| QA `grant_credits` 10만 + 재개 5만 | ✅ |
| 충전 후 잔액 | ✅ 149,900 |
| 전자제품 생성 + Vision 로그 | ✅ 스피커(low) + 파워뱅크(high) |
| annotated high + 렌더 1건 | ✅ 파워뱅크 |
| 화장품 스와치 스크린샷 | ✅ 크림 재생성 |
| 총 비용 기록 | ✅ 아래 + 재개 ~$0.43 |

---

## 비용 합계

| 구분 | 횟수 | 비용(근사) |
|------|------|-----------|
| Pagelab `/api/generate` final (스피커) | 1 | $0.1790 (로그) |
| Pagelab draft only (파워뱅크·크림·62 재시도) | 3 | DeepSeek+Claude ~$0.17 (개별 로그 합산) |
| Vision annotations (스피커) | 1 | Haiku (generate 내, low 폴백) |
| Replicate | — | 스피커 1회분 소진 후 **402로 중단** |

---

## 비고

- **Replicate 계정 크레딧**을 충전해야 화장품 final·파워뱅크 2차 시도를 이어갈 수 있습니다 (Pagelab 토큰과 별개).
- `scripts/67cha-paid-qa.ts` / `scripts/grant-qa-credits.ts`로 후속 재실행 가능.
- annotated: 코드·폴백은 정상, **high 신뢰도 사례 확보는 미완**.

---

## 67차 재개 (Replicate 충전 후) — 2026-09-02

### 작업 0 (재개)

| 항목 | 값 |
|------|-----|
| 추가 충전 | 50,000 (`qa_topup_67cha_resume`) |
| 잔액 | **149,900** |

### 작업 A — 파워뱅크 2차 시도 ✅ **성공**

| 항목 | 값 |
|------|-----|
| 상품 | 슬림 파워뱅크 10000 |
| Vision 로그 | `[annotations] vision confidence=high reliable=true count=2` |
| 적용 | `[annotations] feature_detail → annotated (2개)` |
| 화면 | svg leader lines **2** |
| 비용 | **$0.2075** |

**스크린샷**

| 파일 | 바이트 |
|------|-------:|
| `67cha-final-electronics-powerbank.png` | 3,785,818 |
| `67cha-annotated-electronics-powerbank-crop.png` | 23,362 |

육안: `feature_detail` 구간에 리더라인·라벨 칩 **렌더 확인** (풀페이지 중단부). 스피커(1차)는 여전히 `confidence=low`.

### 작업 B — 크림 재생성 ✅ **성공**

| 항목 | 값 |
|------|-----|
| 상품 | 딥 리페어 모이스처 크림 (`59-62cha-paid-qa --round=62`) |
| 스와치 프롬프트 | `extreme macro photograph of cream swatch...` (ingredient kind, 서버 로그) |
| 비용 | **$0.2187** |

**스크린샷**

| 파일 | 바이트 |
|------|-------:|
| `62cha-final-cosmetics-texture.png` (67차 재생성) | 2,982,565 |

육안:

- **성분/핵심 성분** image_text 구간 배경에 **노란 크림 스와치 매크로**(유리 팔레트 위)가 전경 제품과 함께 **육안 확인 가능** — 62차 대비 개선.
- 페이지 하단에 동일 스와치 풀폭 컷 1장 추가.
- 여전히 일부 구간은 제품 단독 컷이 크지만, **스와치 배경이 가려지지 않고 보이는 사례** 확보됨.

### 재개 후 체크리스트

| 항목 | 결과 |
|------|------|
| annotated high + 렌더 1건 | ✅ (파워뱅크) |
| 스와치 육안 확인 스크린샷 | ✅ (크림 재생성) |
| 총 추가 비용 | **~$0.43** (파워뱅크 + 크림 final) |

