# 251차 — illustration_banner를 AI 추상 일러스트에서 실사진 기반 배너로 전환 (유료 API 제거, 순비용 절감)

생성: 2026-09-23 · 유료 API **0건 — 오히려 기존 Replicate 유료 호출 1개를 제거함**

## 배경

250차 벤치마크(레이메이커 AI 경쟁사 갤러리 35건 전수 열람 + 후커블 실제 생성 예시)에서
확인: 실제 판매 디자이너 페이지도, AI 자동생성 경쟁사도 히어로/컨셉 배너에 **추상적인
AI 생성 일러스트(소용돌이 패턴 등)를 쓰는 사례가 하나도 없었음** — 전부 "실제 제품 사진
위에 굵은 헤드라인 타이포를 얹는" 방식. Pagzly의 `illustration_banner` 섹션(현재
`lib/concept-illustration.ts`의 `generateIllustrationBanner()`로 recraft-v3/v4-svg를
호출해 장당 $0.04~$0.08의 추상 배경 이미지를 생성)은 이 방향과 다름.

249차에서 이 섹션의 **즉각적인 가독성 버그**(텍스트가 AI 패턴과 겹쳐 저대비)는 이미
고쳤지만, 그건 증상 치료였고 이번엔 **근본 구조를 실사진 기반으로 바꾸는 라운드**입니다 —
사용자가 250차 결과를 보고 "실사진 기반 배너로 전환" 방향을 명시적으로 선택했습니다.

**핵심**: 이 전환은 새 유료 API가 필요 없을 뿐 아니라, 오히려 지금 나가고 있는 Replicate
호출($0.04~0.08/장, `illustration_banner`은 6개 카테고리 템플릿에 전부 존재하므로 상품당
1회 이상 발생)을 완전히 제거합니다. 이미 업로드된 상품 사진을 재사용하는 것뿐입니다.

---

## 1. 타입 변경 — `lib/types/generate.ts`

`IllustrationBannerSection`(381~389행)에 `imageIndex`를 추가하고 `illustrationUrl`은
**기존에 이미 생성된 상품(하위호환용)만 읽을 수 있게 optional로 완화**:

```ts
export type IllustrationBannerSection = {
  type: "illustration_banner";
  slot: string;
  heading?: string;
  body?: string;
  /** 251차 — 배경으로 쓸 상품 사진의 인덱스. 신규 생성은 이 필드를 씀 */
  imageIndex?: number;
  /** 레거시 — 251차 이전에 생성된 상품은 AI 일러스트 URL이 남아있을 수 있음.
   * 렌더러는 이 값이 있으면(구 데이터) 그대로 표시하고, 없으면 imageIndex로 렌더 */
  illustrationUrl?: string;
};
```

**하위호환 중요**: 이미 DB에 저장된 기존 상품들은 `illustrationUrl`에 실제 AI 일러스트
URL이 들어있습니다. 이 필드를 지우거나 필수에서 없애면 기존 상세페이지가 깨집니다.
렌더러는 반드시 "`illustrationUrl`이 있으면 그걸 우선 표시(레거시), 없으면
`imageIndex`로 사진을 표시(신규)" 순서를 지켜야 합니다.

## 2. 이미지 배정 파이프라인에 편입 — `lib/assign-section-images.ts`

현재 `illustration_banner`는 이 파일 어디에도 안 걸려 있습니다(grep 확인 완료) — 즉
`collectUsedIndexes()`(사용된 인덱스 수집, 79~99행)·`countPlacements()`(101~113행)·
`assignDistinctSectionImages()` 본체 어디에도 이 섹션 타입을 다루는 분기가 없습니다.
사진을 배정하려면 이 세 곳에 `illustration_banner`를 추가해야 합니다.

**구조적으로 가장 가까운 기존 케이스는 `image_text`입니다** — 둘 다 "섹션 하나 = 사진
하나(`imageIndex`) = 풀블리드 배경" 모양이 동일합니다. `image_text`가
`collectUsedIndexes()`/`countPlacements()`/본체에서 처리되는 방식을 그대로 따라
`illustration_banner`도 같은 급으로 취급하세요(단, `image_text`처럼 `layout: "text_only"`
같은 텍스트 전용 분기는 필요 없음 — `illustration_banner`은 항상 사진 배경).

사진 선택 로직은 243차가 만든 `pickBestIndexByCopy()`(114~144행, 이미 export되어 있음)를
그대로 재사용해 `section.body`(분위기 카피)와 후보 사진들의 Vision 태그를 매칭시키세요 —
새 매칭 함수를 만들 필요 없이 기존 패턴 재사용입니다.

## 3. 서버 — `app/api/generate/route.ts`

2040~2126행의 `illustration_banner` 처리 루프(`generateIllustrationBanner()` Replicate
호출 → 실패 시 `buildIllustrationBannerFallback()` 로컬 합성 폴백) **전체를 제거**하고,
대신 이미 위 §2에서 `assignDistinctSectionImages()`가 배정한 `imageIndex`를 그대로 두면
됩니다(별도 후처리 루프 불필요 — 다른 `image_text` 섹션들과 동일하게 이미지 배정
단계에서 이미 끝남).

