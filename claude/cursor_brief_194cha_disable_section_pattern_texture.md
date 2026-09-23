# 194차 — 섹션 배경 장식 텍스처("물방울") 전체 비활성화, 그라데이션 배경만 유지 (API 0)

생성: 2026-09-15

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 이번
항목은 상수 하나(`true`→`false`)만 바꿉니다 — 함수 로직/데이터는 그대로 둡니다.

## 배경 — 사용자 지적 + 원래도 "옵트인·기본 꺼짐"이었던 것이 항상 켜진 채로 굳어짐

193차 완료 직후 사용자가 이렇게 지적했습니다:

> "다음 인포그래픽이랑 뒤에 배경이 너무 물방울이 튀는데 차라리 물방울은 없애고 단색
> 배경은 어때 다 단색배경인데"

코드를 확인하니 사용자가 말하는 "물방울"은 `lib/design-tokens.ts`의
`CATEGORY_PATTERN_SVG`(151~160행) — 카테고리별로 아주 옅은(opacity 4~6%) 반복 SVG
텍스처를 모든 섹션 배경 위에 타일링해서 얹는 장치입니다(식품 카테고리는 물결/파형
곡선, 화장품은 원형 기포, 반려동물은 발바닥 모양 등). 스크린샷의 "포장과 구성"
배경에 보이던 옅은 물결 무늬가 정확히 이것입니다.

**크롤링 근거 재확인** — 이 장치는 51차(`claude/cursor_brief_51cha_final_mvp_polish.md`,
T1-C)에서 실제 쇼핑몰(위글위글·마켓컬리) 벤치마크 근거로 도입됐는데, 그 브리프 원문에
이미 이렇게 명시돼 있었습니다:

> "`design-tokens.ts`에 카테고리별로 아주 은은한(투명도 3~6% 수준) SVG 반복 패턴을
> 배경에 오버레이할 수 있는 옵션을 추가하세요... **기본은 끄고, 카테고리별로
> 옵트인**하는 방식으로 도입해서 기존 페이지 회귀 위험을 최소화하세요."

즉 원래 설계 의도부터가 "기본 꺼짐 + 옵트인"이었는데, 실제 구현
(`getCategoryPatternBackground()`)은 옵트인 스위치 없이 카테고리만 있으면 무조건
합성하는 구조로 굳어졌고, 이후 152/159/162차 등 여러 벤치마크 크롤링에서도 이 텍스처를
다시 검토한 적이 없습니다 — 애초 "기본 꺼짐" 의도가 44라운드 동안 한 번도 지켜지지
않은 것입니다. 그리고 이번 사용자 피드백은 "그 텍스처가 안 켜진 상태(단색/그라데이션만)"
가 오히려 낫다는 것이므로, 원래 의도(기본 꺼짐)로 되돌리는 것이 맞습니다.

**적용 범위 확인** — `getCategoryPatternBackground()`는 `composeSectionBackground()`
한 곳을 통해서만 쓰이고, 이 함수는 라이브(`getComposedSectionBackgroundStyle()` →
`DetailSectionRenderer.tsx`의 `sectionBackgroundStyle`/`textSectionStyle`)와 export
(`resolveSectionSurface()` → `lib/export-detail-html.ts`의 `sectionBgStyle()`) 양쪽이
전부 거쳐가는 단일 지점입니다 — 즉 6개 카테고리, 거의 모든 섹션 타입(체크리스트/갤러리/
하이라이트박스/스펙표/후기 등)에 공통으로 적용되고 있었던 것이 맞습니다(사용자의
"전반적인"이라는 표현과 일치).

## 작업 — 단일 플래그로 끄기 (데이터·함수는 보존)

`lib/design-tokens.ts`의 `getCategoryPatternBackground()`(162~171행) 바로 위에 플래그
상수를 추가하고, 함수 맨 앞에서 그 플래그를 확인하도록 한 줄만 추가하세요:

```ts
// before (161행 바로 뒤)
export function getCategoryPatternBackground(category?: string): string | undefined {
  if (!category) return undefined;
  const svg = CATEGORY_PATTERN_SVG[category];
  if (!svg) return undefined;
  // 170차 — encodeURIComponent로 data URI를 HTML style="..."·CSS url() 모두에 안전하게.
  // 기존 SVG는 data URI용으로 %23(#)을 미리 넣어 둔 경우가 있어, 전체 encode 전에 #로
  // 되돌린 뒤 encode한다(이중 인코딩 %2523 방지). 도안·투명도는 그대로.
  const forEncode = svg.replace(/%23/gi, "#");
  return `url('data:image/svg+xml,${encodeURIComponent(forEncode)}')`;
}
```

