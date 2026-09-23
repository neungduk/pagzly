# 212차 — 커서 실행 결과 검증 (Claude 코드 대조)

생성: 2026-09-17 · 검증자: Claude (device bridge로 PC 실제 파일 직접 대조 + 독립 샌드박스
재구현, 신규 생성 없음, $0)

## 검증 방법

212차 브리프(`cursor_brief_212cha_spec_table_size_hint_wiring.md`)에서 지시한
"`productSizeHint`를 spec_table 보강 로직에 폴백으로 배선"을 커서가 완료 보고
(`review/212cha-report.md`)했다고 알려와, 보고 내용을 그대로 믿지 않고 `device_stage_files`로
PC의 실제 파일(`lib/enrich-product-sections.ts`, `app/api/generate/route.ts`,
`scripts/212cha-spec-table-size-hint-verify.ts`)을 가져와 직접 대조했다.

## 대조 결과 — 보고와 실제 코드 일치

- **`lib/enrich-product-sections.ts` 5곳 diff 전부 확인**: (1) `SPEC_SKELETONS["전자/가전"]`에
  "모델명" 다음 "크기·용량·형태"(`match: /크기|용량|규격|사이즈|형태/`) 행이 정확히 추가됨.
  (2) `resolveSkeletonValue()`에 `SIZE_HINT_LABELS` Set(용량/내용량/사이즈/규격/크기·용량·형태)과
  `productSizeHint` 폴백 분기가 **`existing` 매칭 확인 직후, 브랜드 처리 바로 다음**에 정확한
  순서로 배선됨 — 기존 값이 있으면 먼저 그 값을 반환하는 우선순위 구조가 그대로 유지됨.
  (3~5) `mergeSpecRows`/`enrichSpecTableSection`/`enrichSectionsWithProductMetadata` 세
  함수의 `meta` 타입 시그니처 전부에 `productSizeHint?: string | null;` 한 줄씩 추가됨 — 값
  전달 로직은 메타 객체를 통째로 넘기는 기존 구조라 타입만 맞추면 자동 배선되는데, 실제로
  그렇게만 되어 있고 불필요한 추가 로직이 끼어들지 않음을 확인.
- **`app/api/generate/route.ts` 1715행**: `enrichSectionsWithProductMetadata` 호출부 meta
  객체 리터럴에 `productSizeHint: body.productSizeHint,` 한 줄이 정확한 위치(keyFeatures
  다음)에 추가됨. `body`가 `ProductInput` 타입이라 `productSizeHint` 필드가 이미 존재해
  캐스팅 불필요 — 브리프 지시대로 다른 코드 변경 없음.
- **카테고리 매핑 별도 검증**: 검증 스크립트가 실제 폼 카테고리 문자열 `"전자제품"`을 쓰는데,
  `lib/section-templates.ts:933`의 `resolveTemplateCategory()`에 `"전자제품": "전자/가전"`
  별칭 매핑이 이미 존재함을 직접 grep으로 확인 — 203차 때 있었던 "템플릿 키 vs 실제 폼 값"
  혼동 실수가 이번엔 없었음.
- **부작용 범위 확인**: `lib/` 디렉토리 전체 목록을 대조해 이번 라운드에서 mtime이 바뀐 파일이
  `enrich-product-sections.ts` 단 하나뿐임을 확인 — `photo-composite.ts`(1789446527487)·
  `photo-enhance.ts`(1789446548047) 등 무관 파일 전부 불변. 신규 파일은
  `scripts/212cha-spec-table-size-hint-verify.ts` 하나만 추가됨.
- **독립 재구현 검증(211차보다 한 단계 더 엄격하게 수행)**: 이번엔 커서의 검증 스크립트
  로직을 읽기만 한 게 아니라, `resolveSkeletonValue`/`mergeSpecRows` 로직을 별도 Node
  샌드박스(`/tmp/212check/check.mjs`)에 처음부터 다시 타이핑해 Cursor 코드와 별개로
  구현한 뒤, 보고서와 동일한 5개 케이스를 직접 실행했다:
  1. 전자제품 + hint → "크기·용량·형태" = hint 값 — **ok**
  2. 화장품/뷰티 + hint → "용량" = hint 값 — **ok**
  3. hint 없음(null) → 플레이스홀더("판매자 확인 필요") 그대로 — **ok** (회귀 없음)
  4. 기존 "용량: 500mL" 행이 있는 경우 → hint로 덮어쓰지 않고 500mL 유지 — **ok** (우선순위)
  5. 인증정보 미입력 시 KC 인증 행 자체 생략 — **ok** (기존 132~137행 특수분기 회귀 없음)
  5개 전부 독립 재구현 코드에서도 동일하게 통과 — 보고서의 "pass" 5줄이 실제 로직 동작과
  일치함을 코드 읽기가 아니라 실행으로 재확인했다.

## 정직성 평가

보고서가 짧고(diff 요약 + 6줄 검증 표) 과장 없이 딱 브리프가 요구한 범위만 다뤘다. 211차와
달리 이번엔 브리프에 없던 추가 방어 코드도 넣지 않고 정확히 지시된 5곳만 수정 — 최소
변경 원칙이 잘 지켜졌다.

## 결론

212차는 브리프대로 정확히 완료됐고 보고 내용이 실제 코드와 전부 일치. 11번가 실사에서
발견한 "판매자가 이미 입력한 productSizeHint가 법정 고시 표(spec_table)에 전달되지 않던"
배선 누락이 코드로 해소됐고, 독립 샌드박스 재구현으로 로직 자체의 정확성도 재확인했다.
백로그 마스터 §3→§1 이동 완료(완료됨 52건).

## 213차 후보

- §3가 다시 비었으므로 다음은 사용자 지정 또는 새 크롤링 라운드 필요.
- (선택) 이번에 발견한 "AI가 생성한 rows에 매칭되는 값이 없을 때만 셀러 입력을 폴백으로
  쓰는" 패턴이 다른 섹션(예: highlight_box, comparison_chart)에도 적용될 여지가 있는지는
  아직 조사하지 않음 — 억지 구현 금지 원칙상 구체적 증거 없이 확장하지 않음.