`import { generateIllustrationBanner } from "@/lib/concept-illustration"`(63행)와
관련 비용 변수(`illustrationCost`, `illustrationAttempted` 등)도 함께 정리하세요.
`lib/concept-illustration.ts`·`lib/illustration-banner-fallback.ts` 파일 자체는
**삭제하지 말고 남겨두세요**(레거시 데이터 마이그레이션/롤백 대비 — 다만 어디서도
더 이상 호출되지 않아야 함, 참조 없는 export만 남는 건 허용).

`illustration_banner`의 프롬프트 지침(544행 근처 `illustrationUrl: "" — 서버가 채우므로
빈 문자열`, 977행 근처 동일 안내)도 신규 동작에 맞게 수정 — DeepSeek 응답 스키마에서
`illustrationUrl` 요구를 제거하거나 옵션으로 바꾸세요.

## 4. 라이브 렌더러 — `components/DetailSectionRenderer.tsx` (illustration_banner 케이스, ~2812~2891행)

현재 이미 존재하는 "AI 일러스트 없을 때" 폴백 분기(`bgSrc = resolveImage(imageUrls, 0) ||
heroFallback`, 흐림 처리 + 장식 원 + 대각선 패턴)를 **주경로로 승격하되, 다음을 바꾸세요**:

- `imageUrls[0]` 고정 대신 `resolveImage(imageUrls, section.imageIndex ?? 0)`로 §2에서
  배정된 실제 인덱스 사용.
- 현재 폴백 분기의 "흐림(blur-2xl) + opacity-55 + 장식 원 + 대각선 패턴" 처리는
  **제거**하세요 — 이건 "AI 일러스트가 없을 때 최대한 그럴듯하게 흉내"내던 임시 처리라,
  이번엔 사진을 또렷하게 그대로 보여주는 게 목적입니다(레이메이커·후커블처럼).
- 249차에서 이미 추가한 **텍스트 블록 전용 다크 패널 스크림(`rgba(27,27,24,.9)`, 2줄
  clamp)은 그대로 유지**하세요 — 실사진도 밝기·복잡도가 제각각이라(예: 유리병 반사,
  물방울) 대비 보장이 여전히 필요합니다. 즉 249차 스크림/clamp 코드는 건드리지 않고,
  그 아래 "배경을 무엇으로 채우는가"만 바뀝니다.
- `section.illustrationUrl`이 있으면(레거시 데이터) 기존처럼 그걸 그대로 표시 — 이
  분기는 삭제하지 마세요.

## 5. Export HTML — `lib/export-detail-html.ts` (illustration_banner 케이스, ~966~984행)

라이브 렌더러와 동일한 방향으로 동기화:
- `illSrc = section.illustrationUrl || imageUrls[section.imageIndex ?? 0] || imageUrls[0] || ""`
  순서 유지(레거시 우선, 신규는 imageIndex).
- 249차가 추가한 다크 패널 스크림 + `-webkit-line-clamp:2`는 그대로 유지.
- 기존에 있던 흐림/장식 처리가 export 쪽에 있다면(라이브와 동일하게) 제거.

## 6. 절대 규칙

1. 새 유료 이미지 생성 API 호출 **추가 금지** — 이번 라운드는 오히려 기존 호출 1개를
   제거하는 라운드입니다.
2. 기존에 이미 생성된 상품(DB에 `illustrationUrl`이 채워진 레코드)의 상세페이지가
   깨지면 안 됩니다 — §1·§4·§5의 "레거시 우선" 순서를 반드시 지키세요.
3. 사진 배정은 다른 슬롯과 중복되지 않아야 합니다(§2) — `imageUrls[0]` 같은 고정
   인덱스를 그대로 쓰면 히어로와 겹칠 수 있으니 반드시 `assignDistinctSectionImages()`
   경유로 배정하세요.

## 7. 검증 (유료 API 없음 — 기존 자산 재사용)

새 스크립트(예: `scripts/251cha-illustration-banner-photo-verify.ts`)에서:

1. `assignDistinctSectionImages()`를 실제로 import해서, `illustration_banner` 섹션
   1개 + `image_text` 섹션 2개 + `hero` 1개가 섞인 더미 섹션 배열과 247/248차 실제
   생성물의 `imageUrls`(session.json에서 가져오기)를 넣고 실행 → `illustration_banner`의
   `imageIndex`가 다른 섹션들의 인덱스와 겹치지 않는지 assert.
2. `buildDetailPageHtml()`(export 함수, 실제 함수 import)로 그 결과를 렌더 → Playwright로
   `review/251cha-illustration-banner-photo/after.png` 스크린샷(249차
   `scripts/249cha-illustration-banner-verify.ts`의 패턴 그대로 재사용 가능).
3. 레거시 호환 케이스도 하나 검증: `illustrationUrl`이 채워진 더미 섹션을 넣었을 때
   여전히 그 URL이 그대로 렌더되는지(§1의 하위호환 규칙) assert.
4. `review/251cha-report.md`에 before(249차 after.png, 일러스트 버전)·after(이번 실사진
   버전) 스크린샷을 나란히 비교 + `assignDistinctSectionImages` 충돌 없음 assert 결과 +
   `git diff --stat` + `app/api/generate/route.ts`에서 `generateIllustrationBanner`
   호출이 실제로 제거됐는지(grep 결과) 포함.

API generate: **0** (기존 세션 자산 재사용, 신규 생성 없음).
