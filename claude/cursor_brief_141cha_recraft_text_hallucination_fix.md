# 141차 — recraft-v3 텍스트 환각 억제 (+ 부록: 127차 로그 시크릿 git 이력 점검)

생성: 2026-09-08

## 배경

140차 A/B 스크린샷을 제가 직접 열어 확인했습니다: recraft-v3는 배지 디테일(리본·스탬프·레이어)은
확실히 flux-schnell보다 우위지만, `checklist`/`usage_steps`/`spec_table`/`stat_infographic`
5장 중 **4장에서** "no text, no letters, no watermark" 지시에도 불구하고 가짜 영문 장식 문구
(철자 오류 포함 — "PROSSINAL BADGE", "PROESSIONAL BADGEE" 등)나 의미 없는 한글/한자 글자를
그렸습니다. 140차 리포트는 이를 "경향"이라 표현했지만 실제로는 거의 매번 발생하는 수준이라,
이 문제를 먼저 억제하지 않으면 기본값 전환을 검토할 단계가 아닙니다.

## 목표

**`ICON_MODEL` 기본값은 이번에도 전환하지 않습니다.** 텍스트 환각 억제 여부만 확인합니다.

1. **프롬프트 강화 (recraft-v3 전용 분기만)**: `lib/concept-icons.ts`의
   `generateSingleConceptIcon()` 프롬프트 조합부에서 `model === "recraft-v3"`일 때만 아래 절을
   추가 (flux-schnell/seedream-3/qwen-image 프롬프트는 절대 건드리지 않음):
   ```
   no typography, no lettering, no words, no banner text, no ribbon text,
   no badge text, no engraved text, no embossed text, no fake language,
   no gibberish characters, no made-up alphabet, blank unlabeled ribbon,
   blank unlabeled banner, plain empty badge surface
   ```
   `lib/concept-illustration.ts`는 `concept-icons.ts`의 `buildIconModelInput`/프롬프트 유틸을
   공유하는 구조인지 먼저 확인하고, illustration_banner 프롬프트에도 동일하게 recraft 전용
   분기로 추가하세요 (heading/body를 프롬프트에 안 넣는 기존 원칙은 유지).

2. **style 옵션 재검토**: 140차가 저장해둔 `review/140cha-recraft-v3-style-enum.json`을 열어
   실제 enum 전체 목록을 확인하고, `digital_illustration` 외에 텍스트 유발이 적을 만한 후보
   (아이콘/뱃지 계열 style이 있다면 그것)를 1~2개 골라 소규모 비교하세요. 없다면
   `digital_illustration` 유지하고 프롬프트 강화만으로 진행.

3. **범위 제한**: 텍스트 감지 후 자동 재시도/폴백 같은 신규 로직은 이번 라운드에 넣지 않습니다
   (범위 확대 방지 — 필요하면 다음 라운드).

## 검증

- 140차와 동일한 라벨 세트(checklist/usage_steps/spec_table/stat_infographic + banner)로
  프롬프트 강화 버전 재생성 → `review/qa-screenshots/141cha-icon-model-ab-recraft-v2.png` 보드
- **육안 카운트 표**: 5장 중 가짜 텍스트/글리프가 남은 장수 (140차는 4/5) — 목표 0~1/5
- style 후보를 2개 이상 시도했다면 후보별 보드도 별도 저장
- 비용 로그: recraft 단가 $0.04 유지, 이번 라운드 총 생성 장수와 합계 명시 (다자 시도해도 대략
  $0.50~1.00 선까지는 사용자 승인 범위 — 그 이상이면 진행 전 보고)
- `tsc --noEmit` 1회
- `.env.local`의 `ICON_MODEL` 비교 전/후 원복 확인 (140차와 동일 절차)

## 하지 않는 것

- `ICON_MODEL` 기본값 전환 금지 — 텍스트 환각 0~1/5 확인 후 다음 라운드에서 결정
- flux-schnell/seedream-3/qwen-image 프롬프트·분기 변경 금지 — recraft 전용 절만 추가
- 텍스트 자동 감지·재시도 폴백 로직 신규 구현 금지 (범위 확대 방지)
- `concept-effects.ts`, 백드롭, 라이프스타일 파이프라인 변경 금지
- `section-templates.ts` 슬롯 구조 변경 금지

## 완료 체크리스트 (141차 본문)

- [ ] recraft 전용 프롬프트 절 추가 (`concept-icons.ts` + `concept-illustration.ts`, 다른 모델
      영향 없음을 diff로 확인)
- [ ] style enum 재검토 — 필요시 후보 1~2개 추가 비교
- [ ] 강화 프롬프트로 아이콘·배너 재생성 + 스크린샷 보드
- [ ] 가짜 텍스트 육안 카운트표 (140차 4/5 → 141차 결과)
- [ ] 비용 로그 + `tsc --noEmit` EXIT_CODE=0
- [ ] `.env.local` `ICON_MODEL` 원복 확인

---

## 부록 (별도 항목, 코드 변경 아님) — 127차 로그 시크릿 git 이력 점검

지난 라운드 검증 중 `review/127cha-server-err.log`에 현재 살아있는 `REPLICATE_API_TOKEN`과
동일한 값이 평문으로 11회 찍혀 있는 것을 발견했습니다. `.gitignore`에 `review/*.log`와 `.env*`가
이미 등록돼 있어 앞으로는 안전하지만, 그 규칙이 생기기 **이전에** 커밋된 적이 있는지는 git
히스토리를 봐야 압니다. 이건 141차 코드 작업과 무관하게, 짧게 확인만 해주세요:

- [ ] `git log --all --oneline -- review/127cha-server-err.log` 와
      `git log --all --oneline -- .env.local` 실행 결과를 `review/141cha-report.md` 끝에 그대로
      붙여넣기 (커밋 이력이 하나라도 나오면 즉시 알려주세요 — history purge가 필요할 수 있습니다)
- [ ] 커밋 이력이 없다면: 로컬의 `review/127cha-server-err.log` 파일 삭제
- [ ] (참고) Replicate API 토큰 자체는 사용자가 Replicate 대시보드에서 직접 로테이션하는 사안이라
      이 브리프의 구현 범위가 아닙니다 — 확인 결과만 보고해주세요.
