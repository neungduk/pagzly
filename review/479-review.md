# 479차 눈 검수

캡처: `review/479-captures/` (gitignore, 커밋 금지). 네트워크 차단 Playwright fullPage.
- pass1: `p1-{fx}-{arch}-{750|390}.png` × 64
- pass2: `p2-…` × 64 (동일 조건 재촬영)

## 전후 표 (검사기 short 4×8×750, 장식 제외)

| 구간 | 실패 수 | 비고 |
|---|---|---|
| 478차 자체(키보드 어두운 3종 중심) | ~72 | 면/글자 쌍 전 |
| 479 착수 직후 short | ~58→40→27→6 | 칩·bleed·스펙 순 축소 |
| 479 B 완료 | **0** | 알약/STEP/bleed/줌/스트립 |
| 479 C 극단 팔레트 4×8 | **0** (714s ≤720s) | 히어로 E rgba 재매핑 수정 포함 |

## 눈으로 본 소감 (2회)

### pass1
- **impact 키보드**: POINT·스펙·가격 스트립이 어두운 면에서도 밝은 글/불투명 칩으로 읽힘. 히어로·스트립 대비 안정.
- **pop 스킨케어**: POINT 알약·체크 칩이 자기 배경 기준으로 선명. 사진 위 DETAIL 칩+스크림 제목 가독.
- **softlife/luxe**: 사진 블록 상자(mask) 제거·점/링 장식 off 후 사진이 면 밖으로 더 읽힘. 용량 SVG는 종이 섬 위 검정 라벨.

### pass2
- pass1과 동일 렌더(네트워크 차단·로컬 갤러리). 알약/라벨/번호 가독 회귀 없음. 390폭에서도 STEP·해시태그 칩 유지.

## 477 잔여
- phototext 사진 지배(band/scrim): `chromeLabelRow(..., { noMark: true })`로 점/링 끔.
- softlife·luxe `PHOTO_COMPOSE_V5` → `bleed`(mask 상자 제거).
