# 138차 — 섹션별 "설득 프레임워크 라벨" (판매자 전용, 신규 유료 API 호출 없음)

생성: 2026-09-07

## 배경 (사용자 원문)

> "후커블 과 더불어서 AI 상세페이지 만드는 기업들 견본들 싹 훑어보고 학습해서 우리 로컬호스트 들어가서
> 최근에 만든 우리 상세페이지와 비교 하고 그동안 우리가 했던것들까지 연습해서 업그레이드할 지시사항
> 만들어줘"

이번 라운드 착수 전에 실제로 조사·확인한 것들을 먼저 정리합니다(지어내지 않았다는 근거).

## 0. 조사 복기 — 뭘 봤고, 뭘 이미 반영했고, 뭘 채택하지 않기로 했는가

### 0.1 오늘 새로 조사한 경쟁사 (Claude-in-Chrome + 웹서치, 실제 자료)
- **후커블**: 기존 131차에서 이미 실제 랜딩 스크린샷까지 확보(`claude/marketplace_crawl_findings_2026-09-07.md`). 오늘은 그 문서를 재확인만 함.
- **드랩아트(draph.art)** — 공식 블로그(`draph.art/blog/news/detail-page-maker-Launching`) 전문 확인:
  - 섹션 구성: 인트로 → 소구점 요약 → 소구점 상세 → 리뷰/후기 → 이런 고민 → 혜택/이벤트 → 추천 대상 → 이미지 갤러리 → 아웃트로. **Pagzly의 기존 21개 섹션 타입과 구조적으로 거의 대응됨** — 새로 배울 구조는 아님.
  - "대화하듯 실시간 수정"(예: "제목을 더 크게 만들어줘") → **Pagzly는 134차 `SectionPatchChat`으로 이미 동일 기능 보유.**
  - 모델이 제품을 사용하는 이미지 자동 생성 → **Pagzly는 64~89차에 걸쳐 라이프스타일 합성(손 배치·그립·이음새 보정)을 이미 훨씬 깊게 파고든 상태.** 오히려 우리가 앞서 있음.
  - ⚠️ **주의(채택 금지 확인)**: 리뷰 파일이 없으면 "다른 사용자의 리뷰나 후기도 자동으로 만들어서 추가", 혜택 입력이 없으면 "자동으로 내용이 입력". 즉 드랩아트는 **가짜 리뷰·가짜 이벤트를 기본값으로 지어냄** — Pagzly의 "입력 없는 리뷰/통계/혜택 날조 금지" 원칙과 정면 충돌. 그대로 두고, 이번에도 채택하지 않음(기록만).
- **GENCY(젠시)**: 패션 특화, 전면/후면/디테일샷 자동 분류·배치. → **Pagzly의 기존 `gallery` 섹션(다중 이미지 슬롯)으로 이미 커버됨.** 신규 작업 불필요.
- 그 외(제디터/키위스냅/셀러캔버스/카페24 에디봇/뤼튼/미리캔버스/크리에이지 등)는 템플릿·카피 중심 범용 툴로, Pagzly가 이미 하고 있는 "입력 근거 기반 결정론적 카피/수치"보다 구조적으로 얕음 — 참고할 신규 패턴 없음.

### 0.2 로컬호스트 실제 확인 (Claude-in-Chrome으로 `localhost:3000` 직접 접속)
- 최근 실제 생성 내역(글로위스트 드림글로우 카멜리아 에센스 미스트, 9/3 생성, 25섹션, 실비용 $0.3597) 열람.
- 히어로 카피·"혜택·신뢰" 뱃지 스트립(35mL/카멜리아 오일/미세 분사 등 4개 pill)·브랜드 스토리 카드까지 육안 확인 — 시각 완성도 자체는 경쟁사 블로그에 나온 목업 수준 이상. **디자인 갭은 없음.**
- 이 상품엔 리뷰 파일이 없어 135~137차 기능(매칭 배지·근거 비교 차트)은 노출되지 않음 — 정상 동작(리뷰 없으면 생략).

