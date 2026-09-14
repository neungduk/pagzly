# 141차 — recraft-v3 텍스트 환각 억제 (+ 127차 시크릿 이력 점검)

생성: 2026-09-08

## 요약

- recraft **전용** 무타이포 절 추가 (`concept-icons` + `concept-illustration`). 다른 모델 프롬프트 미변경.
- style enum에 아이콘 전용 값 없음 → `digital_illustration`(유지) + `digital_illustration/hand_drawn_outline`(후보) 2종 소규모 비교.
- **outline 세트: 가짜 텍스트 0/5** (목표 달성). DI 강화만으로는 **2/5** (140차 4/5에서 개선, 목표 미달).
- `ICON_MODEL` 기본값 전환 없음, `.env.local` 원복 확인.
- `tsc --noEmit` EXIT_CODE=0.

## 코드 변경

### `lib/concept-icons.ts` (recraft만)
- `RECRAFT_NO_TYPOGRAPHY_CLAUSE` export
- `generateSingleConceptIcon`: `model === "recraft-v3"`일 때만 절 추가
- recraft일 때 한국어 라벨 문자열을 프롬프트에 넣지 않음 (모티프만)
- `RECRAFT_STYLE` env로 style A/B (`resolveRecraftStyle`)

### `lib/concept-illustration.ts` (recraft만)
- 동일 `RECRAFT_NO_TYPOGRAPHY_CLAUSE`를 `model === "recraft-v3"`일 때만 추가
- heading/body 비삽입 원칙 유지

### style enum 재검토 (`review/140cha-recraft-v3-style-enum.json`)
- 아이콘/뱃지 전용 style **없음**
- 포스터/engraving류는 텍스트 유발 위험 → 제외
- 후보: `digital_illustration`(기본) vs `digital_illustration/hand_drawn_outline`

## 육안 카운트표

| 세트 | style | 가짜 텍스트 장수 | 비고 |
|------|-------|------------------|------|
| 140차 기준 | digital_illustration | **4/5** | BADGE/PROSSINAL 등 |
| 141차 A (v2) | digital_illustration + 강화 프롬프트 | **2/5** | checklist(`BADGE`/`DADGE`), banner(`Editorial DACKDROUND…`) |
| 141차 B (outline) | hand_drawn_outline + 강화 프롬프트 | **0/5** | 목표 달성 |

보드:
- `review/qa-screenshots/141cha-icon-model-ab-recraft-v2.png`
- `review/qa-screenshots/141cha-icon-model-ab-recraft-outline.png`

## 비용

| 세트 | 장수 | 합계 |
|------|------|------|
| DI | 5 | $0.2000 |
| outline | 5 | $0.2000 |
| **합계** | **10** | **$0.4000** |

## 다음 라운드 제안 (이번엔 미적용)

기본값 전환 전: recraft 기본 `style`를 `digital_illustration/hand_drawn_outline`로 두는 안을 우선 검토. DI는 디테일은 좋지만 타이포 환각이 아직 남음.

## 환경 / tsc

- 비교 전: `ICON_MODEL=flux-schell`
- 비교 후: 동일 원복 (`git diff -- .env.local` empty)
- `tsc --noEmit` EXIT_CODE=**0**

---

## 부록 — 127차 로그 시크릿 git 이력 점검

실행 결과 (그대로):

```
$ git log --all --oneline -- review/127cha-server-err.log
(출력 없음)

$ git log --all --oneline -- .env.local
(출력 없음)
```

- **커밋 이력 없음** → history purge 불필요.
- 로컬 `review/127cha-server-err.log`는 삭제함 (`.gitignore`에 `review/*.log` 이미 등록).
- Replicate 토큰 로테이션은 사용자 대시보드 작업(이 브리프 범위 외).
