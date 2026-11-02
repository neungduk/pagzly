# 476차 디자인 리뷰

캡처: `review/476-captures/`(커밋 금지). 가짜 사진(ph2)·네트워크 차단. 4픽스처×8종×(750,390) **전체 길이** + 아래 구간(2600px~끝) 스트립.

체크리스트(각 1–5): 위계 / 초점 / 카드 / 여백 / 줄바꿈 / 서체대비 / 사진탈출 / 아래=위 품질 / 색 역할 / **분홍 일색 아님** / **의미 없는 장식 없음** / **잘림 없음**

## 루프 1 (캡처 직판)

기준: `strip-bottom__fx-fashion-dress-floral__750`, softlife/luxe/catalog/techsheet bottom.

| 항목 | 점수 | 메모 |
|------|------|------|
| 제목-본문 위계 | 4 | 아키타입 제목 패밀리 유지 |
| 한 화면 초점 | 3 | bottom 스트립에서 섹션 밀도는 여전 |
| 카드 남용 | 3 | highlight 변형 유지, softlife 둥근 면 잔존(의도) |
| 여백 일정 | 3 | luxe 11% 패딩 체감 |
| 줄바꿈 | 3 | 카피 불변 |
| 서체 대비 | 5 | 8종 제목 대비 유지 |
| 사진 탈출 | 4 | ph2·마스크. 실사 미검증 |
| 아래=위 품질 | 4 | BOTTOM_RECIPE로 순서 변주 확인 |
| 색 역할 | 4 | `--pz-s` 아키타입별 상이. impact/narrative 어두움 |
| 분홍 일색 아님 | 3 | softlife는 상품 파스텔(의도). catalog·techsheet info 구간에 상품 soft 분홍 잔존 |
| 의미 없는 장식 없음 | 4 | rlg=0·breather 라벨화. 원·점 잔여 일부 |
| 잘림 없음 | 4 | 마퀴 mask+first 표식. 정적 구조 통과 |

**합계 44/60.**

### 루프 1 → 2 수정
- `infoCssV5`보다 `colorRolesCssV5`를 뒤로 옮겨 `[data-info]` 면도 `--pz-s/a`로 덮음(분홍 soft 덮어쓰기).
- living catalog 135.0% 유지를 위해 E 여분 CSS 압축.

## 루프 2 (수정 반영·재캡처)

재확인: fashion strip + softlife/luxe/catalog/techsheet bottom. gallery 재생성 후 캡처.

| 항목 | 점수 | 메모 |
|------|------|------|
| 제목-본문 위계 | 4 | 동일 |
| 한 화면 초점 | 3 | 동일 |
| 카드 남용 | 3 | 동일 |
| 여백 일정 | 3 | 동일 |
| 줄바꿈 | 3 | 동일 |
| 서체 대비 | 5 | 동일 |
| 사진 탈출 | 4 | 동일 |
| 아래=위 품질 | 4 | softlife 둥근 목록 vs luxe 여백·좌측선 분리 체감↑ |
| 색 역할 | 5 | strip에서 흰/파스텔/청녹/보라/녹암 면이 갈라짐 |
| 분홍 일색 아님 | 4 | info 면 덮개 후 catalog 흰·techsheet 쿨그레이 체감. softlife만 상품 파스텔 |
| 의미 없는 장식 없음 | 4 | 사선 gradient 0. 미세 원·점은 잔여 |
| 잘림 없음 | 4 | 마퀴 페이드 유지 |

**합계 46/60.** 475 33/45 대비 항목 3개 추가·하락 없음. 잔여: softlife↔luxe는 톤은 갈렸으나 체크/표 장면 공유, catalog↔techsheet는 CSS·prefer 수준.