### 0.3 우리 자체 백로그 재점검 — 이미 끝난 것 확인
131차 리포트에 "코드 확인 필요"로 남겨뒀던 두 항목을 이번에 직접 코드로 확인:
- **전자제품 KC 인증정보 노출**: `lib/enrich-product-sections.ts`에 이미 `"KC 인증"` 스켈레톤 행 + `parseCertificationTokens()`로 입력 없으면 행 자체 생략(공란 금지) 로직이 구현돼 있음 — **이미 완료됨, 이번 라운드 대상 아님.**
- **pain-point 헤드라인 카피**("불편함→해결" 대비 구조): `lib/copy-orchestrator/deepseek-copy.ts`에 이미 "problemStatement/solutionStatement... 대구를 이루게" + "근거 없으면 억지로 문제 지어내지 말 것" 지침이 있음 — **이미 완료됨.**

→ 두 항목 다 이미 반영돼 있어 이번 브리프에서 제외. 새로 남는 것은 아래 한 가지뿐입니다.

## 1. 남은 유일한 gap — 후커블의 "설득 프레임워크 투명성" (판매자 전용 UI, 안전하게 재해석)

`marketplace_crawl_findings_2026-09-07.md` §3.1: 후커블은 생성된 섹션 썸네일에 **"인증/비교/요약/문제제기/반박 제거/소구점 구체화/사회적 증거/나열"** 라벨을 붙여, "AI가 그냥 만든 게 아니라 검증된 판매 공식을 섹션마다 적용했다"는 걸 **판매자에게** 투명하게 보여줍니다. 이게 후커블이 실제로 파는 신뢰 요소입니다. 131차 때 "코드 변경 없이 기록만"으로 미뤄뒀던 항목인데, 이번에 정식으로 작게 반영합니다.

**중요한 재해석 — 그대로 베끼지 않는 지점**:
- 후커블의 "반박 제거"는 두려움 조성 프레이밍이라 이미 금지(§3.2) — 이번엔 **"질문 대응"** 같은 중립적 표현만 씁니다.
- 이 라벨은 **구매자가 보는 상세페이지(export HTML, 공개 렌더러)에는 절대 노출하지 않습니다.** 후커블도 이걸 쇼핑몰 방문객이 아니라 **판매자 본인**에게(자사 SaaS 대시보드에서) 보여주는 겁니다. Pagzly에서도 판매자가 보는 **에디터 화면(섹션 목록 사이드바)에만** 작은 배지로 보여줍니다.
- 라벨은 **섹션 타입(type)에 대한 고정된 1:1 매핑표**로만 정합니다 — AI가 라벨을 새로 짓거나 판단하지 않습니다. 그래서 지어내기 원칙과 전혀 충돌하지 않고, 신규 API 호출도 0원입니다.

## A. 라벨 매핑 상수 (신규 파일, 서버 상수 — LLM 미개입)

`lib/section-persuasion-labels.ts` 신규 생성:

```ts
import type { DetailSection } from "@/lib/types/generate";

/** 섹션 type → 판매자 전용 "설득 프레임워크" 라벨. 고정 매핑, AI 미개입.
 *  후커블의 페르수전 태그 시스템을 참고하되, 두려움 조성 표현("반박 제거" 등)은 배제. */
export const SECTION_FRAMEWORK_LABEL: Partial<Record<DetailSection["type"], string>> = {
  hero: "후킹",
  checklist: "소구점 요약",
  image_text: "소구점 상세",
  highlight_box: "핵심 강조",
  step_card: "단계 설명",
  usage_steps: "사용 안내",
  spec_table: "신뢰 정보",
  comparison_table: "스펙 비교",
  comparison_chart: "근거 비교",
  stat_infographic: "수치 근거",
  review_highlight: "사회적 증거",
  faq: "질문 대응",
  target_persona: "타겟 공감",
  brand_story: "브랜드 서사",
  color_variation: "옵션 안내",
  illustration_banner: "컨셉 연출",
  gallery: "비주얼 강화",
  caution: "안전 고지",
  ai_disclosure: "투명 고지",
  custom_gif: "동적 연출",
  cta_price: "구매 유도",
  // canvas: 사용자 자유 편집 영역이라 라벨 없음(의도적 생략)
};

export function getSectionFrameworkLabel(type: DetailSection["type"]): string | undefined {
  return SECTION_FRAMEWORK_LABEL[type];
}
```

