# 114차 — 카피에 맞는 사진 배정 (AI 텍스트-이미지 매칭)

생성: 2026-09-04
전제: 104차에서 명시적으로 "하지 않는 것"으로 남겨둔 항목입니다. 프로가 "AI가 파악해서 글자에 맞는 사진으로 꾸며주는 것까지 해야 한다, 후커블 따라잡아야 한다"고 재요청해 지금 설계·구현합니다.

---

## 1. 현재 문제 (104차에서 확인한 근본 원인, 지금도 유효)

`lib/assign-section-images.ts`의 `preferForSlot()`(라인 132~)은 **섹션의 실제 문구(heading/body)를 전혀 보지 않습니다.** 역할(`role`: hero/detail/lifestyle/package/other)과 슬롯 이름만으로 고정 매핑됩니다.

가장 큰 구조적 문제는 `DETAIL_SLOT_PRIORITY`(라인 10~21 부근) — `ingredient_highlight`, `texture_feel`, `detail_zoom`, `macro_detail`, `ingredient_story` 등 **여러 슬롯이 전부 같은 "detail" role 인덱스 하나를 두고 경쟁**하고, 순서상 뒤로 밀린 슬롯은 사실상 랜덤/최소사용 폴백으로 처리됩니다. 이 경쟁을 텍스트 의미로 갈라주는 게 이번 작업의 핵심입니다.

---

## 2. 설계 원칙 — 비용 0원, 환각 금지, 항상 안전한 폴백

### 2-1. 새 API 호출을 추가하지 마세요 ★가장 중요

이미지 분석은 `app/api/generate/route.ts`의 `analyzeImagesWithClaude` 단일 호출에서 `{ roles, analysis }`를 반환합니다(106차에서 스키마를 `roles` 우선으로 재정렬함). `lib/image-roles.ts`의 `VisionImageRoleJudgment`에는 이미 `reason?: string` 필드가 있습니다(라인 149-154).

**같은 호출의 프롬프트만 확장**해서 각 이미지 판정에 `tags: string[]`(짧은 키워드 2~4개, 예: `["texture", "swatch", "close-up"]` 또는 한글 `["질감", "발림성", "클로즈업"]`)을 추가로 요청하세요. 새 Replicate/Claude 호출이 아니라 **같은 호출의 응답 스키마를 넓히는 것**이므로 추가 비용이 없습니다.

- `parseVisionImageRoles`(`lib/image-roles.ts:279`)에 `tags` 파싱을 추가하세요. 없거나 형식이 이상하면 빈 배열로 안전하게 처리(기존 `role`/`confidence` 파싱과 동일한 방어적 스타일 유지).
- `lib/parse-image-analysis-response.ts`의 salvage 경로(JSON 잘림 복구)에서도 `tags`가 없을 수 있다는 걸 전제로 하세요 — 없으면 그냥 빈 배열, 매칭 로직은 이후 폴백으로 처리됩니다.

### 2-2. 매칭은 "타이브레이커"로만 — 역할 게이팅을 넘어서지 마세요

**절대 규칙**: 텍스트 매칭 점수가 아무리 높아도, `role`이 슬롯과 맞지 않는 이미지를 끌어오면 안 됩니다. 예를 들어 카피에 "성분"이라는 단어가 있다고 `package` role 이미지를 `ingredient_highlight`에 배정하면 안 됩니다.

즉, 이 작업은 **기존 role 기반 후보 집합 안에서만** 순위를 매기는 2차 스코어입니다:

```
1차: 기존 로직대로 role prefer로 후보군을 좁힌다 (변경 없음)
2차: 후보가 여러 개(=DETAIL_SLOT_PRIORITY 경쟁 상황)면,
     섹션 heading+body 텍스트와 각 후보의 tags/reason을
     키워드 겹침으로 점수화해 가장 높은 것을 선택
3차: tags가 전부 비어있거나 점수가 모두 0이면 → 기존 DETAIL_SLOT_PRIORITY 순서 폴백 (지금 동작 그대로, 회귀 없음)
```

### 2-3. 순수 함수로 분리하세요

`lib/copy-image-match.ts`(신규) 같은 파일에 아래 시그니처의 순수 함수를 만드세요. Vision 응답·DB·네트워크에 의존하지 않아야 단위 테스트가 가능합니다.

