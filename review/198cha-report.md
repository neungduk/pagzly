# 198차 — QA 이미지 미로딩 진단 + 실사진 재검증

생성: 2026-09-16 · API **0**

## A. 원인

**Supabase Storage 402** — `exceed_storage_size_quota`.  
`session.imageUrls` 전부 GET 시 JSON: *"Service for this project is restricted… exceed_storage_size_quota"*.  
만료(presigned)가 아니라 **프로젝트 스토리지 쿼터 초과로 public object 전체 차단**.  
195/196은 CDN이 아직 살아 있을 때 찍혀 사진이 보였고, 197은 같은 export 방식이지만 원격이 이미 402라 깨진 아이콘만 보인 것.

**대체:** `session.imageCacheKey` → `scripts/test-assets/_181cha-live/*.jpeg` 로컬 자산.  
정적 `http://127.0.0.1` 서버로 HTML+이미지 서빙 후 스크린샷. **naturalWidth≥1 강제** (실패 시 exit 1).

배너 추가: export가 `illustrationUrl`(원격 402)을 `imageUrls[0]`보다 우선 → 로컬 URL로 덮어씀.

## B. 실사진 재검증 (전부 naturalWidth OK · 육안: 상단 톤 브랜드 오염 없음)

스크림 정지점/불투명도 **미조정** (오염 재현 없음).

| 샷 | nw | 육안 |
|----|---:|------|
| `198cha-editorial-food-serving_suggestion.png` | 867 | 상단 선명, 중립 하단 스크림 |
| `198cha-editorial-fashion-coordination.png` | 867 | OK |
| `198cha-editorial-fashion-seasonal_styling.png` | 883 | OK |
| `198cha-editorial-beauty-customer_scenario.png` | 731 | OK |
| `198cha-editorial-electronics-usage_scenario.png` | 731 | OK |
| `198cha-editorial-electronics-install_scenario.png` | 731 | OK |
| `198cha-editorial-living-usage_scenario.png` | 867 | OK |
| `198cha-editorial-pet-usage_scenario.png` | 867 | OK |
| `198cha-banner-food.png` | 867 | 사진 보임 · 197 “이상없음” 유지 |
| `198cha-banner-electronics.png` | 838 | 동일 |

툴링: `scripts/198cha-reshoot-with-local-assets.ts`  
제품 스크림 코드 diff: **없음**. `tsc` 0. 이미지 생성 API **0**.

백로그 마스터는 Cursor 미갱신.
