# Claude Code한테 시킬 것 — 자동 반복 개선 루프

## 사전 준비 (한 번만, 손으로)

1. Playwright 설치 (Claude Code한테 시켜도 되지만, 새 패키지라 먼저 승인 필요):
   ```
   npm install -D playwright
   npx playwright install chromium
   ```

2. `scripts/test-assets/` 폴더 만들고, 테스트용 상품 사진 1~5장 넣기
   (실제 상품 사진 아무거나, jpg/png)

3. 로그인 세션 저장 (최초 1회, 브라우저 창 뜨면 직접 로그인):
   ```
   npx tsx scripts/save-login-state.ts
   ```

4. `review/CHECKLIST.md`를 열어서 **본인 취향에 맞게 직접 수정**
   (제가 만든 건 초안입니다 — "예쁘다"의 기준을 최대한 구체적으로 적어주세요)

## `.claude/settings.json`에 한 줄 추가

로컬 스크린샷 캡처 스크립트는 승인 없이 반복 실행되게 허용 목록에 추가:
```json
"Bash(npx tsx scripts/capture-detail-page.ts*)"
```
(`allow` 배열 안에 다른 항목들과 같이 넣으면 됩니다. push/db push/deploy/rm은 계속 deny 유지)

## Claude Code한테 줄 지시문

터미널에서 `claude` 실행한 뒤, 이렇게 시키세요:

```
review/CHECKLIST.md 기준으로 상세페이지 품질을 자동으로 개선해줘.

1. npx tsx scripts/capture-detail-page.ts 1 실행해서 스크린샷 생성
2. review/attempt-1.png를 직접 열어서 체크리스트 필수 항목 하나씩 통과/실패 판단
3. 실패한 항목이 있으면, 원인이 될 만한 코드
   (components/DetailSectionRenderer.tsx, app/api/generate/route.ts의
   DeepSeek 프롬프트, lib/photo-enhance.ts 등)를 찾아서 구체적으로 수정
4. npx tsx scripts/capture-detail-page.ts 2 로 다시 캡처하고 재검토
5. 최대 5번까지만 반복. 5번 안에 다 통과 못 하면 멈추고, 어떤 항목이
   계속 실패하는지 요약해서 알려줘.
6. 통과했든 못 했든, 최종적으로 git commit까지만 하고 push는 하지 마.
   나한테 시도별 스크린샷과 체크리스트 결과를 요약해서 보여줘.
```

## 주의할 점

- 이 루프는 매 시도마다 Claude Vision + DeepSeek + Replicate(Flux 3장 +
  배경제거) API를 전부 새로 호출합니다. 5번 반복하면 상품 등록 5번 하는
  것과 같은 비용이 나갑니다 (지금 원가 기준 5번 합쳐도 몇십 원 수준이라
  부담은 적지만, 무한정 늘리지 마세요).
- 셀렉터(`#productName` 등)가 실제 폼 구조와 다르면 스크립트가 바로
  실패할 수 있어요. 실패하면 Claude Code한테 "CreateProductForm.tsx
  구조에 맞게 capture-detail-page.ts 셀렉터 고쳐줘"라고 시키면 됩니다.
- 다 끝나면 **최종 결과는 반드시 사람이 직접 눈으로 확인**하세요.
  "체크리스트를 다 통과했다"는 AI 자체 판단일 뿐, 최종 승인은 아닙니다.
