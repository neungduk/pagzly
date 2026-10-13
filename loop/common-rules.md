# 공통 규칙 (플래너와 실행기 모두 이 파일을 따른다)

## 최상위 원칙

**모든 작업의 기준은 "디자이너가 만든 수준"이다.** 코드가 규칙에 맞는지가 아니라, 결과 화면을 경쟁 상위 페이지 옆에 놓았을 때 뒤처져 보이지 않는지로 완료를 판단한다. 각 파트의 완료 조건에는 벤치마크(`review/285cha-bench`, `review/competitor-screens`)와 나란히 놓은 390·750 폭 캡처 비교가 들어간다.

## 자동 반복(루프) 전용 규칙

- 이 작업은 사람이 지켜보지 않는 자동 반복 안에서 돈다. 질문하지 말고, 규칙 안에서 가장 합리적인 해석으로 진행한다
- 작업 브랜치(`auto/loop-...`)에서만 작업하고 커밋한다. **push, merge, rebase, force push, squash, reset --hard 금지**
- `loop/` 폴더 안의 파일(스크립트, 설정, 프롬프트, 이 파일)은 읽기만 하고 수정하지 않는다. `loop/STOP`, `loop/STOPPED.txt`, `loop/DONE.txt`도 만들거나 지우지 않는다 (DONE.txt는 플래너만 쓴다)
- 범위를 벗어난 작업을 하지 않는다. 새로 발견한 격차는 고치지 말고 `review/loop-gaps.md`에 추가한다
- 시간이 모자라면 영향도 높은 파트를 먼저 끝내고, 못 끝낸 파트는 보고서에 이유와 함께 남긴다
- 막히면 즉흥으로 우회하지 말고, 현재까지의 결과로 보고서를 쓰고 끝낸다

## 작업 방식

- 커밋 메시지에 "N차"를 반드시 넣는다 (N은 이번 라운드 번호)
- 보고서는 `review/NNNcha-report.md` (한국어, 커밋 안 함). 순서는 제목 → 결과/커밋 → 수정 → 검증 → 참고/다음. 영어 로그를 인용하면 한국어 설명을 붙인다. **보고서의 맨 끝에 `scorecard.md`의 LOOP-SCORE 블록을 반드시 넣는다**
- 스테이징은 파일을 지정해서만 한다 (`git add .`, `git add -A` 금지). 절대 스테이징하지 않는 것: `.env*`(git add -f 포함), `pagzly-backlog-master-2026-09-15.md`, `claude/pagzly-backlog-master-2026-09-15.md`, `cursor_brief_*.md`, `review/*`, `review/qa-screenshots/167cha-canvas-clamp-demo.png`, `scripts/_281cha-*`, `scripts/280cha-png-download-repro.ts`, 임시 스크립트(`scripts/_NNNcha-*`), `loop/*`
- Next 코드를 쓰기 전에 `node_modules/next/dist/docs/`를 확인한다 (AGENTS.md)
- 프로젝트 스킬(`.cursor/skills/` 또는 `.cursor/rules/`)이 있으면 따른다
- 마무리 점검: `tsc --noEmit`, `eslint`, `next build`, 라이브↔export 패리티 차이 0, 하이드레이션 7경로 0

## 금지·보호

- **유료 API 호출과 새 유료 생성은 어떤 경우에도 하지 않는다.** 필요하면 "카테고리·횟수·예상 비용"만 보고서에 제안한다. 기능 플래그(`USAGE_SCENE_GENERATION_ENABLED`, `PERSON_DETECT_ENABLED`)는 false로 유지한다
- 사진합성 알고리즘 파일(`lib/lifestyle-product-composite.ts`, `lib/photo-enhance.ts`, `lib/photo-composite.ts`)은 수정 금지
- Supabase URL·anon 키·secret 키 등 비밀값은 보고서·로그·커밋에 평문으로 남기지 않는다. 환경변수 값을 console.log 하지 않는다
- 경쟁사 이름은 `review/` 안에서만 쓰고, 코드·UI·출력에는 쓰지 않는다
- 환각 방지 게이트를 약화하지 않는다. 가짜 인물·전문가 프로필, 근거 없는 수치·인증·후기를 만들지 않는다. 3색 토큰(accent / baseNeutral / deepAccent) 유지
- `illustration_banner`(250차, 사용자 결정 대기)는 건드리지 않는다
- 사람이 정해야 하는 결정(예: 인물 검출 켜기, 유료 생성 승인, 섹션 유지 여부)은 에이전트가 정하지 말고 보고서의 "사람 결정 대기" 목록에 적는다
- 라이브↔export는 항상 함께 고쳐서 패리티 차이 0을 유지한다
