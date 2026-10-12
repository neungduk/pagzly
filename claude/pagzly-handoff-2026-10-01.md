# Pagzly 인수인계 요약 (2026-10-01, 285차까지)

## 1. 프로젝트
- **Pagzly**: 상품 정보와 사진을 넣으면 한국 이커머스 **상세페이지**를 AI로 생성하는 서비스. 결과는 미리보기(라이브), 마켓 업로드용 HTML(export), PNG 다운로드로 받습니다.
- 스택: Next 16.3 (Turbopack), Tailwind 4.3.3, Supabase, Vercel, Replicate(이미지 모델). 로컬은 Windows PowerShell 5.
- 작업 폴더: `C:\Users\GIF\Desktop\pagelab\pagelab`, 브랜치 `main` → push 하면 Vercel 이 자동 배포.
- 카테고리 6개: 화장품/뷰티, 의류/패션, 식품, 전자제품, 생활용품, 반려동물.

## 2. 작업 방식 (항상 지킬 것)
- 브리프를 "N차" 라운드 단위로 받음. 커밋 메시지에 **"N차"** 를 반드시 넣음.
- **보고서**: `review/NNNcha-report.md` (한국어, 커밋 안 함). 순서는 제목 → 결과/커밋 → 수정 → 검증 → 참고/다음. 영어 로그를 인용하면 한국어 설명을 붙임.
- **스테이징은 파일을 지정해서만.** 절대 스테이징하지 않는 것:
  - `.env*` (`git add -f` 도 금지)
  - `pagzly-backlog-master-2026-09-15.md`, `claude/pagzly-backlog-master-2026-09-15.md`
  - `cursor_brief_*.md`, `review/*`, `review/qa-screenshots/167cha-canvas-clamp-demo.png`
  - `scripts/_281cha-*`, `scripts/280cha-png-download-repro.ts`
- force push, rebase, squash 금지.
- 유료 API 호출이나 새 유료 생성은 **명시적 허락 없이는 금지.** 유료 검증이 필요하면 "카테고리·횟수"만 제안합니다.
- **보안 (278차):** Supabase URL, anon 키, secret 키 값을 보고서·로그·커밋 어디에도 평문으로 남기지 않음. 필요하면 마지막 4자리만 마스킹합니다. 스크립트에서 환경변수 값을 `console.log` 하지 않음.
- `AGENTS.md`: Next 코드를 쓰기 전에 `node_modules/next/dist/docs/` 를 확인.
- 경쟁사 이름은 내부 문서에만 쓰고, Pagzly 출력이나 UI 에는 절대 쓰지 않음.
- 환각 방지 게이트를 약화하지 않음. 가짜 인물이나 전문가 프로필 금지. 3색 토큰(accent / baseNeutral / deepAccent) 유지.

## 3. 핵심 코드 위치
| 역할 | 파일 |
|---|---|
| 생성 API (최종 크레딧 차감은 응답 직전) | `app/api/generate/route.ts`, `lib/cost/completion-charge.ts` |
| 라이브 렌더러 (`TYPO` 토큰, 컨테이너 쿼리 `@container/pz`) | `components/DetailSectionRenderer.tsx` |
| export HTML (라이브와 패리티 필수) | `lib/export-detail-html.ts` |
| 디자인 토큰 (FONT_SIZE, IMAGE_RATIO, SLOT_IMAGE_RATIO, 색) | `lib/design-tokens.ts` |
| 헤드라인 폰트, `longestTokenEm`, `joinNumericSuffix` | `lib/detail-typography.ts` |
| 리듬 (POINT 교대, 60/40 칼럼) | `lib/detail-visual-rhythm.ts`, 에디토리얼 블리드는 `lib/designer-detail-patterns.ts` |
| PNG 캡처 / 분할 ZIP / 플랫폼 폭 | `lib/capture-detail-png.ts`, `lib/split-detail-download.ts`, `lib/download-platforms.ts` |
| 라이프스타일 합성 (**알고리즘 수정 금지**) | `lib/lifestyle-product-composite.ts`, `lib/photo-enhance.ts`, `lib/photo-composite.ts` |
| 무료 미리보기 검증 | `/dev/detail-preview?capture=session` (sessionStorage 키 `pagzly-dev-preview-session`), 저장 결과는 `review/279cha-live/session.json` |

