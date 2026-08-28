# 디자이너·AI 상세페이지 학습 노트 (2026-08-28)

자동·수동 리서치 종합. Pagzly 개선 근거 문서.

## 1. AI 경쟁사에서 배운 것

### 후커블 (Hookable 2.0)
- **워크플로**: 제품 정보 30초 입력 → 텍스트 기획안 검토 → 생성 (5~10분) → 캔버스 편집
- **차별점**: 채팅 에이전트(섹션 추가·카피·이미지·GIF), 플랫폼별 **분할 ZIP** 다운로드, GIF 자동 생성
- **Pagzly 대응**: 분할 ZIP (`lib/split-detail-download.ts`), patch 탭 부분 편집, 판매자 GIF 삽입

### GENCY
- **패션 특화**: 착장/디테일/코디 컷 자동 분류·배치
- **Pagzly 대응**: `image-roles.ts` 업로드 가이드 + `assign-section-images.ts` 패션 역할 prefer

### 크리에이지 (Creazy)
- **차별점**: Figma 연동, 채팅 편집, GIF
- **Pagzly**: 단기 비목표(Figma). patch 탭으로 카피·섹션 부분 수정

### 알잘AI
- **포지션**: “전문 업체 노하우” 기획→이미지→디자인 5분
- **Pagzly 강점**: 식약처/식품 컴플라이언스, 실제 리뷰 하이라이트(가짜 후기 비목표)

---

## 2. 쇼핑몰·디자이너 상세에서 배운 것

### 이미지 순서 (LaonGEN, 실무 가이드)
1. **멈춤** — 히어로 한 장으로 “이 상품이 뭔지”
2. **의심 해소** — 소재·디테일·스펙
3. **사이즈·실측** — 반품 방지
4. **연출·코디** — “입은 나” 상상
5. **패키지·고시·CTA**

### 2026 모바일 CRO (SellPage, CodeCam)
- 가로 **860px** 기준, 본문 **24pt+**, 제목 **36pt+**, 한 줄 **15자 내**
- **줄간격 1.8**이 가독성 핵심 (글자 크기만 키우지 말 것)
- 스크롤 **8~12구간** — 너무 길면 이탈
- **풀폭 사진 + 짧은 텍스트** 교차가 DTC·패션 표준

### 디자이너 vs AI 템플릿 차이 (Pagzly 갭)
| 디자이너 | 기존 AI 템플릿 느낌 | Pagzly 개선 |
|----------|---------------------|-------------|
| 풀블리드 사진 | 카드+패널 반복 | `shouldUseEditorialBleed` 슬롯 |
| 타이포 리듬 큼 | 섹션 제목 동일 스케일 | sectionTitle 2rem→2.75rem |
| 컷 역할 분명 | 같은 사진 반복 | 역할 태그 + prefer 배정 |
| 마켓 분할 업로드 | 한 장 PNG | 분할 ZIP + 4채널 너비 |

---

## 3. 코드 매핑

| 학습 내용 | 구현 |
|-----------|------|
| 디자이너 스토리 아크 프롬프트 | `lib/designer-detail-patterns.ts` → `buildDesignerPatternGuide` |
| 사용 장면 풀폭 레이아웃 | `EDITORIAL_BLEED_SLOTS` + renderer/export |
| 패션 착장/디테일/코디 | `assign-section-images.ts` + `image-roles.ts` |
| HTML export 동기화 | `export-detail-html.ts` (comparison_table, color_variation, illustration_banner, gallery 3:4) |
| 후커블식 분할 다운로드 | `split-detail-download.ts` + 결과 페이지 |
| 줄간격·타이포 | `detail-typography.ts`, `DetailSectionRenderer` TYPO |

---

## 4. 잔여 로드맵

1. **채팅형 에이전트** — patch 탭 → 자연어 섹션/카피/이미지 (후커블 2.0 수준)
2. **섹션 캔버스 드래그** — Figma/미리캔버스급 (대규모)
3. **인터랙티브 스와치** — HTML export script 정책 검증 후
4. **페이지 길이 자동 압축** — short 모드 + AI 요약으로 8~12구간 맞추기

---

## 5. 재실행

```bash
npx tsx scripts/competitor-gap-scan.ts
npx tsx scripts/verify-detail-upgrade.ts --tsc
```