```ts
scoreImageForCopy(params: {
  sectionText: string;        // heading + " " + body 합친 것
  candidateTags: string[];    // 해당 이미지의 Vision tags
  candidateReason?: string;   // reason도 보조 신호로 사용 가능
}): number
```

- 한국어 키워드 겹침이므로 형태소 분석기를 새로 붙이지 말고, 간단한 부분 문자열/토큰 포함 매칭으로 충분합니다(과설계 금지). 예: 태그가 sectionText 안에 부분 문자열로 등장하면 가점.
- 동점 처리: 기존 `imageHashes` 인접 유사도 페널티(104차 A-3, `assignDistinctSectionImages` 라인 472-481)와 **함께** 작동해야 합니다 — 텍스트 점수로 고른 후보가 직전 섹션과 시각적으로 너무 비슷하면 그 페널티가 여전히 적용되어야 합니다. 순서: role 필터 → 텍스트 점수 → (동점이면) 유사도 페널티.

### 2-4. `heading`/`body` 필드 위치

`lib/types/generate.ts`에 섹션 타입별로 `heading`/`body` 필드가 이미 있습니다(예: 라인 167-168, 212-213 등). `assignDistinctSectionImages`가 섹션 객체를 순회하는 시점에 이미 카피가 채워져 있는지(생성 파이프라인에서 카피 생성이 이미지 배정보다 먼저 끝나는지) 먼저 확인하세요. **만약 카피가 이미지 배정 이후에 생성된다면 이 기능 자체가 불가능**하므로, 파이프라인 순서부터 route.ts에서 확인하고 필요 시 순서 조정 방안을 먼저 보고해 주세요(코드를 만들기 전에).

---

## 3. 하지 않는 것

- 상품 생성 실행 금지. `TEST_MODE=true` 유지.
- 새 API/모델 호출 추가 금지(2-1) — 기존 Vision 호출 스키마 확장만.
- role 게이팅을 텍스트 점수로 우회하는 것 금지(2-2) — 매칭은 항상 후보 집합 안에서만.
- 형태소 분석기 등 새 의존성 추가 금지 — 단순 키워드 겹침으로 충분합니다.
- `ingredient_highlight`/`texture_feel` 등에 적합한 사진이 애초에 없는 업로드 세트(모두 병 정면샷 등)까지 억지로 매칭하려 하지 마세요. 그 경우는 104차에서 이미 다룬 `text_only` 폴백이 정상 동작입니다 — 이번 작업의 대상이 아닙니다.

## 4. 검증 방법 (무비용)

- `npx tsc --noEmit` 0건, 기존 스모크(54·99·105·107·108·110·111차) PASS 유지.
- `scoreImageForCopy` 단위 테스트: (a) 섹션 텍스트에 "텍스처"/"발림성" 포함 + 후보 A 태그가 `["texture","질감"]`, 후보 B 태그가 `["package","박스"]` → A가 더 높은 점수인지. (b) 태그 전부 빈 배열 → 모든 후보 0점, 폴백 경로로 빠지는지.
- `assignDistinctSectionImages` 통합 테스트: `DETAIL_SLOT_PRIORITY` 경쟁 상황을 픽스처로 만들어(예: detail role 이미지 3장, 태그 다르게 부여) 텍스트 매칭 결과가 슬롯별로 달라지는지, role 불일치 이미지는 절대 선택되지 않는지.
- 105차 replay 스크립트를 다시 돌려 **tags가 전부 없는 기존 데이터**에서 결과가 바뀌지 않는지(회귀 없음) 확인 — 이게 제일 중요합니다.
- Vision 프롬프트 dry-run 덤프로 `tags` 요청 문구가 실제로 들어갔는지 확인.

## 5. 완료 보고 체크리스트

- [ ] Vision 프롬프트에 `tags` 필드 추가 (새 호출 없음, 기존 호출 스키마만 확장)
- [ ] `parseVisionImageRoles`에 `tags` 파싱 + 방어적 처리
- [ ] `lib/copy-image-match.ts` 순수 함수 + 단위 테스트
- [ ] role 게이팅 안에서만 타이브레이커로 작동 확인
- [ ] imageHashes 인접 유사도 페널티와의 상호작용 확인
- [ ] 카피-배정 파이프라인 순서 확인 결과 (문제 있으면 사전 보고)
- [ ] tags 없는 기존 데이터 회귀 없음 확인
- [ ] `npx tsc --noEmit` 0건
