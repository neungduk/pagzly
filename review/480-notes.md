# 480차 A — 사전 점검 노트

대상 프리뷰: `https://pagzly-h4zrcmwnv-pagzly.vercel.app` (cloud-work, V4/UP1/V5).  
키/토큰 값은 적지 않음.

## A1. Preview 환경 변수 존재 여부

| 항목 | 결과 |
|------|------|
| `STORAGE_PROVIDER` (Preview) | **키 존재**. `vercel env pull`은 Sensitive라 값이 `[SENSITIVE]` 플레이스홀더로만 보임. 설정 시 Preview에 `r2`로 추가함. Production 키는 건드리지 않음. |
| `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL` (Preview) | **존재**. 호스트 = `img.pagzly.com` |
| `R2_PUBLIC_BASE_URL` / `R2_BUCKET` / `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Preview에 **키 존재** (Sensitive). |
| Supabase pagepick-3 | Preview `NEXT_PUBLIC_SUPABASE_URL` 호스트 = `hlxctaipxxevuakgooek.supabase.co` (프로젝트 스크립트상 pagepick-3 ref) |
| `NEXT_PUBLIC_DESIGN_V4` | Preview = `on` |
| `NEXT_PUBLIC_DESIGN_V4_UP1` | Preview = `on` |
| `NEXT_PUBLIC_DESIGN_V5` | Preview = `on` |

## A2. 생성 1회 외부 호출 표 (뷰티/미스트, 사진 N=2~4, 기본 경로)

파이프라인: 업로드 → `POST /api/generate` draft → (승인) `runPhotoEnhancementPipeline` → `POST /api/generate` final.  
이미지 업로드 대상: `STORAGE_PROVIDER=r2`이면 Cloudflare R2 (`img.pagzly.com`), 아니면 Supabase Storage. Preview는 R2 쪽으로 맞춤.

| 호출처 | 제공사 | 1회 생성당 최대 호출 수 | 자동 재시도(최대) | 이미지 업로드 대상 |
|--------|--------|-------------------------|-------------------|-------------------|
| `CreateProductForm` 업로드 | R2 (또는 Supabase Storage) | 상품 사진 **N** (+보조 입력 있으면 추가) | 없음 | R2/Storage public URL |
| `analyzeImagesWithClaude` (draft) | Anthropic Vision | **1** (이미지 일괄, ≤10장) | 역할 파싱 실패 시 roles-only **+1** | 없음 |
| `generateConceptBrief` / copy / aux | DeepSeek | draft **1~수회** (brief·카피·리뷰/기획 보조) | 카피 빈 highlight **+1**, QA 수정 **+1**; 리뷰 파싱 **+1** | 없음 |
| `analyzeReferenceImage` (참고컷 있을 때) | Anthropic Haiku | **0~1** | 없음 | 없음 |
| `runDetailPageQA` | Anthropic Haiku | **2** (이미지 QA+카피 QA), QA 재시도 시 **+2** | 카피 수정 후 QA **1회** 재실행 | 없음 |
| `/api/generate-backdrop` (기본 flux) | Replicate flux-fill-dev + DeepSeek brief + Haiku shadow | 후보 **기본 7** (env 1~10) + brief/shadow | Replicate 429: `runReplicateWithRetry` **최대 4** | backdrop-candidates → R2/Storage |
| `/api/section-backdrops` | Replicate flux-schnell | **2** (ingredient+texture) | 없음(특수) | R2/Storage |
| `/api/enhance-image` × 슬롯 | Replicate rembg/clarity + Haiku 비전 | 스튜디오 슬롯 **N**(2~4) + 뷰티 엑스트라 **0~2** | 클라 `withBackoffRetry` **maxAttempts=2**; rembg/clarity/손감지 루프 **≤3**/장; Replicate 429 **≤4** | 합성 PNG → R2/Storage |
| 장식 그래픽 (hero) | Replicate flux-schnell | **1** (재사용) | 429 **≤4** | R2/Storage |
| `/api/info-backdrops` (뷰티 스타일 기본 on) | Replicate | 존 **≤3** | 429 재전송 **≤3** | R2/Storage |
| `/api/scene-images` (뷰티 스타일 on) | Replicate | 슬롯 **≤2** | 429 **≤3** | R2/Storage |
| `/api/lifestyle-composite` (사용자 라이프스타일+키 있을 때) | rembg/clarity + Haiku grasp | 컷아웃 **≤3** + grasp **≤3** | grasp `GRASP_VISION_MAX_ATTEMPTS=3` | composite PNG |
| `/api/generate-lifestyle-shots` (옵션·N≥3·키 입력) | ImageRouter→Replicate kontext + Haiku occupancy + composite | 샷 **1**(N=3~4 기본) + empty-scene 재생성 **+1** | occupancy **1~2**/샷; router fallback retry **≤1** | scene/px PNG |
| final: `applyCosmeticsAnnotatedSections` | Anthropic Haiku | 섹션 **≤2** | 없음 | 없음 |
| final: `applyConceptOverlaysToProductImages` | Replicate flux-schnell | FX **≤2** | 일시 오류 delayed retry **1** | fx PNG |
| final: `generateConceptIcons` | Replicate (아이콘/라벨 수) | 라벨당 **1** | `ICON_RETRY_MAX_ATTEMPTS=3` (+ optional schnell); 업로드 dataURL **2** | icons → R2/Storage |
| final: `makeComparisonPair` | 로컬 sharp | 유료 API 0 | — | compare PNG ×2 |
| 크레딧/제품 persist | Supabase DB | 수회 읽기·쓰기 | — | 메타만 |

`/api/canvas-ai-image`, `/api/generate-social`은 이 자동 생성 경로에 포함되지 않음.

## A3. 사진 장수×1을 넘는 경로 (코드 수정 없음, 보고만)

역할 태깅 자체는 **N×1이 아님** — `analyzeImagesWithClaude`가 N장을 **1회 배치** (+roles-only 최대 1).

**초과 경로:**

1. **enhance rembg 품질 루프** — `lib/photo-enhance.ts` `enhanceProductImage`: 장당 preCrop/rembg/clarity/hand Haiku **≤3회** + 초기 text-region Haiku.
2. **뷰티 enhance 엑스트라** — `lib/photo-pipeline-client.ts`: 섹션 백드롭 있으면 enhance HTTP **N+2**.
3. **클라 backoff** — 같은 파일 `withBackoffRetry` **maxAttempts=2** (backdrop·enhance).
4. **기본 backdrop 후보 7** — N과 무관 (`BACKDROP_CANDIDATES` 기본 7).
5. **section-backdrops +2**, **info ≤3**, **scene ≤2**.
6. **라이프스타일 grasp/컷아웃** — `lib/lifestyle-product-composite.ts` grasp ≤3, cutout ≤3.
7. **AI lifestyle empty-scene** — `lib/generate-lifestyle-shots.ts` occupancy Haiku 1~2 + 재생성.
8. **draft QA** — 이미지 묶음 Haiku 1(+재시도 시 추가), N 분리 호출은 아님.
9. **final 주석 ≤2 Haiku**, **FX ≤2**, **아이콘×라벨 수**.

스튜디오 합성 슬롯 수만 보면 N∈[2,4]에서 **=N**; 초과 분은 재시도·뷰티 엑스트라·다단계 rembg/비전·고정 백드롭/씬 호출에서 발생.
