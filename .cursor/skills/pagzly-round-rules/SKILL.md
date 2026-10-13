---
name: pagzly-round-rules
description: Pagzly의 차수(N차) 작업 방식 — 커밋 메시지, 파일 지정 스테이징, 금지 파일, 보고서 형식, 비밀값 처리, 마무리 점검. 모든 코드 변경과 커밋·푸시 전에, 그리고 "스테이징해도 되는 파일", "보고서", "커밋 메시지"를 물을 때 사용한다.
---

# Pagzly 차수 작업 규칙

최상위 기준은 "디자이너가 만든 수준"이다. 아래 규칙은 그 기준을 매 라운드 지키기 위한 절차다.

## 라운드와 커밋

- 작업은 "N차" 라운드 단위다. 커밋 메시지에 "N차"를 반드시 넣는다.
- 커밋 메시지는 UTF-8(BOM 없음) 파일로 써서 `git commit -F`로 넣는다(PowerShell 인코딩 깨짐 방지).
- force push, rebase, squash 금지.

## 스테이징

- 파일을 지정해서만 스테이징한다. `git add .`, `git add -A` 금지.
- 절대 스테이징 금지:
  - `.env*` (`git add -f` 포함)
  - `pagzly-backlog-master-2026-09-15.md`, `claude/pagzly-backlog-master-2026-09-15.md`
  - `cursor_brief_*.md`
  - `review/*` (보고서·캡처 전부), `review/qa-screenshots/167cha-canvas-clamp-demo.png`
  - `scripts/_281cha-*`, `scripts/280cha-png-download-repro.ts`
  - 임시 스크립트 `scripts/_NNNcha-*`, `eng.traineddata`
- 커밋 전에 `git diff --cached --name-only`로 스테이징 목록을 확인한다.

## 보고서

- 경로: `review/NNNcha-report.md`. 한국어로 쓰고 커밋하지 않는다.
- 순서: 제목 → 결과/커밋 → 수정 → 검증 → 참고/다음.
- 영어 로그를 인용하면 한국어 설명을 붙인다.
- 이번에 못 한 것과 새로 찾은 개선점은 "다음 후보"에 적는다.

## 비밀값

- Supabase URL·anon 키·secret 키를 보고서·로그·커밋에 평문으로 남기지 않는다. 필요하면 마지막 4자리만 쓴다.
- 스크립트에서 환경변수 값이나 이미지 URL을 `console.log` 하지 않는다. 이미지는 번호로만 표기한다.

## Next.js

- 이 저장소의 Next는 학습 데이터와 다른 버전이다. Next 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 해당 문서를 확인한다(AGENTS.md).

## 마무리 점검

```
Task Progress:
- [ ] npx tsc --noEmit (dev 서버가 켜져 있으면 .next/dev/types가 깨질 수 있으니 서버를 끄고 다시 실행)
- [ ] npx eslint <바꾼 파일>
- [ ] npx next build
- [ ] 렌더링을 바꿨으면 live-export-parity 스킬 절차
- [ ] 파일 지정 스테이징 → 커밋 → git push origin main(승인 필요) → Vercel 배포 Ready 확인
- [ ] 임시 스크립트 삭제, 보고서 작성
```
