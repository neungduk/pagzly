# 482차 보고

## 실제 생성으로 다시 확인하지 못한 항목
- 유료 재생성·Production 배포 없음 → **실서버에서 e8c1c270 페이지를 새 HTML로 렌더한 픽셀 캡처**는 없음(`review/482-captures/` 미커밋·미생성).
- DB에 저장된 theme은 여전히 `#20547E`(구추출). 프리뷰가 DB theme만 쓰면 팔레트 A는 픽스처·신규 추출·재배포 후 **테마 재계산 경로**에서만 완전 반영. 키비주얼·블록 단순화·어두운 면은 같은 결과 섹션만으로도 V5 켜짐 시 보임.
- 8종×(750,390) 전체 길이 스크린샷 수작업 2회는 export 메트릭·회귀로 대체(캡처 커밋 금지).
- 이전 run-all 실패 4건: **미착수**.

## 목표 / 실측

| 목표 | 실측 |
|------|------|
| 주조 hue ≈ 노랑 | live-481 CDN 재추출 accent `#AA933F` hue≈47°; 픽스처 theme 갱신, `themeDb481`에 구값 보존 |
| 면·포인트 hue ±25° | `colorRolesV5(..., palette)` + `palette-482` 회귀 통과 |
| 키비주얼 hero+summary | export `data-pz-kv482` true; V5 off false |
| 블록 크롬 ≤2.5/≤4 | `block-simple-482` 통과; 밑줄 88% 아래 |
| 어두운 면 정확히 1 | export `data-pz-darkband-482` count=1 |
| V5 off 바이트 경로 | kv/dark/roles 잔존 0 (회귀) |

## 변경 파일 (요지)
- `lib/color-extract.ts`, `lib/palette-from-product-482.ts`, `lib/color-roles-v5.ts`
- `lib/keyvisual-482.ts`, `lib/block-simple-482.ts`, `lib/dark-band-482.ts`
- `lib/export-detail-html.ts`, `components/DetailSectionRenderer.tsx`
- `lib/impact-templates.ts`, `lib/v5-parts.ts`, `lib/type-treatments.ts`
- `scripts/fixtures/live-481.json`, `scripts/regression/{palette,keyvisual,block-simple}-482.ts`, `run-all.ts`
- `review/TASK_482.md`, `482-targets.md`, `482-notes.md`, `482-review.md`

## 켜는 법
- 기존과 동일: Design V5 / UP1 켜짐(`designV5On`). V5 off면 482 마크업·팔레트 클램프 미적용.

## 같은 결과(e8c1c270) 확인 방법
1. `cloud-work` 프리뷰 재배포(이 브랜치).
2. 결과 URL에서 해당 product 열기(유료 재생성 금지).
3. 확인: (1) 히어로/요약에 키비주얼 무대·말풍선 (2) 페이지 중간 어두운 큰 문장 1구간 (3) 포인트 블록에서 영문 라벨·장식 감소·밑줄 겹침 없음.
4. 주조색이 여전히 하늘색이면 DB theme이 구값 — 픽스처 export 또는 톤 추출 경로로 교차확인(`themeDb481` vs 재추출 `#AA933F`).

## Push
- branch: `cloud-work` → `origin/cloud-work` (main 미푸시)
- HEAD: `86a02c9` (`docs(482): record final push hash`) — `origin/cloud-work` 동기화 확인

## 남은 문제
- DB theme 재기록 없이는 라이브 같은 결과의 accent가 청회색으로 남을 수 있음(읽기 전용 제약).
- 알파 컷아웃 CDN 미보관 → 키비주얼은 제품 단독컷(role/whiteBg) 판별로 동작.
- 전체 갤러리 픽셀 캡처·이전 실패 4건 미착수.
