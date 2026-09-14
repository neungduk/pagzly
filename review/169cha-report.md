# 169차 — 실사(유료) 없이 코드 업그레이드

생성: 2026-09-14

## 요약

| 트랙 | 결과 |
|------|------|
| A 섹션 배경 A/B/D/E 리듬 대비 | 완료 — 알파·각도·정지점 조정, 패턴 C·offset 미변경 |
| B 139 픽스처 네이티브 섹션 트리 | 완료 — fashion/food/living 뷰티 클론 제거 |
| 유료 API | **0** (`/api/generate`·Replicate·BRIA 미호출) |
| `npx tsc --noEmit` | **EXIT 0** |

---

## 트랙 A — 섹션 배경 색 리듬

### 변경 파일
- `lib/design-tokens.ts` — `getSectionBackground()` A/B/D/E만

### 조정 요지 (3색 유지)
| 패턴 | 변경 |
|------|------|
| A | accentSoft 알파 ↑ (비패션 0.42→0.48, 패션 0.21→0.24) |
| B | 각도 168→**125deg**, 정지점 52%→**38%**, accent 알파 ↑ |
| D | 각도 175→**210deg**, 정지점 45%→**58%**, accentSoft 우세 강화 |
| E | deepAccent 알파 ↑ (비패션 0.1→**0.28**, 패션 0.035→**0.1**), 중간 정지 36% |
| C | **미변경** |
| `SECTION_PATTERN_OFFSET` | **미변경** |

패션(`fashionMinimal`)은 강화 폭을 비패션보다 작게 유지(58차 미니멀 의도).

### 검증 (무료)
- `npx tsx scripts/169cha-rhythm-board.ts`
- 보드: `review/169cha-rhythm/rhythm-board.html`
- 캡처: `review/qa-screenshots/169cha-rhythm-before-after.png` (좌=166 시점 / 우=169)

### 소견
연속 7섹션 시퀀스에서 AFTER가 BEFORE보다 A↔E 대비가 분명함. 식품·뷰티처럼 accent가 뚜렷한 카테고리는 E가 한 단계 진해져 “숨 고르기→앵커” 리듬이 읽힘. 패션은 의도대로 변화가 작음. 무지개색 아님(accent/baseNeutral/deepAccent만).

후보 버전을 더 만들지는 않음 — 1안이 목표(구분 강화·과채색 회피)에 충분하다고 판단. 더 soft/hard 원하시면 알파만 미세 조정하면 됨.

보조: `scripts/169cha-export-fixture-captures.ts`로 6카테고리 export HTML 캡처  
(`review/qa-screenshots/169cha-export-*-{full,rhythm,mid}.png`).  
참고: export HTML에서 카테고리 SVG 패턴의 `xmlns="..."`가 `style="..."`를 깨는 **기존 이스케이프 이슈**가 mid 캡처에 CSS 문자열이 보이는 원인 — 리듬 판정은 보드 캡처를 우선.

---

## 트랙 B — 139 픽스처 네이티브 섹션 트리

### 변경 파일
- `scripts/169cha-native-fixture-sections.ts` — `getSlotTemplate` + 정적 카피, optional은 수치/트레이드오프 힌트 있을 때만
- `scripts/169cha-rebuild-139-sessions.ts` — fashion/food/living JSON 재작성
- `scripts/139cha-regression-qa.ts` — `buildFashion/Food/LivingSession`이 네이티브 트리 사용
- `scripts/167cha-analyze-sessions.ts` — `CLONE_SECTION_IDS` 제거 → 실제 채움 판정
- 산출: `review/139cha-session-{fashion,food,living}.json`

### `npx tsx scripts/167cha-analyze-sessions.ts` (요지)

| id | hasStat | hasChart | hasTradeoff | verdict |
|----|---------|----------|-------------|---------|
| food | ✅ | ✅ | — | ok-filled / ok-filled |
| fashion | ✅ | ✅ | — | ok-filled / ok-filled |
| living | ✅ | ✅ | ✅ | 전부 ok-filled |
| electronics | ✅ | ❌ | — | chart: **suspect-omit-with-input** (아래) |
| cosmetics-* | — | (리뷰축 등) | — | 오염 없음 |

food/fashion/living는 이제 **구조적으로** optional 슬롯 채움 여부를 판정 가능(168차 한계 해소).

### 로직 버그?
네이티브 재구성 경로에서는 수치·트레이드오프 입력이 있으면 슬롯이 채워짐 — 픽스처 빌더 쪽 omit 버그는 없음.

**electronics**: 여전히 `pexels-electronics-detail` 실사 세션(뷰티 클론 아님). 수치 입력 있는데 `comparison_chart` 없음 → `suspect-omit-with-input`.  
이번 라운드는 유료 재생성·`assign-section-images`/`comparison-chart-guard` 미수정 원칙상 **고치지 않음**. 다음 라운드 후보: 전자도 네이티브 픽스처로 재구성하거나 실사 1회로 채움 재검증.

### 하지 않은 것
- `comparison-chart-guard.ts` / `assign-section-images.ts` 미수정
- pet 빌더 없음(139 케이스에 pet 없음)
- `/api/generate` 0회

---

## 비용·검증 명령

```text
npx tsx scripts/169cha-rebuild-139-sessions.ts
npx tsx scripts/167cha-analyze-sessions.ts
npx tsx scripts/169cha-rhythm-board.ts
npx tsx scripts/169cha-export-fixture-captures.ts
npx tsc --noEmit
```

- 유료 API 호출: **0**
- 전체 `139cha-regression-qa.ts`(로컬 `/create/result` + auth)는 이번엔 미실행 — auth·dev 서버 의존. 동일 원리의 export HTML + 리듬 보드로 대체.

---

## 다음 라운드 후보

1. electronics `comparison_chart` suspect — 네이티브 픽스처 또는 실사 1회
2. export HTML 카테고리 SVG `url('data:...')` 따옴표 이스케이프(CSS leak)
3. Track A 알파를 사용자 취향으로 soft/hard 미세 조정
4. (유료) `/create/result` 풀 회귀 캡처로 live↔export 리듬 재확인
