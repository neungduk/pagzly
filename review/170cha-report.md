# 170차 — export SVG 이스케이프 + electronics 네이티브 픽스처

생성: 2026-09-14

## 요약

| 트랙 | 결과 |
|------|------|
| A export HTML SVG `style` 깨짐 | **수정 완료** — `encodeURIComponent` |
| B electronics 네이티브 픽스처 | **완료** — `comparison_chart` ok-filled |
| 유료 API | **0** |
| `npx tsc --noEmit` | **EXIT 0** |

---

## 트랙 A — 카테고리 SVG 패턴 이스케이프

### 변경 파일
- `lib/design-tokens.ts` — `getCategoryPatternBackground()`만

### 수정
```ts
const forEncode = svg.replace(/%23/gi, "#"); // 기존 data-URI용 %23 이중인코딩 방지
return `url('data:image/svg+xml,${encodeURIComponent(forEncode)}')`;
```
- SVG 도안·투명도·169차 리듬 알파/각도: **미변경**
- export 삽입 경로: `resolveSectionSurface` → `sectionBgStyle` / inline `style="background:${sectionBg};..."` (큰따옴표 HTML 속성). 인코딩 후 `"`는 `%22`만 존재.

### React 라이브 렌더러
- `DetailSectionRenderer`는 `getComposedSectionBackgroundStyle()` 결과를 **style 객체**로 DOM에 설정 → HTML 속성 따옴표 깨짐과 무관. 점검만 함(수정 불필요). 동일 인코딩 문자열을 쓰므로 동작은 더 안전해짐.

### 검증 (무료)
- `npx tsx scripts/170cha-verify-pattern-encode.ts` — raw `"` in data URI 없음, `%22http` 존재
- `npx tsx scripts/169cha-export-fixture-captures.ts` 재실행
- `npx tsx scripts/170cha-verify-export-escape.ts` — 전 카테고리 `brokenStyles:0`, `textLeak:false`
- mid 캡처: food/living에서 패턴은 보이고 **CSS 문자열 노출 없음**  
  (`review/qa-screenshots/169cha-export-{food,living}-mid.png`)

### 전/후
| | 전(169) | 후(170) |
|--|---------|---------|
| mid 캡처 | `xmlns="..."` / `linear-gradient...` 텍스트 노출 | 패턴만 렌더, 텍스트 leak 없음 |
| style 속성 | SVG `"`가 속성 중단 | `%22`로 완전 인코딩 |

---

## 트랙 B — electronics 네이티브 픽스처

### 변경 파일
- `scripts/169cha-rebuild-139-sessions.ts` — electronics 추가
- `scripts/139cha-regression-qa.ts` — `buildElectronicsSession`을 네이티브 트리로
- `scripts/169cha-native-fixture-sections.ts` — dB/배터리에서 chart metrics ≥2 보장(1축만 있으면 생략되던 픽스처 빌더 구멍)
- 산출: `review/139cha-session-electronics.json`
- 구버전 보존: `review/139cha-session-electronics-legacy-pexels.json` (참고용 유지)

### analyze (`167cha-analyze-sessions.ts`)

| | 전 | 후 |
|--|----|----|
| electronics hasChart | ❌ suspect-omit-with-input | ✅ **ok-filled** |
| hasStat | ok-filled | ok-filled |

### 결론
구버전 pexels 스냅샷(166 프롬프트 이전 생성물)에 chart가 없었던 것이 주원인. 네이티브 재구성 후 수치 입력(ANC 42dB·배터리 h·IPX5)으로 `stat`+`comparison_chart` 모두 채워짐 → **살아 있는 generate 로직 버그로 단정할 근거 없음**(실사 0회 판정).  
픽스처 빌더에서 dB 1축만 잡히면 chart가 빠지던 문제는 네이티브 stub 쪽에서 metrics 패딩으로 수정(프로덕션 `comparison-chart-guard` / `assign-section-images` **미수정**).

---

## 명령·비용

```text
npx tsx scripts/169cha-rebuild-139-sessions.ts
npx tsx scripts/167cha-analyze-sessions.ts
npx tsx scripts/170cha-verify-pattern-encode.ts
npx tsx scripts/169cha-export-fixture-captures.ts
npx tsx scripts/170cha-verify-export-escape.ts
npx tsc --noEmit
```

- 유료 API: **0**

---

## 다음 후보
1. (선택) 실사 1회로 electronics live generate chart 채움 재확인 — 이번엔 불필요 판단
2. legacy pexels JSON 삭제 여부 — 현재는 `*-legacy-pexels.json`으로 보존
