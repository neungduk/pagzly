# 199차 — 198차 QA 스크립트 불필요한 코드 제거 (API 0)

생성: 2026-09-16

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 이번
라운드는 프로덕션 코드(`components/`, `lib/`)는 전혀 건드리지 않고, **198차가 만든 QA
스크립트 한 파일의 죽은 코드만** 정리합니다.

## 배경 — 195~198차 최종 확인 완료

198차 보고서와 스크린샷을 직접 열어 6개 카테고리(뷰티/전자/생활/펫/식품/패션) 전부
실사진 기준으로 재확인했습니다 — 에디토리얼 풀블리드 스크림이 사진 색과 부딪히지 않고,
body 텍스트도 정상적으로 아래에 남아 있습니다. **195~198차(에디토리얼 풀블리드 대형
타이포 오버레이 + 스크림 색 버그 수정)는 이번에 완료로 확정하고 백로그 마스터에 반영했습니다.**
이 라운드는 그 뒷정리만 합니다.

`scripts/198cha-reshoot-with-local-assets.ts`를 코드 대조하다가 **불필요한 중복
코드**를 발견했습니다 — 216~275행의 에디토리얼 루프 안에서:

```ts
const nw = await waitImg(page, `section.pagzly-editorial >> nth=${i}`);
// waitImg with >> nth may not work — evaluate on el directly
const nw2 = await el.evaluate(async (sec) => { /* ... 동일 로직 반복 ... */ });
```

`waitImg()` 헬퍼(162~185행)를 호출해 `nw`를 구해놓고, 바로 다음 줄 주석("waitImg with
`>> nth`는 안 될 수도 있음 — el에서 직접 evaluate")에서 **똑같은 이미지 로딩 대기 로직을
`el.evaluate(...)`로 통째로 다시 작성**했습니다(250~265행). `nw`는 실패 시 디버그 로그
(`"nw1", nw`)에만 쓰이고 실제 판정(`nw2 < 1`)에는 전혀 쓰이지 않습니다 — 즉 `waitImg()`
호출과 그 결과값은 사실상 죽은 코드입니다.

## 작업

`scripts/198cha-reshoot-with-local-assets.ts`에서:

1. 216~275행 루프 안의 `const nw = await waitImg(...)` 줄과 그 다음 주석 줄을 삭제하고,
   `console.error` 디버그 로그에서 `"nw1", nw` 부분도 제거하세요(참조할 값이 없어지므로).
2. `waitImg()` 헬퍼 함수 자체(162~185행)가 이제 이 파일 어디서도 안 쓰이면 함수 정의도
   통째로 삭제하세요 — `grep -n "waitImg" scripts/198cha-reshoot-with-local-assets.ts`로
   호출부가 0곳인지 먼저 확인 후 지우세요.
3. `el.evaluate(...)`로 다시 구현한 이미지 로딩 대기 로직(250~265행, 317~332행 배너
   루프에도 거의 동일한 복사본이 있음)은 **기능은 그대로 두고**, 원한다면 공용 헬퍼 하나로
   합쳐도 되지만 필수는 아닙니다 — 이번 라운드의 목적은 "안 쓰이는 코드 삭제"이지 리팩터링
   확장이 아니니, 시간이 빠듯하면 2번까지만 하고 3번은 생략해도 됩니다.

## 검증

1. `npx tsc --noEmit` — 0(스크립트 파일 포함).
2. `npx tsx scripts/198cha-reshoot-with-local-assets.ts` 재실행 — 198차와 동일하게
   6개 에디토리얼 + 2개 배너 스크린샷이 전부 `naturalWidth ≥ 1`로 성공하는지 확인(정리
   과정에서 실수로 로직을 망가뜨리지 않았는지 재확인 목적 — 새 스크린샷을 덮어써도 무방).
3. `grep -n "waitImg" scripts/198cha-reshoot-with-local-assets.ts` — 삭제했다면 0건.

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- `components/`, `lib/` 프로덕션 코드는 미수정 — 195~198차가 만든
  `getEditorialBleedScrim`/`getAspectVideoBleedScrim`/`EDITORIAL_BLEED_OVERLAY_CLASS`는
  이미 6카테고리 실사진으로 확정됐으므로 재작업 없음(백로그 마스터 §5 확인).
- `scripts/test-assets/_181cha-live/` 로컬 이미지 자산은 삭제하지 않음 — Supabase
  스토리지가 쿼터 초과(402)로 당분간 계속 막혀 있을 수 있어, 앞으로의 QA 라운드에서도
  이 로컬 자산이 유일하게 신뢰할 수 있는 실사진 소스입니다.
- `review/198cha-export/*.html` 임시 렌더링 산출물도 굳이 지우지 않음(다음 라운드
  재사용 가능, 용량 문제 되면 그때 별도 정리).

## 완료 보고 형식 (짧게)

2~3줄 요약 + `grep waitImg` 결과 + diff.

## 백로그 마스터

195~198차는 이번에 제가 직접 백로그 마스터(`claude/pagzly-backlog-master-2026-09-15.md`)
§1/§5에 반영해 완료로 확정했습니다. 199차(이번 라운드)는 사소한 코드 정리라 별도 §1 항목
추가 없이 다음 갱신 때 한 줄로만 기록하겠습니다.

## ⚠️ 참고 — Cursor가 고칠 수 없는 별도 이슈

198차 진단으로 **Supabase 프로젝트 스토리지가 쿼터 초과(402)** 상태인 것이 확인됐습니다.
이건 코드 버그가 아니라 Supabase 대시보드에서 플랜 업그레이드나 파일 정리가 필요한
운영 이슈입니다 — 이번 라운드 범위 밖이니 손대지 마시고, 사용자님께 별도로 안내드리겠습니다.
