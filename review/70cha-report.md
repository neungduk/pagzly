# 70차 완료 보고 — 사진 기반 AI 자동입력

생성: 2026-09-02

---

## 변경 파일

| 파일 | 작업 | 내용 |
|------|------|------|
| `lib/autofill-photo-vision.ts` | A | 폼 전용 Haiku Vision (2~4장, max_tokens 450) — **신규** |
| `lib/autofill-vision-pick.ts` | A | 대표 사진 인덱스 선택 (클라이언트 안전) — **신규** |
| `lib/autofill-draft.ts` | A | Vision 결과 → `## 사진에서 확인된 특징` DeepSeek 주입 |
| `app/api/autofill-draft/route.ts` | A | `imageUrls` 수신, `visionCost`/`visionImageCount` 응답 |
| `components/CreateProductForm.tsx` | A/B | 사진 URL 전달·안내 문구·힌트 |
| `scripts/capture-70cha-autofill.ts` | 검증 | 자동입력 before/after 캡처 — **신규** |
| `scripts/70cha-minimal-input-qa.ts` | C | 사진+제목+가격만 실제 생성 1회 — **신규** |

**건드리지 않음:** `analyzeImagesWithClaude()` (정식 생성 Vision), 성분/인증 자동입력

---

## tsc 결과

```bash
npx tsc --noEmit
```

| 결과 | 비고 |
|------|------|
| **70차 변경 파일: 에러 0건** | 통과 |
| 기존 무관 에러 1건 | `review/pixabay-cosmetics-test/crawl-pixabay.mts` |

---

## 작업 A — 폼 단계 Vision 자동입력

| 항목 | 결과 |
|------|------|
| Vision 분리 | ✅ `analyzePhotosForAutofillDraft()` — Haiku, 2~4장 |
| 정식 생성 Vision | ✅ `analyzeImagesWithClaude()` 미변경 |
| 사진 근거 주입 | ✅ DeepSeek 프롬프트 `## 사진에서 확인된 특징` |
| 성분/인증 | ✅ 자동입력 대상 제외 (클릭 후에도 빈 값 유지) |
| OCR/성분표 읽기 | ✅ 프롬프트 금지 |

### 실제 클릭 테스트 (Pexels 4장 + 자동입력)

| 항목 | 값 |
|------|-----|
| Vision 장수 | **4** |
| Vision 비용 | **$0.007759** |
| DeepSeek 비용 | ~$0.000266 |
| 합계 | **$0.008025** |

**keyFeatures 초안 (발췌):**  
「베이지 톤의 크림 제형… 흰색 용기와 골드 액센트의 미니멀한 패키징… 화장솜과 스패출러… 플랫레이」  
→ 상품명만으로는 알기 어려운 **사진 기반 묘사**가 반영됨.

---

## 작업 B — 폼 안내 문구

| 항목 | 결과 |
|------|------|
| `data-testid="photo-minimal-input-hint"` | ✅ |
| 문구 | 「사진과 상품명만으로도 AI가 상세페이지를 생성합니다…」 |
| 자동입력 힌트 | 「업로드한 사진도 함께 분석합니다」 (사진 있을 때) |

---

## 작업 C — 사진+제목만 실제 생성

| 입력 | 값 |
|------|-----|
| 상품명 | 시카 리페어 수딩 크림 |
| 카테고리 | 화장품/뷰티 |
| 가격 | ₩32,900 |
| 사진 | Pexels 8장 |
| 비운 필드 | keyFeatures, targetCustomer, ingredients, certifications, brand |

| 결과 | |
|------|--|
| draft → final | ✅ 완료 (~8분) |
| 스크린샷 | `70cha-minimal-input-final.png` (3.83MB) |

### 솔직한 품질 평가

**잘 된 점**
- 섹션 헤딩이 추상적 형용사만 나열하지 않고 구체적 테마를 갖음: 「달아오른 피부, 시카 진정」「쿨링 진정」「데일리 케어」
- 최소 입력만으로도 draft→final 파이프라인이 끊기지 않고 완성 페이지까지 도달
- 정식 생성 시 `analyzeImagesWithClaude()`가 사진을 보고 카피를 쓰므로, 폼을 비워도 **최종 본문은 사진 근거가 들어감** (기존 기능 확인)

**한계**
- 상품명에 「시카」가 들어 있어 진정/시카 카피가 이름에서도 유입됨 — 사진만의 순수 검증은 아님
- 타겟·성분·인증을 비웠기 때문에 INFO 고시표·성분 섹션은 일반적/플레이스홀더 성향이 남을 수 있음 (의도된 트레이드오프)
- 폼 자동입력 없이 바로 생성한 케이스이므로, **입력 단계 체감**은 작업 A(자동입력 버튼)와 별개로 평가해야 함

**종합:** 최소 입력으로도 **판매 가능 수준의 상세페이지 골격**은 나옴. Hookable 대비 「폼 단계에서 사진을 보고 채워주는」 체감은 70차 A로 개선됨.

---

## 검증 체크리스트

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` 관련 에러 0건 | ✅ |
| 폼 Vision 2~4장, 정식 분석과 분리 | ✅ |
| 자동입력 → 사진 근거 keyFeatures | ✅ |
| 성분/인증 미변경 | ✅ |
| 폼 안내 문구 노출 | ✅ |
| 작업 C 최소 입력 생성 + 육안 평가 | ✅ |
| 비용 기록 | ✅ 아래 |

---

## 스크린샷

| 파일 | 바이트 |
|------|-------:|
| `70cha-autofill-before.png` | 111,281 |
| `70cha-autofill-after.png` | 101,220 |
| `70cha-minimal-input-final.png` | 3,827,454 |

---

## 비용

| 구분 | 비용(근사) |
|------|-----------|
| 폼 자동입력 Vision (Haiku 4장) | **$0.007759** |
| 폼 자동입력 DeepSeek | **$0.000266** |
| 작업 C final 생성 (Replicate+Claude 등) | 서버 로그 미캡처 — 통상 화장품 final **~$0.18–0.22** 수준 (67차 크림 참고) |

QA 토큰: `grant_credits` 100,000 (`qa_topup_70cha`) → 잔액 249,700

---

## 비고

- `pickAutofillVisionIndices`는 클라이언트 번들 안전을 위해 `autofill-vision-pick.ts`로 분리 (sharp/Anthropic 미포함).
- 로컬 이미지는 자동입력 시 대표 2~4장만 Supabase에 업로드 후 Vision 호출.