```ts
// after
/**
 * 194차 — 사용자 피드백("물방울이 튀는 것 같다")으로 섹션 배경 장식 텍스처를 전체
 * 비활성화. 51차 원래 설계도 "기본은 끄고 카테고리별 옵트인"이었는데 옵트인 스위치
 * 없이 항상 켜진 채로 굳어져 있었던 것 — 이번에 원래 의도(기본 꺼짐)로 되돌린다.
 * CATEGORY_PATTERN_SVG 데이터와 이 함수 로직은 지우지 않는다(다시 켜고 싶으면 이
 * 상수 하나만 true로 되돌리면 됨 — 그라데이션 패턴 A/B/D/E는 이 플래그와 무관하게
 * 그대로 유지된다, 사용자가 말한 "단색 배경"이 바로 그것).
 */
const CATEGORY_PATTERN_ENABLED = false;

export function getCategoryPatternBackground(category?: string): string | undefined {
  if (!CATEGORY_PATTERN_ENABLED) return undefined;
  if (!category) return undefined;
  const svg = CATEGORY_PATTERN_SVG[category];
  if (!svg) return undefined;
  // 170차 — encodeURIComponent로 data URI를 HTML style="..."·CSS url() 모두에 안전하게.
  // 기존 SVG는 data URI용으로 %23(#)을 미리 넣어 둔 경우가 있어, 전체 encode 전에 #로
  // 되돌린 뒤 encode한다(이중 인코딩 %2523 방지). 도안·투명도는 그대로.
  const forEncode = svg.replace(/%23/gi, "#");
  return `url('data:image/svg+xml,${encodeURIComponent(forEncode)}')`;
}
```

**이 한 줄로 자동으로 다 정리되는 이유**: `composeSectionBackground()`(174~178행)와
`getComposedSectionBackgroundStyle()`(181~194행), export의 `sectionBgStyle()`
(export-detail-html.ts:142~146행) 전부 `getCategoryPatternBackground()`가 `undefined`를
반환하면 자동으로 "패턴 없음" 분기를 타서 그라데이션 배경만 반환하도록 이미 짜여 있습니다
— 호출부는 하나도 손댈 필요가 없습니다. `backgroundRepeat`/`backgroundSize` 같은
패턴 전용 CSS 속성도 자동으로 안 붙습니다(붙였다가 패턴이 없어서 어긋나는 일 없음).

## 검증 (짧게)

1. `npx tsc --noEmit` — 0.
2. `grep -n "CATEGORY_PATTERN_ENABLED" lib/design-tokens.ts` — `false`로 선언, 함수
   맨 앞에서 체크하는지 확인.
3. 6개 카테고리 각 1섹션씩(또는 기존 세션 JSON 재사용, 새 생성 없이) `getSectionBackground`
   출력의 `background` CSS 문자열에 더 이상 `url('data:image/svg+xml...`가 안 섞여
   있는지 확인 — 순수 `linear-gradient(...)`만 남아야 함.
4. `npx tsx`로 `getCategoryPatternBackground("식품/건강기능식품")` 등 직접 호출해서
   `undefined` 반환 확인.
5. 그라데이션 패턴(A/B/D/E) 자체 색상·각도는 회귀 없는지(이 파일의 다른 함수는
   전혀 안 건드렸으니 자동으로 무변화겠지만, `getSectionBackground()` 반환값이 이전과
   동일한지 1~2개 샘플로 대조).

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- `CATEGORY_PATTERN_SVG` 데이터, `getCategoryPatternBackground()`의 인코딩 로직 자체는
  삭제하지 않음 — 플래그 하나로 껐다 켤 수 있게 보존.
- 그라데이션 배경 패턴 A/B/D/E(`getSectionBackground()`)와 강조 색면 패턴 C는 미수정 —
  사용자가 말한 "단색 배경"이 바로 이것이고, 이미 정상 동작 중.
- AI 배경 합성(`lib/backdrop-prompt-templates.ts`)의 "물방울/기포" 프롬프트 모티프는
  전혀 다른 시스템(실제 사진 생성, 유료 API)이라 이번 범위 밖 — 이번은 순수 CSS
  데코레이션 텍스처(SVG 오버레이)만 대상.
- 193차가 끝낸 갤러리 간격/export 헤드라인 폰트, 192차 반려동물 리뷰 신호 등
  174~193차 완료 항목 재작업 없음.

## 완료 보고 형식 (짧게)

3~5줄 요약 + `CATEGORY_PATTERN_ENABLED=false` 확인 + `getCategoryPatternBackground()`
호출 결과(undefined) + diff.

## 백로그 마스터

이번에도 Cursor가 갱신하지 않습니다 — `review/194cha-report.md`만 남겨주시면 검증 후
제가 `claude/pagzly-backlog-master-2026-09-15.md`에 반영하겠습니다(사용자 피드백 직접
반영 + 51차 원래 설계 의도 복원 사례로 기록).
