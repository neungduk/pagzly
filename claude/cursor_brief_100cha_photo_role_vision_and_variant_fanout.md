# 100차 — 사진 역할 Vision 자동 인식 + 재가공 변형 팬아웃

생성: 2026-09-03
전제: 사용자 피드백 — "후커블은 인물사진에 제품을 합성해 사용샷을 보여주고 제품사진을 재가공해서 보여주는데 우리는 그런 게 하나도 없다. 제품사진을 인식해서 포장용기 같은 건 AI가 알아서 포장으로 인식하게 해야 하는데 그게 전혀 안 된다."

99차(이미지 다양성)에 이어, 이 피드백의 원인을 코드에서 확인한 결과 **세 갈래**로 나뉩니다.

1. **인물 합성 사용샷** — 코드는 이미 있고 정교함(64~93차의 lifestyle composite). 로컬 `.env.local`의 `TEST_MODE=true` / `IMAGE_ROUTER_ENABLED=false` 때문에 no-op 상태였음. **이번 브리프 범위 밖(설정 문제)** — 사용자가 별도로 검증합니다.
2. **사진 역할 자동 인식** — **코드에 아예 없음.** 이번 브리프의 핵심(작업 A).
3. **재가공 변형** — 있지만 대상이 좁고, 일부는 원본을 덮어써서 장수가 늘지 않음(작업 B).

부수적으로 확인된 표시 버그(작업 C)와 문구 오류(작업 D)도 함께 정리합니다.

---

## 작업 A — Vision 기반 사진 역할 자동 분류 (핵심)

### 현재 상태

역할 값의 유일한 출처는 **업로드 순서**입니다. `lib/image-roles.ts:122-128`:

```ts
export function defaultRoleForIndex(index: number): ProductImageRole {
  if (index === 0) return "hero";
  if (index === 1) return "detail";
  if (index === 2) return "lifestyle";
  if (index === 3) return "package";
  return "other";
}
```

`lib/image-roles.ts:137-146` `normalizeImageRoles`가 사용자가 드롭다운으로 직접 지정하지 않은 인덱스를 전부 이 기본값으로 채웁니다. 그 결과 `lib/assign-section-images.ts:154-156`의 `packaging_design` 슬롯은 사실상 **"네 번째로 올린 사진"** 을 쓰며, 그게 실제 포장 사진인지는 아무도 확인하지 않습니다.

Vision 호출이 두 군데 있지만 둘 다 역할 분류가 아닙니다:
- `app/api/generate/route.ts:257-343` `analyzeImagesWithClaude` — Claude Vision이지만 반환이 `{ analysis: string }` **자유 서술 텍스트**뿐이라 인덱스↔역할 매핑이 없습니다. 프롬프트(`:336-338`)는 "어떤 사진이 어떤 용도인지 판단하는 데 사용됩니다"라고 말하지만 구조화된 출력이 없어 실제로 배정에 쓰이지 못합니다. 게다가 `:967` `assignDistinctSectionImages(...)`가 LLM이 고른 `imageIndex`를 전부 덮어씁니다.
- `lib/autofill-photo-vision.ts:49-79` — 폼 텍스트 자동입력 전용(최대 4장), 역할 분류 항목 없음.

### 해야 할 일

`analyzeImagesWithClaude`가 프로즈 대신 **구조화된 역할 판정을 함께 반환**하도록 확장하고, 그 결과를 배정에 주입합니다.

1. 프롬프트를 수정해 아래 형태의 JSON을 함께 받도록 합니다(기존 서술형 `analysis` 문자열은 유지 — 카피 생성에 쓰이고 있으므로 제거하지 마세요):

```json
{
  "analysis": "기존 서술형 텍스트 그대로",
  "roles": [
    { "index": 0, "role": "hero", "confidence": 0.9, "reason": "정면 단독 제품컷" },
    { "index": 1, "role": "package", "confidence": 0.85, "reason": "박스·구성품이 함께 보임" },
    { "index": 2, "role": "detail", "confidence": 0.7, "reason": "라벨 확대컷" }
  ]
}
```

`role`은 `lib/image-roles.ts`의 `PRODUCT_IMAGE_ROLES`(hero/detail/lifestyle/package/other)만 허용합니다. 판정 기준을 프롬프트에 명시하세요 — 예: 박스·파우치·구성품 나열이 보이면 `package`, 사람 손·신체·생활 배경이 보이면 `lifestyle`, 질감·라벨·기능부 확대면 `detail`, 배경 정리된 단독 제품 정면이면 `hero`.

