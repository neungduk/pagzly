# 506차 — "고쳐 주는" 점검기: 수정안 엔진 + 예외 규칙 + 문구 붙여넣기 + 다시 점검 (한국·미국)

> 순서: **505차 완료 후** 진행. 507차(UI 개편)는 이 차수의 데이터 구조를 쓰므로 506 → 507 순서를 지킨다.

## 0. 절대 규칙
1. 유료 호출(AI·OCR) 금지. Production·main push 금지. 코드 삭제 금지. 상세페이지·결제 코드 변경 금지.
2. **규칙 데이터 파일(`review/data/*.json`) 내용 수정 금지.** 데이터가 틀렸거나 부족하면 고치지 말고 보고서 "데이터 문제"에 적는다.
3. 화면·응답 어디에도 "위반입니다", "적법합니다", "완벽", "보장", "법에 걸리지 않습니다" 같은 단정 금지. 수정안은 항상 "예시"이며 "이대로 쓰면 문제없다"는 뜻의 문구 금지.
4. 새 판정·새 대체 문구를 코드에 직접 쓰지 않는다. 판정은 규칙 데이터에서, 대체 문구는 `rewrite-map-*`·`required-templates`에서만 가져온다. (코드에 한글/영문 문구 하드코딩 금지 — UI 라벨 제외)
5. `review/506-targets.md`에 **코드 작성 전** 목표·설계 요약을 적는다. 파일은 Read 후에만 Edit/Write.
6. 마무리 전 전부 통과: `npx tsc --noEmit`, `npm run build`, `npm run validate:rules`, `npm run regression:label-check`. 하나라도 실패하면 보고서 맨 위에 적고 "완료"라고 쓰지 않는다.
7. 커밋 최대 6개(기능 단위). 마지막에 `git log -3 --oneline`, `git status -sb`로 push 확인 후 해시를 보고서에 기재. 보고서 `review/506cha-report.md`, 맨 위는 "확인하지 못한 항목".

## 1. 목표 (사용자가 얻는 것)
지금은 "무엇이 문제인지"만 알려 준다. 이번 차수 후에는 **각 문제마다 "이렇게 고치세요"의 구체 문구**를 주고, 사용자가 고친 문구를 **붙여넣어 바로 다시 점검**해 문제 수가 줄어드는 것을 확인할 수 있어야 한다. 대상은 화장품, 시장은 한국·미국.

## 2. 새 데이터 (기획 담당 작성, 레포에 있음 — 읽기 전용)
| 파일 | 내용 |
|---|---|
| `rewrite-map-kr_draft_v0.1.json` | 한국 광고 항목(MFDS-*)별 `action`(delete/soften/functional_only/functional_or_evidence/evidence/fix)과 `alternatives[]`(text, basis, kind) |
| `rewrite-map-us_draft_v0.1.json` | 미국 광고 항목(USAD-*)별 같은 구조 |
| `ad-exceptions-kr_draft_v0.1.json` | 식약처 지침 비고의 **예외 조건** 10개(같은 문장 안 조건 검사) |
| `required-templates_draft_v0.1.json` | 누락된 필수 항목을 채울 **빈칸 템플릿**(KR 7, US 6) |
각 파일의 `meta.usage`/`meta.rule`을 먼저 읽고 그대로 따른다.

## 3. 구현 항목

### A. 결과 구조 확장 (서버 응답·저장 공통)
각 finding에 아래 필드를 추가한다(없으면 생략, 빈 문자열 금지).
```ts
fix?: {
  kind: "fill" | "replace" | "delete" | "evidence" | "functional_only" | "manual";
  headline: string;        // 데이터의 fix_ko 또는 action 설명(meta.actions)
  templates?: string[];    // required-templates 의 template (fill)
  alternatives?: { text: string; basis: string; kind: "general"|"guideline_exception" }[]; // rewrite-map
  note?: string;           // rewrite-map item.note / exception text
};
evidence?: { found: string; sentence: string; page?: number }[]; // 찾은 표현과 그 문장(최대 3)
basis?: { law: string; source: string };  // 규칙의 law_basis/legal_basis, source (화면 "근거")
exception?: { id: string; result: string; text: string }; // ad-exceptions 적용 시
```
- 기존 필드·기존 화면은 깨지지 않게(하위 호환). 저장(`label_check_runs.findings`)에는 `evidence.sentence`·`found` 등 **원문 조각을 저장하지 않는다**(495차 약속 유지) — 저장 payload 시험으로 확인.
- 한국 광고: `rewrite-map-kr`의 `target_id`로 매핑. 미국 광고: `rewrite-map-us`. 필수 표시항목 누락: `required-templates`의 `rule_id`로 매핑. 매핑이 없는 finding은 기존 `fix_ko`만(`kind: manual`).

