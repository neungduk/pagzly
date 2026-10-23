# next build 시도 (445차 2)

- 명령(환경값은 명령 앞 인라인, 의미 없는 더미만): `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 NEXT_TELEMETRY_DISABLED=1 npx next build`
- 결과: **성공**(종료 코드 0), 소요 36초 — Next.js 16.4.2(Turbopack). 컴파일 14.3초, 타입 검사 17.5초(Next 내장 TypeScript 단계도 통과), 정적 페이지 51개 생성 1.0초.
- 경고 1건(기존): `"middleware" file convention is deprecated. Please use "proxy" instead.` — 코드 문제 아님(규약 이름 변경 안내). 이번 차수 범위 밖이라 손대지 않음.
- 환경값 문제/코드 문제: 둘 다 없음. 더미 값으로 빌드 시점에 필요한 환경값은 충족됐다(빌드 중 외부 호출 없음).
- 산출물 `.next`는 gitignore 대상이며 커밋하지 않았다.
- 운영 빌드 `next start -p 3101`(같은 더미 값)로 확인: `/dev/detail-preview` → **404**, `/dev/generating-overlay` → **404**, `/login` → 200. 개발 전용 경로가 운영 빌드에서 열리지 않는다(취약점 없음).
- 미확인(PC): 실제 키가 있는 `next start` 실행·로그인·결제·AI 경로.
