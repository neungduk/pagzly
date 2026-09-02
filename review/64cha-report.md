# 64차 완료 보고 — 인물/라이프스타일 사진 + 제품 합성

생성: 2026-09-02

---

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/lifestyle-product-composite.ts` | rembg 컷아웃 + nano-banana 합성, 실패 시 원본 폴백 (신규) |
| `app/api/lifestyle-composite/route.ts` | POST API, TEST_MODE 시 $0 원본 반환 (신규) |
| `components/CreateProductForm.tsx` | "인물/라이프스타일 사진 (선택)" 업로드 필드 |
| `lib/types/generate.ts` | `lifestyleImageUrl`, `PhotoCostBreakdown.lifestyleComposite` |
| `lib/photo-pipeline-client.ts` | enhance 후 `/api/lifestyle-composite` 호출 |
| `app/create/draft/page.tsx` | draft payload → pipeline `lifestyleImageUrl` 전달 |
| `scripts/64cha-lifestyle-composite-qa.ts` | 유료 합성 QA 스크립트 (신규) |

**QA 중 수정:** Replicate 클라이언트에 `useFileOutput: false` 추가 + 429 throttle 재시도 (`photo-enhance.ts`와 동일 패턴) — FileOutput 객체로 컷아웃 URL 파싱 실패하던 버그 수정.

**미변경:** `buildBriaBackdropPrompt()` "no person" 원칙(라이프스타일 미업로드 시), `referenceImage`(색상/무드 전용)

---

## `npx tsc --noEmit`

64차 관련 **에러 0건**.

---

## 검증 체크리스트

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` 에러 0건 (관련) | ✅ |
| 업로드 UI 노출/미리보기 | ✅ (`CreateProductForm` lifestyle 필드) |
| lifestyle 미업로드 시 기존 파이프라인 동일 | ✅ (조건 분기) |
| 합성 API 실제 호출 2회 | ✅ |
| API 실패/타임아웃 시 원본 폴백 | ✅ (코드 + 1차 QA에서 cutout 실패 시 폴백 확인) |

---

## 스크린샷 (입력 vs 합성)

| 파일 | 바이트 |
|------|-------:|
| `64cha-composite-hands-compare.png` | 737,569 |
| `64cha-composite-cosmetics-compare.png` | 546,159 |
| `64cha-composite-hands-output.png` | 1,218,223 |
| `64cha-composite-cosmetics-output.png` | 1,037,398 |

---

## 호출 모델 / 비용 / 횟수

| 모델 | 횟수 | 단가(근사) | 합계 |
|------|------|-----------|------|
| `851-labs/background-remover` | 2 | $0.00047 | ~$0.0009 |
| `google/nano-banana` | 2 | $0.039 | ~$0.078 |
| **합계** | **2회 합성** | | **$0.0789** |

---

## 육안 품질 평가 (솔직)

### 케이스 1 — 손/셀프케어 (`self-care-6886590`)
- **잘 된 부분:** 원본 손·조명·배경 유지, 제품이 손에 자연스럽게 쥐어짐, 얼굴 클로즈업 없음(브리프 권장 구도).
- **어색한 부분:** 제품 라벨이 원본과 다른 디자인으로 재해석됨(브랜드 정확도 이슈). 손가락·용기 경계에 미세한 합성 티 가능.

### 케이스 2 — 화장품 플랫레이 (`cosmetics-5475900`)
- **잘 된 부분:** 손+제품 사용 장면으로 전환, 조명 톤 대체로 일치.
- **어색한 부분:** 원본 무인물 flatlay를 손 장면으로 크게 바꿔 **구도 일관성**이 떨어짐. 배경 소품(화이트 병)과 새 손/제품의 스케일·원근이 다소 어색. flatlay 입력보다 **손 위주 라이프스타일 원본**이 더 적합해 보임.

**종합:** 후커블 수준의 "실제 모델이 제품을 쓰는" 느낌에 근접하는 경우도 있으나, 입력 사진 유형에 민감하고 제품 라벨 보존은 불완전. **손/팔 위주 실사 라이프스타일 업로드**를 권장.

---

## 비고

- AI 가짜 인물 생성은 범위 외 — 사용자 업로드 실사만 합성.
- `lifestyleImageUrl` 흐름: `CreateProductForm` payload → draft session → `draft/page.tsx` → `photo-pipeline-client`.
