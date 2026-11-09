# 489차 — 상세페이지 생성 기능 숨김·비활성화 (이름은 Pagzly 유지, 안에 검수 서비스만 노출)

## 0. 규칙
- 유료 호출·Production·main 금지. **코드를 삭제하지 말 것**(기능 플래그로 끄기만). 상세페이지 렌더/export 로직·기존 회귀는 그대로 통과해야 한다.
- 목표는 `review/489-targets.md`에 코드 전에 기재. 파일은 Read 후에만 Write/Edit. 마무리 전 `npx tsc --noEmit`, `npm run build` 통과 필수.
- 결정(사용자): 브랜드 이름은 **Pagzly 그대로**. 서비스는 "화장품 표시사항 PDF 검수" 하나만 보이게. 상세페이지 자동 생성 버튼은 **비활성화하고 화면에서 가린다**.

## 1. 항목
### A. 기능 플래그
- `lib/feature-flags.ts`: `DETAIL_PAGE_ENABLED` (env `NEXT_PUBLIC_DETAIL_PAGE_ENABLED`, **기본 꺼짐**: 값이 `"1"`일 때만 켜짐). 서버·클라이언트 공용 헬퍼 1개로 통일(문자열 비교 흩뿌리지 말 것). 켜면 지금과 동일하게 동작해야 한다(개발용 복원 경로).

### B. 화면에서 가리기 (플래그 꺼짐일 때)
- 랜딩(`app/page.tsx`)의 상세페이지 생성 CTA·요금제·기능 소개·쇼케이스·비교표·FAQ 중 **상세페이지 생성을 홍보하는 부분 전체**를 숨기고, 첫 화면은 검수 서비스 소개(한 줄 설명 + "PDF 검수 시작" 버튼 → `/label-check`)로 대체. 새 카피는 `/label-check` 소개 문구 범위(한 줄+3줄)만 재사용하고 길게 쓰지 말 것.
- 내비게이션·헤더·푸터·히스토리 사이드바·온보딩에서 상세페이지 생성 진입점(예: "상세페이지 만들기", `/create`, 생성 내역) 링크/버튼 제거.
- `/create`, `/onboarding`(상세페이지 전용인 경우) 직접 접근 시 `/label-check`로 리다이렉트(서버에서). 로그인/회원가입/약관 페이지는 유지하되 상세페이지 관련 문구가 있으면 숨김(문구 교체는 최소).
- `sitemap.ts`: 상세페이지 관련 URL 제외, `/label-check`는 아직 제외 유지(noindex 유지, 사용자가 공개 시점 결정). `opengraph-image`·`layout` 메타의 "AI 상세페이지 생성" 문구는 플래그 꺼짐일 때 "Pagzly · 화장품 표시사항 PDF 검수"로.

### C. 서버에서 막기 (비용 보호가 핵심)
- 유료 AI 호출이 일어나는 생성 계열 API를 플래그 꺼짐일 때 **호출 전에** 즉시 404/503 JSON(`{ "error": "서비스가 일시 중단되었습니다" }`)으로 거절: `generate`, `generate-backdrop`, `generate-lifestyle-shots`, `generate-social`, `enhance-image`, `canvas-ai-image`, `lifestyle-composite`, `patch-page`, `patch-section`, `scene-images`, `section-backdrops`, `info-backdrops`, `autofill-draft`, `protect-product-images`, `image-jobs`, `products`, `generations`, `support-chat` 및 이와 같은 성격의 라우트(목록은 `app/api/*`를 직접 훑어 `review/489-notes.md`에 표로 기록: 라우트 / 외부 유료 호출 여부 / 처리).
- 예외(막지 말 것): `label-check`, `auth`, 로그인·약관·개인정보 관련, `proxy-image`/`storage`는 상세페이지 전용이면 막고 아니면 유지(근거를 notes에 기록). `cron`은 상세페이지 관련 작업이 있으면 플래그 꺼짐일 때 no-op, 아니면 유지(근거 기록).
- 거절 응답은 키·내부 경로·스택 노출 0. 거절 시 외부 API 호출 0회가 되도록 **가드가 라우트 최상단**에 있어야 한다.

### D. 회귀
- `scripts/regression/feature-flag-489.ts`(run-all 등록): ① 플래그 꺼짐: 위 목록의 각 API가 외부 호출 전 거절(모의/스텁으로 확인), 랜딩 HTML에 상세페이지 생성 CTA 문구 없음("상세페이지" 홍보 문구·`/create` 링크 0), `/create` 리다이렉트, `/label-check`·로그인 정상 ② 플래그 켜짐(`1`): 기존 동작과 동일(링크 존재, API 가드 통과). ③ label-check 회귀 변화 없음, 기존 상세 회귀 실패 목록 변화 없음, 가로 넘침 0(320/390/750).

## 2. 마무리
- `review/489cha-report.md`: 맨 위에 "확인하지 못한 항목", 목표/실측, API 처리표 요약, 켜는 법(복원: env 1개), 변경 파일, 남은 문제. `git log -1`/`git status`로 push 확인 후 커밋 해시 기재. push 후 Vercel 프리뷰 확인은 기획 담당이 한다. **main 병합·Production 배포는 사용자가 결정**(이번 차수에서 하지 않음).
