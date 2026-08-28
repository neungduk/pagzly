# 상세페이지 업그레이드 로컬 검증

시각: 2026-08-28T06:40:07.702Z

**외부 AI API 호출: 없음 ($0)**

- [ ] `tsc --noEmit` 실패

```
Command failed: npx tsc --noEmit
npm warn Unknown env config "devdir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.

```

- 데이터: 내장 픽스처
- 카테고리: 화장품/뷰티
- 이미지: 4장

## 파이프라인 설정 (비용 없이 숫자만 확인)

- 스튜디오 합성 장수: 4/4
- 일상샷 생성 장수(설정): 1 (TEST_MODE면 실제 0장)
- 일상샷 품질: standard, max=2

## 렌더·후처리 검증

- [x] 섹션 수: 19
- [x] INFO(spec_table) 행 합계: 10
- [x] 신뢰 스트립 칩: 3개 (무향, 당일발송, KC 인증)
- [x] HTML export: `review\upgrade-sim\output.html` (24,710 bytes)
- [x] JSON-LD 포함: yes
- [x] SEO 텍스트 블록: yes

## Page Maker 구조 점수 (로컬 루브릭)

- **100%** (87/87)
- [x] 히어로 (w8)
- [x] 핵심 포인트 (w6)
- [x] 말풍선 강조 (w6)
- [x] 3축 하이라이트 (w6)
- [x] 스텝 카드 (w6)
- [x] INFO 고시표 (w8)
- [x] 배송·교환 (w5)
- [x] 갤러리/멀티컷 (w5)
- [x] 사용 장면 (w5)
- [x] FAQ (w4)
- [x] 주의·고시 (w4)
- [x] CTA·가격 (w6)
- [x] AI 고지 (w3)
- [x] 브랜드 스토리 (w3)
- [x] 추천 대상 (w3)
- [x] INFO 행 ≥5 (10) (w5)
- [x] 수치/비교 모듈 (w4)

> **90% 이상** — Page Maker/마켓플레이스 모듈 커버리지 목표 도달 (로컬 구조 평가).

## HTML Export 품질 점수

- **100%** (62/62)
- [x] JSON-LD (w6)
- [x] SEO 텍스트 블록 (w5)
- [x] TRUST 스트립 (w5)
- [x] 리뷰 하이라이트 export (w4)
- [x] Sticky CTA (w4)
- [x] 말풍선 callout (w4)
- [x] 갤러리 export (w4)
- [x] 일러스트 배너 export (w3)
- [x] 비교표 export (w3)
- [x] 컬러 스와치 export (w3)
- [x] 에디토리얼 풀폭 (w3)
- [x] 브랜드 스토리 (w3)
- [x] 추천 대상 (w3)
- [x] FAQ 카드형 (w4)
- [x] 배송 카드 테두리 (w3)
- [x] 750px 래퍼 (w3)
- [x] 모션 안전 CSS (w2)

### 종합 (구조+export 평균): **100%**

## 무료 반복 워크플로 (권장)

1. 코드 수정 후 `npx tsx scripts/verify-detail-upgrade.ts --tsc`
2. `npm run dev` → `/dev/detail-preview` UI 확인
3. `npx tsx scripts/qa-visual-check.ts` (저장된 session.json 스크린샷)
4. 실제 합성·일상샷 품질은 가끔 `TEST_MODE=false`로만 확인
