# 160차 — 커밋/푸시 + 인포그래픽·이미지 "디자이너급" 업그레이드 보고

생성: 2026-09-10  
대상: Claude 데스크톱 공유용 (`cursor_brief_160cha` 후속)

## 요약

| 항목 | 결과 |
|------|------|
| A 커밋·푸시 | **완료** — `origin/main` HEAD `8e9c22de3f5488d1a946e6d02d235e2e9f7c05a0` (+160 구현 커밋 별도) |
| B 인포 강화 | Noise/IP/각주/성분각주 **프리뷰·export 검증 완료**. `/api/generate` 실라이브는 **auth-state 만료로 차단** |
| C 이미지 레버 | 144 수치 재인용 + 코드 대조. **추가 기본값 플립 없음** |
| D 벤치마크 | 4축 비교·격차 분류 정리. 입력 기근 회피 시나리오 스크립트 준비 |

---

## A. 커밋 & 푸시

사전 상태: `main`이 `dccf361`에 있었고 156~159 관련 워킹 트리가 **전부 미커밋**.

### 1차 푸시 (156~159 + 의존 배선)

| 해시 | 메시지 |
|------|--------|
| `7ed6fb4` | fix: 생성 파이프라인 재시도/폴백 강화 + 프리미엄 모드 배선 (156·145) |
| `1d0f904` | fix: package_contents 카테고리 확장, image_text 비율·CTA 클립패스 (156~157) |
| `8e9c22d` | feat: 소음(dB) 비교 인포그래픽 추가 + stat_infographic 각주 중복 수정 (158~159) |

- `npx tsc --noEmit` → **0**
- `git push origin main` → `dccf361..8e9c22d`
- 원격 HEAD: **`8e9c22de3f5488d1a946e6d02d235e2e9f7c05a0`**

포함 파일 예: `NoiseComparisonDiagram`, `noise-comparison-diagram.ts`, `DetailSectionRenderer`, `export-detail-html`, `premium-mode.ts`, `concept-icons`/`illustration`, `section-templates`, `package-contents-diagram`, `detail-visual-rhythm`, `design-tokens` 등.

### 2차 (160 본 라운드 구현)

아래 “B 구현” 커밋 해시 참고 (푸시 시점에 갱신).

---

## B. 인포그래픽 강화

### B-1. 소음(dB) + 방수(IP) — 렌더러/export 검증

**구현·검증 경로:** `/dev/detail-preview?capture=160-noise-ip`  
(실라이브 `/api/generate`는 세션 만료로 미완 — 아래 B-6)

| 확인 | 결과 |
|------|------|
| `소음 비교` 다이어그램 | ✅ aria/스크린샷 (`160cha-waterproof-section.png`) — 20dB·24dB·30dB |
| `방수 등급 비교` 다이어그램 | ✅ IPX4·IPX5·IPX7 사다리 + 제품 IPX5 |
| export SVG 스니펫 | ✅ `review/160cha-export/noise-ip-export-snippet.html` + `160cha-noise-ip-export.png` |
| 라이브↔export 동기화 | ✅ `DetailSectionRenderer` + `export-detail-html` 동시 배선 |

### B-2. stat_infographic 각주 중복 수정 (159)

캡처 `160-footnote-dedupe` / beauty 캡처 a11y:

- 동일 `sourceNote` 3개 metric → **각주 1만**
- 다른 출처 1개 → **각주 2**
- 하단 목록: `1. 한국화학융합시험연구원…` / `2. 피부임상연구센터…`

단위 테스트도 `footnote-dedupe.json`에 unique=2 확인.

### B-3. comparison_chart 카테고리 갭 — 원인 구분

| 카테고리 | 슬롯 | 원인 분류 |
|----------|------|-----------|
| 화장품/뷰티, 식품/건강기능식품, 전자제품 | 있음 (`required:false`) | 입력 부족 시 omit 가능 (**입력**). beauty+`ingredients`면 채움 유도 |
| 의류/패션, 반려동물, 생활용품/기타 | **슬롯 없음** | **템플릿 정책 갭** (로직 버그 아님) |

가드: `baselineLabel` 화이트리스트만, 경쟁사 실명 금지 (`comparison-chart-guard.ts`).

**실라이브 생성으로 “풍부 입력인데도 스킵?” 재확인은 auth 갱신 후 161에서**  
스크립트: `scripts/160cha-live-generate.ts beauty|food|electronics` (입력 기근 회피용 풍부 텍스트 포함).

### B-4. 기준표 패턴 일반화

| 후보 | 결정 | 사유 |
|------|------|------|
| **IP/IPX 방수** | **구현** | IEC 60529 공개 사다리 + 전자 스펙에 흔함. `lib/waterproof-ip-diagram.ts` + `WaterproofIpDiagram.tsx` |
| SPF | 보류 | 연속 dB와 달리 카테고리형(15/30/50/50+). 뷰티는 이미 용량(mL) 다이어그램 있음 |
| 온도(℃) | 보류 | 판매자 스펙용 안정적 공개 기준표가 약함 |

### B-5. ingredient_highlight 컴플라이언스 각주