- 이 표에 없는 타입(`canvas`)은 라벨을 붙이지 않습니다 — 억지로 채우지 마세요.
- 라벨 문구를 바꾸고 싶으면 이 상수만 고치면 됨 — 렌더러 코드는 건드릴 필요 없음.

## B. 판매자 에디터에만 배지로 노출

`components/DetailStructureSidebar.tsx`(134차에서 이미 A안 톤으로 갱신된 그 파일)의 각 섹션 행에, 기존 "섹션 인덱스 배지" 옆에 **아주 작은 텍스트 배지**로 `getSectionFrameworkLabel(section.type)` 값을 추가하세요.

- 스타일은 134차가 이미 쓴 브랜드 토큰만 사용: `text-slate-blue`, `bg-slate-blue/10` 또는 `border-line`, 폰트는 10~11px 수준의 보조 정보로(섹션 제목보다 확실히 작고 옅게) — 목록이 시끄러워지면 안 됩니다.
- `data-testid="section-framework-badge"` 부여.
- 라벨이 없는 타입(`canvas`)은 배지 자체를 렌더링하지 않습니다.
- **`components/SectionPatchChat.tsx`, `DetailToolsAccordion.tsx`, `app/create/result/page.tsx`, `export-detail-html.ts`, 구매자용 `DetailSectionRenderer.tsx`(공개 렌더러)는 이번 라운드에서 건드리지 않습니다** — 이 라벨은 오직 판매자 에디터의 섹션 목록 사이드바 한 곳에만.

## 검증

- 스크린샷: 섹션 목록에 라벨 배지가 붙은 상태 1장(가급적 여러 섹션 타입이 섞인 실제 생성물로).
- `canvas` 타입 섹션이 있는 케이스에서 그 섹션만 배지가 없는 것 확인 1건.
- 손검산표(`review/138cha-label-map.txt`): 21개 섹션 타입 전체를 나열하고 각각 매핑된 라벨(또는 "라벨 없음") 기록.
- **구매자용 export HTML/공개 렌더러에는 이 라벨이 전혀 나타나지 않는지 grep으로 확인**(`export-detail-html.ts`, 공개 `DetailSectionRenderer.tsx`의 buyer 렌더 경로에 `SECTION_FRAMEWORK_LABEL` import가 없어야 함) — 이게 이번 라운드에서 제일 중요한 검증 포인트입니다.
- `tsc --noEmit` EXIT_CODE=0, `git diff --stat`.

## 하지 않는 것

- 구매자가 보는 상세페이지(공개 렌더러·export HTML)에 라벨 노출 금지 — 판매자 에디터 전용.
- "반박 제거" 같은 두려움 조성 표현 사용 금지 — 중립적 라벨만.
- AI가 라벨을 판단/생성하지 않음 — 고정 매핑 상수만 사용, 신규 API 호출 0원.
- `section-templates.ts`의 슬롯 순서·타입 변경 금지.
- 134차가 정리한 다른 UI 요소(칩, 톤, 배경색 등) 변경 금지 — 이번엔 배지 1개만 추가.
- 드랩아트 방식의 "리뷰/이벤트 자동 지어내기"는 이번에도, 앞으로도 채택하지 않음.

## 완료 체크리스트

- [ ] A: `lib/section-persuasion-labels.ts` 신규 생성 (21개 타입 중 20개 매핑, `canvas` 제외)
- [ ] B: `DetailStructureSidebar.tsx`에 배지 추가, `canvas`는 배지 미노출
- [ ] 구매자 렌더러/export에 라벨 미노출 grep 검증
- [ ] 스크린샷 1장 + canvas 미노출 확인 1건 + 손검산표(21개 타입 전체)
- [ ] `tsc --noEmit` EXIT_CODE=0, `git diff --stat`
