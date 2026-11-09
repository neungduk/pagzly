# 486차 보고 — 파일럿 공개 준비(소개·샘플·문의·검색 제외)

## 확인하지 못한 항목
- **Production/프리뷰 배포 URL**: 이 차수는 `cloud-work` 푸시만. 실제 호스트에 배포·접속 확인은 하지 않음(유료·Production 금지).
- **문의 이메일 실값**: `NEXT_PUBLIC_LABEL_CONTACT_EMAIL`을 코드에 넣지 않음. env 미설정 시 문의 영역 숨김만 검증.
- **검색엔진 noindex 실효**: layout metadata 설정. 크롤러 실측은 미실시.
- **상세페이지 run-all 전체**: label-check 회귀만 갱신·통과. 상세 코드 미변경.

## 목표 / 실측

| 목표 | 실측 |
|------|------|
| 한 줄+3줄 소개 | `INTRO_ONE_LINE_486` / `INTRO_LINES_486` 페이지 상단 |
| 샘플 결과 먼저 보기 | 정적 `sample-result-a.json`, API/업로드 없음, 가상 브랜드 배너 |
| 문의 env | 있을 때만 표시+복사. mailto·자리표시자 없음 |
| noindex | `app/label-check/layout.tsx` robots index:false. 사이트맵·내비 미추가 |
| 회귀 | 소개·JSON 스키마·문의·noindex·가로 넘침 가드 통과 |

## 프리뷰 URL 확인 방법
1. `cloud-work` 체크아웃 후 `npm run dev` (또는 팀 프리뷰 배포가 있으면 해당 호스트).
2. 브라우저에서 **`/label-check`** 만 연다(메인 내비·사이트맵에는 없음).
3. 확인할 것:
   - 상단 한 줄 설명 + 3줄 안내
   - **샘플 결과 먼저 보기** → 업로드 없이 모아리(가상) 결과 + "가상 브랜드 예시입니다"
   - env에 `NEXT_PUBLIC_LABEL_CONTACT_EMAIL`이 있으면 문의·복사, 없으면 문의 줄 없음
   - 페이지 소스/메타에 `noindex`(robots)
4. Production·main 배포는 하지 말 것.

## 변경 파일
- `review/TASK_486.md`, `486-targets.md`, `486cha-report.md`
- `lib/label-check/{types,contact,sample-result-a.json}`
- `app/label-check/{page.tsx,layout.tsx}`
- `scripts/build-label-sample-result-486.{ts,mjs}`, `scripts/regression/label-check-483.ts`

## 남은 문제
- 정식 공개 시 내비/사이트맵·noindex 해제·문의 env 설정은 사용자 결정.
- 샘플 JSON은 규칙 변경 시 `npx tsx scripts/build-label-sample-result-486.ts`로 재생성.

## Push
- branch: `cloud-work` → `origin/cloud-work` (**main 미푸시**)
- tip: `dead9a6`
- 항목: targets `a74841b` → A `f421356` → B `7eea575` → C `892b462` → D `d7b78b6` → UI wire `96962a9` → E `6736035` → F `dead9a6`