2. 판정 결과를 `imageRoles`로 주입합니다. **우선순위는 "사용자 지정 > Vision 판정 > 업로드 순서 기본값"** 입니다. `normalizeImageRoles(roles, imageCount)`가 지금은 (사용자 지정 → 순서 기본값) 2단계인데, Vision 판정을 중간 단계로 끼워 넣으세요. 시그니처를 바꾸든 별도 함수를 추가하든 방식은 자유지만, **사용자가 드롭다운으로 직접 고른 값은 절대 덮어쓰지 마세요.**

3. `confidence`가 낮으면(예: 0.5 미만) 그 인덱스는 Vision 판정을 쓰지 말고 기존 순서 기본값으로 두세요.

4. 로그를 남겨 주세요: `[image-roles] vision=[hero,package,detail,...] user=[...] final=[...]` — 이번처럼 "왜 저 사진이 저 섹션에 갔지?"를 로그만으로 추적할 수 있게.

### 주의

- draft→final 흐름에서 `useDraftSections=true`인 경로(`app/api/generate/route.ts:1148` 이후 else 분기 `:1299~`)를 탈 때도 역할 판정 결과가 유실되지 않고 전달되는지 반드시 확인하세요. 지금 `imageAnalysis`가 이 경로에서 빈 문자열이 되는 문제가 있습니다(작업 C 참고) — 역할 판정도 같은 함정에 빠지기 쉽습니다.
- Vision 호출을 새로 추가하지 말고 **기존 `analyzeImagesWithClaude` 호출 1회에 역할 판정을 얹으세요.** 비용이 늘면 안 됩니다.

---

## 작업 B — 재가공 변형 팬아웃

### 현재 상태

원본 1장 → 파생본 1장의 **1:1 치환**이라 변형이 쌓이지 않습니다.

| 산출물 | 위치 | 접미사 | 현재 적용 범위 |
|---|---|---|---|
| 배경 교체본 | `lib/photo-pipeline-client.ts:360-366` | `-enhanced` | index 0..`studioCompositeLimit`-1 만 |
| 성분 배경 합성 | `:297-301` | `-ingredient` | 뷰티 + 업로드 2장 미만일 때만 |
| 텍스처 배경 합성 | `:311-315` | `-texture` | 뷰티 + 총 3장 미만일 때만 |
| fx 오버레이 | `app/api/generate/route.ts:1457-1476` | `-fx-<specId>` | 화장품 + conceptBrief 있을 때, **원본 슬롯 덮어쓰기(`:1474`)** |

핵심 제약은 `lib/lifestyle-shot-planner.ts:12-16` `computeStudioCompositeLimit` — 업로드 5~7장이면 3장, 8장 이상이면 4장까지만 배경 교체를 합니다. 그 이상 인덱스는 `photo-pipeline-client.ts:338-342`에서 `results.push(item)`으로 **원본 그대로** 통과합니다.

### 해야 할 일

1. **fx 오버레이를 덮어쓰기 대신 append로** 바꿔 주세요(`route.ts:1474`). 같은 사진의 fx 적용본이 원본을 대체하는 게 아니라 **별도 변형으로 이미지 풀에 추가**되면, 1장이 2장이 됩니다. (단, 97차에서 지시한 "히어로에는 fx를 붙이지 않는다" 규칙은 그대로 유지하세요.)
2. `-ingredient` / `-texture` 파생의 "업로드 장수가 적을 때만" 조건을 완화해, **사진이 많아도 최소 1개씩은 만들도록** 해주세요. 지금은 사진을 많이 올릴수록 오히려 변형이 안 생깁니다.
3. `computeStudioCompositeLimit` 상한을 올리는 것은 **비용과 직결**되므로 이번엔 값을 바꾸지 말고, 대신 상한에 걸려 원본 그대로 통과한 사진이 몇 장인지 로그로 남겨 주세요: `[photo-pipeline] studioLimit=3 uploaded=7 passthrough=4`. 실제 상향 여부는 이 로그와 비용을 보고 다음 라운드에서 판단합니다.

---

## 작업 C — "1/4단계 완료" 표시 버그

결과 페이지의 생성 단계 카드가 모든 상품에서 "1/4단계 완료"로 뜨고 앞 3단계(이미지 분석·톤앤매너·레이아웃)가 체크되지 않습니다. **실행은 되는데 저장·조회가 안 되는 표시 버그**입니다. 원인 두 개:

1. `app/api/generate/route.ts:1135`에서 `imageAnalysis`가 `""`로 초기화되고 `:1148 if (!useDraftSections)` 블록 안에서만(`:1159`) 채워집니다. draft→final 흐름은 `useDraftSections=true`라 else 분기(`:1299~`)를 타고, DB `image_analysis` 컬럼에 **빈 값으로 저장**됩니다(`:1686`, `:1716`).
2. `app/create/result/page.tsx:248`의 `.select(...)`에 `image_analysis`가 없고, `:127` `mapProductRow`가 `imageAnalysis: ""`를 **하드코딩**합니다. `theme`과 `photoCostBreakdown`도 products 테이블에 저장되지 않습니다.

고칠 것: final 경로에서도 `image_analysis`를 저장하고, result 페이지의 select와 `mapProductRow`에 반영하세요. `theme`/`photo_cost_breakdown` 컬럼 추가가 필요하면 마이그레이션을 만들어 주세요(컬럼 추가만, 기존 데이터 변경 없이).

---

## 작업 D — 폼 문구와 실제 동작 불일치 (작지만 중요)

생성 폼의 "인물/라이프스타일 사진 (선택)" 안내에 **"AI가 가짜 인물을 만들지는 않습니다"** 라고 적혀 있습니다. 그런데 `lib/lifestyle-shot-planner.ts:63-104` `buildHumanShots`는 `"A real person naturally uses or holds..."` 프롬프트로 **AI 인물 사용샷을 실제로 생성**합니다(`photo-pipeline-client.ts:685`, 업로드 3장 이상이면 발동).

판매자에게 사실과 다른 안내가 나가고 있으므로 둘 중 하나로 맞춰 주세요:
- (권장) 문구를 사실에 맞게 수정 — 예: "인물 사진을 올리면 그 사진에 제품을 합성합니다. 올리지 않으면 AI가 생성한 연출 인물컷이 사용될 수 있습니다."
- 또는 AI 인물 생성 경로를 옵트인으로 바꾸고 기본은 끄기.

어느 쪽으로 갈지 애매하면 문구 수정만 하고 사용자에게 확인을 요청하세요.

---

## 하지 않는 것

- `TEST_MODE` / `IMAGE_ROUTER_ENABLED` 설정값은 이번 브리프에서 건드리지 마세요 — 사용자가 직접 판단해 검증합니다.
- 인물 합성(lifestyle composite) 로직 자체는 수정하지 않습니다(64~93차 결과물 유지).
- `computeStudioCompositeLimit` 값 자체는 이번엔 바꾸지 않습니다(로그만 추가).
- 부족한 컷을 생성형 이미지로 새로 만들어 채우는 것은 범위 밖입니다.

## 검증 방법

- `npx tsc --noEmit` 에러 0건.
- 사진 순서를 **일부러 뒤섞어서**(예: 1번에 포장 박스컷, 4번에 정면컷) 신규 상품을 생성한 뒤, `[image-roles]` 로그에서 Vision이 `package`/`hero`를 순서와 무관하게 맞게 판정하는지 확인. 그리고 "패키지 디자인" 섹션에 실제 포장컷이 들어갔는지 결과 페이지에서 눈으로 확인.
- 사용자가 드롭다운으로 역할을 직접 지정한 경우, Vision 판정이 그 값을 덮어쓰지 않는지 확인.
- fx append 적용 후 고유 이미지 수가 늘었는지 99차 브리프의 콘솔 스니펫으로 실측.
- 결과 페이지를 목록에서 다시 열었을 때 생성 단계가 "4/4단계 완료"로 뜨는지 확인.

## 완료 보고 체크리스트

- [ ] `analyzeImagesWithClaude`가 구조화 `roles` JSON을 함께 반환
- [ ] 사용자 지정 > Vision > 순서 기본값 우선순위로 `imageRoles` 주입
- [ ] confidence 낮으면 기본값 유지
- [ ] `[image-roles]` 로그 추가
- [ ] draft→final 경로에서도 역할 판정이 유실되지 않음
- [ ] fx 오버레이 append 전환 (97차 히어로 제외 규칙 유지)
- [ ] `-ingredient`/`-texture` 파생 조건 완화
- [ ] `[photo-pipeline] studioLimit/passthrough` 로그 추가
- [ ] `image_analysis` final 경로 저장 + result 페이지 조회 반영
- [ ] 폼 문구 수정
- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 사진 순서 뒤섞기 테스트 결과 기록
