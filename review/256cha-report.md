# 256차 — 패션 size_table 실측 항목명 + 생활 step_card 조립 프레이밍 (프롬프트 문구 2건)

- 날짜: 2026-09-28
- API generate: **0** (DeepSeek/Replicate/Vision 호출 0, 신규 상품 생성 0, 전/후 응답 비교도 하지 않음 — 브리프 지시)
- 변경 파일: `lib/section-templates.ts` 한 파일, 2줄 (렌더러·스키마·가드 변경 없음)

## 결과 요약

| 항목 | 수정 | 파일:라인 | 특이사항 |
|---|---|---|---|
| 1 패션 size_table 실측 항목명 | 했음 | `lib/section-templates.ts:968` (`buildSectionLengthGuide`의 `의류/패션` 분기) | 기존 "지어내지 말 것 / 판매자 확인 필요" 문구는 그대로 두고 뒤에 추가만 함 |
| 2 생활 step_card 조립 프레이밍 | 했음 | `lib/section-templates.ts:845` (`HOME_FALLBACK`의 step_card note) | `HOME_FALLBACK`은 `생활용품`뿐 아니라 `기타`와 매핑 없는 카테고리의 폴백으로도 쓰임(`CATEGORY_TO_TEMPLATE`, :922–942). 조립 프레이밍은 "조립이 필요한 가구·구조물일 때만" 조건부라 그쪽에도 무해 |

## Diff

```diff
@@ -842,7 +842,7 @@ const HOME_FALLBACK: SlotDefinition[] = [
     slot: "step_card",
     type: "step_card",
     required: true,
-    note: "사용/관리 3단계. 각 단계에 실제 상품 사진(imageIndex) 배정, title 6자 내외 + body 1문장. STEP 태그는 렌더러가 자동 부착",
+    note: "사용/관리/조립 3단계 — 상품이 조립이 필요한 가구·구조물(선반·테이블·수납장 등)이면 조립 순서로, 그 외엔 사용/관리 순서로 채울 것. 입력에 없는 조립 방법을 지어내지 말고, 근거 없으면 일반적인 사용 흐름(개봉→배치→사용)으로 채움. 각 단계에 실제 상품 사진(imageIndex) 배정, title 6자 내외 + body 1문장. STEP 태그는 렌더러가 자동 부착",
   },
@@ -965,7 +965,7 @@ export function buildSectionLengthGuide(category: string): string {
   if (category === "의류/패션") {
-    ...\n- size_table: 호칭(S/M/L)만으로 cm을 지어내지 말 것. 실측이 입력에 없으면 "판매자 확인 필요".\n- fit_guide body: ...
+    ...\n- size_table: 호칭(S/M/L)만으로 cm을 지어내지 말 것. 실측이 입력에 없으면 "판매자 확인 필요". 의류 종류에 맞는 실측 항목명을 쓸 것 — 상의/아우터: 어깨너비·가슴단면·총장·소매길이, 하의: 허리단면·엉덩이단면·총장·밑위, 원피스: 어깨너비·가슴단면·총장. 입력에 없는 항목은 행 자체를 생략(전부 지어내지 말 것).\n- fit_guide body: ...
```

(패션 줄은 한 줄짜리 템플릿 문자열이라 바뀐 부분만 발췌. 나머지 글머리 항목은 한 글자도 안 바뀜.)

## 검증 (코드 레벨만)

- grep `사용/관리 3단계` → `lib/section-templates.ts`에서 0건 (옛 문구 제거 확인). 남은 건 `claude/` 브리프 원문뿐.
- grep `사용/관리/조립 3단계` → `:845` 1건.
- grep `size_table: 호칭` → `:968` 1건이고, 같은 줄에 `어깨너비·가슴단면·총장·소매길이` 포함.
- 다른 카테고리 step_card note(:88, :236, :404, :591, :704)는 변경 없음.
- 이 문자열들을 고정해 두는 테스트/스냅샷 없음(저장소 전체 grep).
- 실제 생성 결과가 어떻게 달라지는지는 확인하지 않음 — 새 generate 호출이 필요해 브리프대로 하지 않음. 다음 허가된 패션 상품(실측 입력 포함) / 조립형 가구 상품 생성 때 확인할 항목:
  - 패션: size_table 행 이름이 상의·하의별 실측 항목명으로 나오는지, 입력에 없는 항목 행이 빠지는지
  - 생활: 조립형 상품의 step_card가 조립 순서로 채워지는지, 입력에 조립 근거가 없으면 개봉→배치→사용 흐름으로 가는지

## 커밋

- `lib/section-templates.ts` + 이 보고서 1커밋. `.env*` 스테이징 없음, force-push 없음.
- Claude 측 파일(`pagzly-backlog-master-2026-09-15.md` 수정분, `claude/` 브리프들)은 스테이징하지 않음. 백로그 반영은 Claude 몫.