### B. 예외 규칙 엔진 (한국 광고)
- 광고 스캐너가 `target_id` 항목의 패턴을 찾으면, **그 일치가 포함된 문장**에서 `ad-exceptions-kr` 조건을 검사한다. 문장 경계: 마침표·느낌표·물음표·줄바꿈.
- `requires_all_in_sentence` 전부 포함 / `requires_any_in_sentence` 하나 이상 포함 / `forbid_in_sentence` 미포함 / `pattern` 또는 `pattern_any` 일치.
- `result` 처리:
  - `not_applicable` → 그 일치는 지적에서 제외.
  - `exception_possible` → 상태를 한 단계 낮춰 "확인 필요"로 두고 `exception.text`를 표시. `product_condition`이 있으면 제품 유형 입력이 그 유형일 때만 낮추고, 유형 미입력이면 낮추지 않되 "색조 제품이면 예외에 해당할 수 있어요"를 표시.
  - `evidence_required` → `fix.kind: evidence`, 실증 안내.
  - `needs_disclaimer` → `fix.kind: fill`, 병기 문구(해당 rewrite-map alternatives) 안내.
- 한 항목 안에서 일치가 여러 개면 **일치별로** 예외를 판단하고, 예외가 아닌 일치가 하나라도 남으면 항목 상태는 그대로 둔다.
- 화면 문구는 "예외에 해당할 수 있어요"까지만(확정 금지).

### C. 문구 붙여넣기 입력(텍스트 모드)
- PDF 없이 **문구만 붙여넣어** 점검하는 경로를 추가한다. API: 기존 JSON 경로(`ExtractedLabelPayload`)를 재사용 — 텍스트를 한 쪽짜리 payload(글자 크기 정보 없음)로 만들어 `runLabelCheckFromExtracted`에 넣는다.
- 텍스트 모드 옵션 `scope`: `"ad_only"`(광고 문구만 — 필수 표시항목 판정을 하지 않음) / `"full"`(라벨 전체 문구). 기본 `ad_only`. `ad_only`에서는 필수 항목·글자 크기·주의사항 누락 판정을 **실행하지 않고** 결과에 "광고 문구만 점검했어요"를 표시(요약 수치에서도 제외).
- 상한: 20,000자. 초과 → `TOO_LARGE`. 빈 입력·공백만 → `NO_FILE` 계열 안내. 레이트 리밋은 PDF와 같은 한도를 공유.
- 글자 크기 판정은 "확인 불가"가 아니라 **판정 대상에서 제외**(텍스트엔 크기가 없음).

### D. 다시 점검(재점검 루프)
- 결과 화면에서 "고친 문구 붙여넣고 다시 점검" → C의 텍스트 모드(직전과 같은 market·옵션·scope 유지)로 재실행하고, **직전 결과와 비교**해 `해결됨 / 남음 / 새로 생김`을 계산해 응답에 포함(`compare: {resolved: string[], remaining: string[], added: string[]}` — 항목 식별은 규칙 id + 항목 제목).
- 비교 기준 직전 결과는 클라이언트가 보낸 요약(id 목록)만 사용(서버 무상태). id 목록 길이·형식 검증.
- 화면에는 "2개 해결, 1개 남음" 형식. 0개 남아도 "문제 없음이 확인됐습니다" 같은 단정 금지 → "이번 점검에서 발견된 항목이 없어요. 최종 확인은 직접 하셔야 합니다."(이 문구는 UI 라벨로 허용).

### E. "수정안 모두 복사" 내용 생성
- 서버 또는 공용 함수 `buildFixSheet(result)`가 아래 형식의 **일반 텍스트**를 만든다(클립보드용). 순서: 고칠 것 → 확인할 것.
```
[제품명 또는 "점검 결과"] · 한국 기준 · 2026-11-10
1. (고칠 것) 사용기한이 보이지 않아요
   넣을 문구(예시): 사용기한: [YYYY.MM.DD]까지
2. (고칠 것) 의약품처럼 보일 수 있는 표현 — "피부 재생"
   바꿀 문구(예시): 피부를 매끄럽게 가꿔줍니다
   근거: 식약처 화장품 표시·광고 관리 지침 별표 1
※ 참고용 사전 점검이며 법적 판단이 아닙니다.
```
- 대괄호 빈칸은 그대로 둔다(사용자가 채움). alternatives는 항목당 최대 2개.

