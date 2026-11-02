# 474차 보고서 — "그림판" 탈출(타이포·사진·여백)

## 실제 사진으로 확인하지 못한 항목 (R2 이전 후 검증)

- 풀블리드 스크림 위 실사진 대비(4.5:1) — 가짜 SVG·단색 그라데이션만 사용
- 확대 크롭·마스크의 제품 질감/초점 — ph2 일러스트로는 한계
- 걸침(hang)·콜라주 그림자의 실사진 깊이감
- atmosphere-warm/cool/sage SVG가 실제 상품 컷을 대체할 때의 설득력
- export HTML에 임베드되지 않는 `/fonts/*.css` 서브셋의 실기기 로드·FOUT

---

측정: 말뭉치×8 아키타입, V5 켜짐. Playwright 캡처(네트워크 차단, `--ph2 --localize-blocked`). **main push 없음** — `cloud-work`만.

| # | 목표 | 실측 | 결과 |
|---|------|------|------|
| A1 | 제목 서체 ≥5종 | 7종(gowun-batang/dodum, noto-sans/serif, black-han, do-hyeon, jua) | 달성 |
| A2 | 본문 ≥15px·lh≥1.6 | TYPE_PAIR 전부 충족 | 달성 |
| A3 | 문단 폭 24~34ch | measureCh + max-width | 달성 |
| B1 | 사진 구도 5종 | bleed/hang/crop/mask/collage `data-pz-pc` | 달성 |
| B2 | 사진 실패 폴백 | noPhotoCssV5 유지 | 달성 |
| B3 | ph2 분위기 SVG 3 | atmosphere-warm/cool/sage | 달성 |
| C1 | 간격 스케일 | SPACE_SCALE_V5 + snap | 달성 |
| C2 | 정렬선 | `--pz-align` | 달성 |
| C3 | 화면당 카드 ≤2 | glance grid2 면 제거·luxe rows(리뷰 27/35) | 부분 |
| D1 | 미세 장식 | double-rule·tape-tab + decorAlt | 달성 |
| E1 | 리뷰 ≥2루프 | 24→27/35 | 달성 |
| F1 | export ≤140% | worst **140.0%** catalog/fx-living-storage | 달성 |
| F2 | 463~473·V4 off | regression-v5-474·check-v4-off 통과 | 달성 |
| F3 | 실패 4건 | muted 대비·export 픽셀·DB SQL·무거운 도구 | **미착수** |

## 리뷰 루프

- 루프1 24/35 — 카드 남용·mid 초점 약
- 루프2 27/35 — catalog glance를 선 목록으로 완화
- 상세: `review/474-review.md`

## 아직 비슷해 보이는 쌍

- softlife ↔ luxe (파스텔·여백 공기감, 서체는 다름)
- catalog ↔ techsheet (정보형 그리드·도현 vs 노토 굵기)

## 미달과 이유

- C3 카드 밀도: mid 본문(스토리/체크) 큰 카드는 남음. 카피·구조 불변 제약 + export 140% 직전
- 실제 사진 효과: 규칙상 미검증(상단 목록)

## 변경 파일(요지)

- `lib/type-system-v5.ts`, `scripts/build-v5-fonts.mjs`, `docs/fonts-license-474.md`
- `lib/photo-compose-v5.ts`, `public/qa-fixtures/ph2/atmosphere-*.svg`
- `lib/spacing-v5.ts`, `lib/detail-deco-v5.ts`, `lib/hero-stack-v5.ts`, `lib/v5-parts.ts`, `lib/page-archetype-v5.ts`, …
- 회귀: `type-474`·`photo-474`·`spacing-474`·`detail-474`·`regression-v5-474.ts`

## 켜는 법

```bash
NEXT_PUBLIC_DESIGN_V5=1 NEXT_PUBLIC_DESIGN_UP1=1
# 폰트 서브셋
node scripts/build-detail-fonts.mjs && node scripts/build-v5-fonts.mjs
# 갤러리·캡처
npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial
npx tsx scripts/_474-capture.ts
npx tsx scripts/regression-v5-474.ts
```

## 다음 후보

- 본문 체크/스토리 카드 → 구분선·큰 글자 치환으로 C3 완성
- R2 실사진으로 스크림·크롭·마스크 재검증
- softlife↔luxe mid 시그니처 추가 분화

## Push

```
branch: cloud-work (main 아님)
tip: 38493e5
```

| 항목 | 해시 |
|------|------|
| A | `5a10996` |
| B | `fb21852` |
| C | `bdbf1e8` |
| D | `1cb98e5` |
| E | `07336a5` |
| F | `30182a6` |
