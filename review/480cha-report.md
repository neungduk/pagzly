# 480차 보고 — 원본 실사 유료검증

## 승인 / 유료 실행
- **승인 문구 있음:** `유료 승인 2026-11-03` (C3, R2 버킷·CORS 수정 후)
- Cursor가 Preview에서 **생성 1회**(초안 → 승인 최종 1회). 재시도·「다시 생성」 없음.
- Production / main 미작업.

## 실행한 항목
| 항목 | 상태 |
|------|------|
| A 사전 점검 | 완료 (`review/480-notes.md`) |
| B verify 스크립트 | **실행** → `review/480-verify-latest.json` |
| C 유료 생성 | **완료** (결과 페이지) |
| 캡처 750/390 | **저장** `review/480-captures/result-750.png`, `result-390.png` (커밋 제외) |
| D 본 보고 | 갱신 |

## C 실행 요약
- 대상: `https://pagzly-6mlplio1a-pagzly.vercel.app/create/detail` → result `e8c1c270-dc6a-435d-a915-efab06ab6dd1`
- 카테고리: 화장품/뷰티 (미스트). 사진 **9장**(폼 최소 7·최대 10; 업로드 시 9장으로 진행).
- 입력: 상품명/브랜드/특징/성분/인증/비교·도매 등 **테스트** 가짜 값.
- 흐름: 업로드(R2 `pagzly-images` 호스트) → 초안 → 「승인하고 최종 생성」 → 결과 27섹션.

## verify-480
- 이미지 URL 접두사: **전부** `https://img.pagzly.com/` (`combined_all_prefix_ok: true`, bad 0)
- upload 행: 11 / product `image_urls`: 15 / host: `img.pagzly.com` only
- focus 배정(슬롯명 매칭): hero → index 0 (OK). 다른 focus 슬롯명은 타입명(`image_text` 등)이라 스크립트 focus 표에는 hero만 잡힘.
- 오류 필드: 없음. `generation_cost`·`photo_cost_breakdown`·`replacements`·`image_analysis` 존재.

## 실제 나간 유료 호출 (가능한 범위, C3)
브라우저 Performance + DB `generation_cost` / `photo_cost_breakdown` 기준.

| 종류 | 관측 | 비고 |
|------|------|------|
| `POST /api/generate` | 2회 (초안 ~107s, 최종 ~28s) | draft + final |
| `POST /api/generate-backdrop` | 1회 (~36s) | |
| `POST /api/section-backdrops` | 1회 (~11s) | |
| `POST /api/info-backdrops` | 1회 (~33s) | |
| R2 PUT (presigned) | 다수 성공 | host=`pagzly-images.*.r2.cloudflarestorage.com` |
| Anthropic (claude 항목) | cost ≈ **0.266** | breakdown |
| backdrop | ≈ **0.175** | |
| infoBackdrops | ≈ **0.1** | |
| enhance / effects / sectionBackdrops | ≈ 0.014 / 0.006 / 0.006 | |
| visionRolesApplied | **9** | 업로드 9장과 일치 |
| `generation_cost` 합 | **≈ 0.5675** | DB |

## 섹션별 눈 검수 (750 전체 캡처 + 결과 UI)
- **hero:** 실사 미스트 컷 선명. 하단 라벤더 영역에 「테스트 카멜리아 미스트」·훅 카피 — 사진과 겹치는 스크림은 약함, 가독성 양호.
- **points / 핵심 3축:** 아이콘·본문 대비 무난. 장식 원형과 본문 겹침 크지 않음.
- **phototext·이미지 섹션:** 손잡이·라벨 클로즈업 배정 자연스러움. 일부 섹션에서 사진 위 카피가 배경색 블록 안이라 가독성 OK.
- **bleed/풀블리드:** 라벨 확대 컷 위 후기성 카피 — 스크림 약하면 밝은 병에 글자가 약해질 여지(캡처상은 블록 분리).
- **spec / FAQ / CTA:** 표·말풍선형 FAQ 가독성 OK. CTA 가격 노출 정상.
- **이슈:** 섹션 목록/일부 제목에 **원본 타입 슬러그 노출** (`seller_trust_evi`, `ingredient_circl`, `화장품/뷰티: ingredie` 잘림). 가짜「테스트」입력이 카피에 그대로 반복(의도된 검증 입력).

## 다음 후보
1. 섹션 표시명에 raw type/slug 대신 한글 라벨만 쓰기.
2. focus 슬롯(`points`/`phototext` 등)이 verify에 잡히도록 슬롯 메타 정합.
3. Production `R2_BUCKET` 수정분은 env만 반영됨 — **Production 재배포는 별도 승인 후**.

## Git
- 브랜치: `cloud-work` (main 미push). 캡처 PNG는 커밋하지 않음.