### F. 미국 성분표·표시 보강 (코드로 가능한 것만, 데이터 범위 내)
- `Ingredients:` 구간 파싱: 콤마 분리, 괄호 안 콤마 보호, 줄바꿈 하이픈 결합. 결과에 성분 개수 표시.
- 판정(모두 "확인 필요" 수준, 데이터 `us_label_rules`의 US-006 설명 범위 내): ① 구간이 비어 있음 ② 한글 성분명이 섞임(US-007과 연결) ③ "and other ingredients" 사용 시 "영업비밀 면제 승인 여부 확인" 안내(US-006 설명에 있는 내용만) ④ 글자 높이(1/16인치≈4.5pt, 1/32인치≈2.25pt)는 크기 추출 가능 시에만.
- **하지 않는 것**(데이터 없음 → 보고서에 "미구현, 데이터 필요"로 기재): INCI 명칭 유효성, 색소(CI/FD&C) 허용 여부, 금지 성분, 함량 순서 검증, 주(州)법, OTC 약품.
- 미국 필수 항목 누락에도 A의 `fill` 템플릿을 연결.

### G. 한국 성분표 보강 (데이터 범위 내)
- 전성분 구간 파싱 정리(콤마·가운뎃점·줄바꿈). 판정: ① "향료"만 있고 알레르기 25종 표기 없음 → 기존 안내 유지 + 템플릿(`예: 향료, 리모넨, 리날룰` 형태는 `fix-suggestions` 문구 사용) ② 주의사항 유발 성분 발견 시(504차) 해당 문구를 `fix.templates`로 제공(`kr-cautions`의 `required_text_ko`) ③ "기타 성분" 표기 발견 시 KR-ADD-009 안내 ④ 영문만 있는 전성분(한글 0) → "표준 국문 성분명 확인"(KR-LBL-023) 안내.
- **하지 않는 것**: 성분명 표준 사전 대조, 배합금지·한도 원료 판정, 함량 순서 검증(데이터 없음 → 보고).

## 4. 시험 — `scripts/regression/label-check-506.ts` (+ 스위트 목록 등록)
1. **대체 문구 자기 검증(필수)**: `rewrite-map-kr`의 `kind: general` 대체 문구 전부를 텍스트 모드(ad_only, KR)로 넣어 광고 지적 **0건**. `rewrite-map-us` 전부를 US로 넣어 0건. `kind: guideline_exception`은 각각 해당 예외 `result`로 처리되는지. 괄호 안 설명(예: "(색조 제품)")은 제거하고 본문만 넣는다. 하나라도 실패하면 코드를 바꾸지 말고 **데이터 문제로 보고**.
2. 예외 10개 각각: 예외 충족 문장 / 미충족 문장 한 쌍씩(예: "보습을 통해 건조로 인한 가려움을 일시적으로 완화" vs "가려움을 없애줍니다"; "피부와 모공의 노폐물" vs "체내 노폐물 배출"; "식물 엑소좀" vs "인체 줄기세포 엑소좀"; 색조 유형 입력 유/무).
3. 텍스트 모드: ad_only에서 필수 항목 지적 0·요약 제외, full에서 기존과 동일 판정. 20,001자 → TOO_LARGE. 빈 입력.
4. 재점검 비교: 시안 A 문구 → 문제 2개를 고친 문구로 재점검 → `resolved` 2, `remaining` 나머지, `added` 0.
5. `buildFixSheet` 스냅숏(시안 A, us2_missing).
6. 저장 payload에 `sentence`/`found` 원문 없음.
7. 미국·한국 성분표 파싱 단위 시험(괄호 콤마, 줄바꿈 하이픈, 가운뎃점).
8. 기존 회귀 전부 유지(483~505). 정상 시안(i1, i5, sample C, us1)에서 새 지적 0 또는 사유 기재.

## 5. 보고서에 반드시 포함
- 확인하지 못한 항목(브라우저 실측 등).
- finding 구조 변경 전/후 예시 JSON 1개(시안 A의 광고 항목).
- 예외 10개 시험 결과표, 대체 문구 자기 검증 결과(총 n개 중 통과 n개).
- 미구현·데이터 필요 목록(F, G의 "하지 않는 것" 포함).
- 데이터 문제(있으면 파일·id·내용).
- 커밋 해시, push 확인.
