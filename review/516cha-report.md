# 516차 보고서 — 법령 변경 감시 + 법령 확인 기준일

## 확인하지 못한 항목
- 법제처 `lawService.do` 본문(MST) 응답 구조 — 조문 단위 해시(§5) 미구현(응답 미확인·시간 부족)
- 식약처 「화장품 표시·광고 관리 지침」의 admrul DB 등재 여부(감시 불가 목록으로 분리)
- 마이그레이션 실적용·크론 실호출·LAW_OC 라이브 검증(지시: 네트워크·키 사용 금지, SQL 적용은 사용자)

## 적용 요약
- `lib/law-watch`: OC 없으면 `no_oc`, Referer/Origin 고정, 타임아웃·재시도, 단건/다건 정규화, 정확 일치 필터
- 감시 목록 `review/data/law-watch-516.json` (law/eflaw 3종 + admrul 고시) + 지침 감시 불가
- 스냅샷/이벤트 SQL(RLS·정책 없음), 변경 판정 `changed`/`upcoming`/`missing`, 크론 `0 2 * * *`
- 화면: `법령 확인 기준일: YYYY-MM-DD · 화장품법·시행령·시행규칙` (전체 항목 확인·7일 이내만)
- 규칙 JSON 자동 수정 없음. 알림은 이벤트 행 + `console.warn`

## 규칙 근거 → 감시 항목 대응

| 규칙 근거 | 감시 |
|---|---|
| 화장품법 | `law:` / `eflaw:화장품법` |
| 화장품법 시행령 | `law:` / `eflaw:화장품법 시행령` |
| 화장품법 시행규칙 | `law:` / `eflaw:화장품법 시행규칙` |
| 주의사항·알레르기 고시 | `admrul:…주의사항 및 알레르기…` |
| 표시·광고 실증 규정 | `admrul:화장품 표시·광고 실증에 관한 규정` |
| 기능성화장품 기준 및 시험방법 | `admrul:기능성화장품 기준 및 시험방법` |
| 표시·광고 관리 지침 | **감시 불가** (지침류) |

## 검증
- `npx tsc --noEmit` 통과
- `npm run regression:label-check` 28/28 통과
- `npm run build` 통과

## 이메일 알림 제안
이벤트 발생 시 트랜잭션 메일(Resend 등)로 `law_watch_events` 미확인 건 요약. 현재 인프라 없음 — 범위 밖.

## 커밋 해시
- `cd07e57` feat(516): law-watch Open API client and watch list
- `644010c` feat(516): law-watch snapshots, change detect, and daily cron
- `af69131` feat(516): show law-check baseline date on landing and results
- 이 커밋 `test(516): …` — `git log -4 --oneline` 기준 확인