## 4. 라운드 이력 (요약)
- **36~48차**: 짧은 구성 모드, 결제·구독, 크레딧 → 토큰 단위 전환, 인스타·블로그 미니 파이프라인, 경쟁사 스캔, 섹션 채팅형 편집.
- **50~137차**: 상세 에디터·캔버스, 라이프스타일 합성 파이프라인, 다이어그램, 타이포, 비교 근거형 차트, 리뷰 매칭.
- **138~180차**: 다이어그램 아이콘·실루엣, elevation/radius 토큰, 소음·IP 방수·무게·소비전력 비교, 스펙 벤토 그리드, tradeoff_card.
- **181~254차**: 상세 로직·배정 파이프라인 대규모 개선. 폰트 스케일 토큰화(182·184), 에디토리얼 블리드 10슬롯(195), illustration_banner 를 실사진 배경으로 전환(249~251).
- **255~265차**: 라이브↔export 패리티 일괄 수정, 합성 QA(그레인, 그림자 잘림 수정, 어두운 씬 림 하이라이트), certificate_evidence 섹션.
- **267~276차**: Replicate 429 재시도 누락 수정, clarity 비용 집계, 투명 컷아웃은 clarity 생략, pixel-paste 게이트 오탐 수정, Vercel 빌드 실패 수정.
- **279차**: 최종 생성 504 대응 (아이콘 병렬화, `maxDuration` 300).
- **280차**: recraft 동시성 2 + 429 백오프. PNG 캡처가 화면 밖 lazy 이미지에서 무한 대기하던 문제 수정.
- **281차**: 말줄임 제거, 음절 단위 줄바꿈 수정 (`word-break: keep-all`, `.pz-fit` 로 긴 어절만 축소, `%` 뒤 U+2060).
- **282차**: 크레딧 차감을 응답 직전으로 이동. 시간 상한 20초 전 이후엔 차감 생략.
- **283차**: 긴 PNG 도 목표 폭(860 등) 유지. 세로 상한을 넘으면 폭을 줄이지 않고 여러 장으로 나눠 ZIP. html-to-image 이중 배율 버그 수정.
- **284차**: 오늘의집 한 장 세로 상한 10,000px (공식 문서 근거). 폭은 변경하지 않음. 문서가 없는 마켓은 "확인 안 됨".
- **285차** (커밋 `1611686`, `9007cab`):
  - 경쟁 상세페이지 22개(6카테고리)를 크롤링해 측정 → `review/285cha-benchmark.md`.
  - 스펙표 한글 라벨을 13px 일반 자간으로, 섹션 라벨을 11px 로.
  - 정사각 POINT 이미지는 짝수번째만 4:5 로 교대.
  - export 이미지 비율을 슬롯 토큰(`resolveSlotImageRatio`, `imageRatioCss`)으로 통일.

## 5. 대기 중 / 다음 후보
- **250차 illustration_banner 섹션 유지 여부**: 사용자 결정 대기. 건드리지 말 것.
- **51차 배경 패턴 텍스처**: 194차에 꺼 둠 (`CATEGORY_PATTERN_ENABLED = false`).
- **다음 라운드 1순위 (무료)**: export 섹션 타이틀이 24px 라 본문 대비 1.6배로 위계가 약함 (라이브는 32→44px). 히어로 48 vs 72, CTA 가격 36 vs 48 도 같은 문제.
- `app/globals.css` 의 unlayered 규칙이 Tailwind 자간 클래스를 덮어씀 (mono 0.18em, heading -0.025em 고정).
- 라이브↔export 불일치가 남은 곳: color_variation (1:1 vs 3:4), gallery·custom_gif (풀블리드 vs 인셋).
- 좌우 지그재그가 실제로는 교대하지 않음 (AI 가 `imagePosition` 을 항상 채워서 보냄).
- 유료 검증 제안 (승인 필요):
  - 타이틀 굵기 대비 (가는 체 + 강조어): 반려·생활·전자 × 1회
  - 라이프스타일컷 가로 원본 생성: 전자·생활 × 1회
- 크롤링이 막힌 곳: 쿠팡·G마켓(봇 차단), 올리브영(상세 이미지 로드 안 됨).
