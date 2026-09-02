# 52차 — 51차 Tier 2 재캡처 (테스트 토큰 충전 후, 실제 화면 검증)

생성: 2026-09-01

## 배경

51차 완료 보고에서 화장품/패션/식품/전자제품 4개 카테고리가 "✅ 성공"으로 표시되고
스크린샷 파일명도 올라왔지만, 제가 4개 파일을 직접 열어서 확인한 결과 **4개 전부
완전히 동일한 파일(md5 해시까지 동일)**이었고, 내용도 실제 생성된 상세페이지가
아니라 **hooks 순서 에러로 인한 Next.js 크래시 화면**이었습니다. 즉 hooks 버그를
고치기 *전에* 찍힌 에러 스크린샷이 재캡처 없이 그대로 보고서에 4번 복사돼서
"성공"으로 올라간 것으로 보입니다.

다만 코드 자체는 직접 확인했고 문제없습니다:
- `result/page.tsx`의 hooks 순서 버그 수정은 진짜입니다 (`useMemo` → 일반 함수 호출로
  변경되어 있고, `computePreviewCollapseEnd`에는 hook이 없어 early return 뒤에 와도
  안전합니다).
- T1-A~F도 `DetailSectionRenderer.tsx`/`export-detail-html.ts`/`design-tokens.ts`/
  `backdrop-prompt-templates.ts`/`generate/route.ts`에 실제로 올바르게 연결되어
  있는 것까지 확인했습니다 (단순히 정적 검증 스크립트가 찾는 문자열만 있는 게 아니라
  실제 렌더링 분기·props 전달까지 확인함).

그러니 이번엔 코드를 다시 고칠 필요 없이, **진짜 화면 캡처만 다시 받으면** 됩니다.
반려동물 카테고리는 `402 insufficient_credits`로 아예 실행조차 못 됐다고 하셨죠 —
이건 QA 테스트 계정의 Pagzly 내부 토큰 잔액 문제이지 외부 AI API 비용 문제가
아니므로, 아래 순서대로 진행해주세요.

## 작업 순서

### 1. QA 테스트 계정 토큰 충전 (실제 결제 아님, 내부 잔액만 조정)

`scripts/auth-state.json`에 저장된 로그인 세션이 사용하는 테스트 계정의
`user_credits.balance`를 Supabase SQL 에디터(service role 권한)에서 직접
`grant_credits` RPC로 최소 500 이상으로 올려주세요.

```sql
select public.grant_credits(
  '<해당 테스트 계정의 user_id>',
  500,
  'qa_topup_52cha',
  null
);
```

`user_id`는 `auth-state.json`이 로그인해둔 계정의 `auth.users`에서 이메일로
조회해서 찾으면 됩니다. 실제 카드 결제나 Toss 플로우를 태울 필요 전혀 없습니다 —
이건 QA 전용 내부 잔액 조정입니다.

### 2. 5개 카테고리 전부 재캡처

```bash
npx tsx scripts/51cha-final-qa.ts --force
npx tsx scripts/51cha-final-qa.ts --only=pet
```

(스크립트가 `--force`로 전체 재실행, `--only=pet`으로 반려동물만 실행하는 옵션을
지원하는지 확인 후, 지원 형태에 맞게 5개 카테고리 모두 다시 돌려주세요. 카테고리당
정확히 1회씩, 총 5회로 제한합니다 — 51차 브리프와 동일한 원칙 유지.)

### 3. 저장 전 육안 확인 (가장 중요)

스크린샷을 `review/qa-screenshots/51cha-final-{category}.png`에 덮어쓰기 전에,
**각 스크린샷이 실제 상세페이지 화면인지, Next.js 에러 오버레이("Console Error",
"React has detected a change in the order of Hooks...")가 아닌지 캡처 스크립트
안에서든 직접 열어서든 확인**해주세요. 에러 화면이 또 저장되는 일이 없어야 합니다.

### 4. 보고 시 포함

- 5개 카테고리 스크린샷 각각의 파일 크기(byte 단위) — 서로 달라야 정상입니다
  (51차처럼 전부 동일한 크기면 뭔가 잘못된 것).
- 각 스크린샷에서 T1-A(브랜드 타이틀 카드, brandName 입력한 경우)/T1-B(POINT.n 배지+
  키워드 타이포)/T1-C(배경 패턴 텍스처)/T1-F(인증 마크 강조)가 실제로 눈에 보이는지
  카테고리별로 체크.
- 49차/50차에서 고친 색상·배경(특히 패션 카테고리 미니멀 배경)이 여전히 정상인지.

## 하지 않는 것

- Tier 1 코드를 다시 건드리는 것 — 이미 검증 완료된 상태이므로 이번 라운드는 순수
  재캡처입니다.
- 카테고리당 2회 이상 재실행 (총 5회 제한 유지).
- 실제 결제/구독 플로우를 통한 토큰 충전 (SQL로 직접 처리, 위 1번 참고).

## 완료 보고 형식

기존과 동일 — 이번엔 스크린샷 5장의 실제 파일 크기와 육안 확인 결과(에러 화면이
아님을 확인했다는 문장 포함)를 반드시 넣어주세요.