- `INGREDIENT_HIGHLIGHT_COMPLIANCE_NOTE` = `*본 내용은 원료적 특성에 한하며, 개인차가 있을 수 있습니다.`
- 화장품 카테고리 + `ingredient_highlight` 슬롯에만 고정 표시 (수치 날조 아님)
- 라이브·export 동기화
- 캡처: `160-ingredient-note` a11y에 문구 확인

### B-6. `/api/generate` 실라이브 차단

- `scripts/160cha-live-generate.ts electronics` 실행 → `/create`가 **로그인 리다이렉트** (`select` 타임아웃)
- 원인: `scripts/auth-state.json` **세션 만료**
- 재개: `npx tsx scripts/save-login-state.ts` 후 동일 스크립트 재실행
- **입력 기근 함정은 스크립트 설계로 회피** (성분·인증·임상·소음/IP 행을 명시적으로 넣음)

---

## C. 이미지 파이프라인 (144 재검토 · 기본값 미변경)

**160에서 144 env 레버를 추가로 뒤집지 않음.** 수치는 `review/144cha-report.md` 재인용.

| 레버 | 144 실측 | 권고(제안만) |
|------|----------|--------------|
| BRIA 후보 2→4 | 2=$0.08 / 4=$0.16. 자동 pick 없음 | 기본 2 유지. 4는 픽커 UX 후 |
| Studio 4→8 | +$0.087 | 프리미엄 뒤에만 (155 `premium-mode`로 이미 ≥8장→8) |
| Lifestyle standard/premium | $0.04 vs $0.104 | premium은 유료 티어 |
| effect 1→3 | $0.003 vs $0.009 (live max 2) | 전 카테고리 확대 보류 |
| ICON_MODEL 전역 | 스펙 다수 시 원가 폭증 | 전역 플립 금지 |

### 라이프스타일 합성 실사용성

- 판매자 손잡이/착용샷 업로드 비율 낮음 + `productHeightCm` + grasp safeguard
- 127/144: `composited=false` / `missing-product-height-cm` 흔함
- 분류: **입력·게이트 병목** 우선 (품질 취향은 통과 케이스에서만)

### 히어로 합성 vs 디자이너

- Pagzly: sharp 컷아웃 + AI 배경
- 갭: 그림자 방향·색온도 (**취향/품질**, 버그 단정 금지)
- 실제품 픽셀 보존 원칙 유지

### 아이콘 실패율

- 156: 3회 재시도 후 `flux-schnell` 폴백 로그 문자열 존재
- 148 미조사 항목 — **20~30건 라이브 집계는 auth 만료로 pending**
- 과거 로그(140/143): 429 throttle이 주된 실패 모드

---

## D. 디자이너급 4축 비교

방법론: 레이아웃 / 타이포·여백 / 이미지 합성 / 정보 위계.  
격차 = **버그 | 취향 | 입력** 만 분류.

### 비교 세트 (최소 3)

1. **Pagzly 인포(소음·IP)** `160cha-waterproof-section.png` vs **Behance 선스크린 라벨** `160cha-behance-sunscreen-ref.png`  
   - 정보 위계: Pagzly는 공개 기준표+실측값 패턴으로 디자이너 인포와 방향 일치  
   - 취향: Behance는 패키지 아트 중심, Pagzly는 스펙 설득 중심
2. **Pagzly 각주 dedupe** (a11y·캡처) vs 프리미엄 브랜드 “수치+각주” 관행  
   - **버그 수정 검증** (동일 출처 번호 번호)
3. **Pagzly 139 멀티카테고리 프리뷰** (`139cha-*-preview.png`) vs Bodywise/스킨케어 PDP 베스트프랙티스 (문헌)  
   - 레이아웃·타이포는 카테고리 리듬 토큰으로 근접  
   - 히어로 합성 자연스러움은 여전히 **취향 갭**

입력 기근: 라이브 스크립트에 풍부 텍스트 포함. 프리뷰 캡처는 픽스처에 임상/스펙을 직접 심어 검증.

---

## 161차 후보

1. `save-login-state` 후 `160cha-live-generate` electronics/food/beauty 3건 + comparison_chart 실측
2. 아이콘 실패율 20~30건 로그 집계 (schnell 폴백 발동률)
3. BRIA 4 — 픽커 UX 후 기본값 승인 라운드
4. 히어로 그림자/색온도 A/B (취향 후보)
5. 라이프스타일 높이·grasp UX 개선
6. Fashion/pet/home에 comparison_chart 슬롯 **정책 결정**
7. SPF 다이어그램 재검토 (카테고리형 UI)

## 의도적 보류

| 항목 | 사유 |
|------|------|
| 144 env 추가 플립 | 105/144 원칙 |
| anti-hallucination 완화 | 가드레일 |
| 가짜 전문가 | 159 거부 |
| 무지개 차트 / 경쟁사 실명 | 가드레일 |
| SPF·온도 구현 | 사다리 부적합/부족 — IP만 구현 |
| AI 인물 생성 라이프스타일 | 64/81 원칙 |

## 산출물 경로

- 스크린샷: `review/qa-screenshots/160cha-*.png`
- export: `review/160cha-export/`
- 스크립트: `scripts/160cha-capture-verify.ts`, `scripts/160cha-live-generate.ts`
- 코드: `lib/waterproof-ip-diagram.ts`, `components/WaterproofIpDiagram.tsx`
