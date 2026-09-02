# 45차 — 경쟁사 실사 기반 "진짜 서비스" 품질 고도화 (2차 라운드)

생성: 2026-08-31

## 배경 (사용자 원문)

> "자 이제 상세페이지 조금더 세밀하게 정말 서비스가 될 수 있을 정도로 만들어 보자. 커서한테
> 여러 상세페이지 업체들 전부 크롤링 시켜서 우리가 정말 서비스가 될 수 있을정도의 업그레이드를
> 최소한의 비용으로 할수 있게 지시사항 만들어줘"

## 시작하기 전에 — 먼저 확인한 것 (중복 작업 방지가 목적)

이 브리프를 쓰기 전에 `review/` 폴더와 관련 코드를 먼저 확인했습니다. 이미 상당한 작업이
되어 있어서, 처음부터 다시 시키면 시간 낭비입니다.

1. **29차(8/26) 리서치 디렉티브는 실제로 크게 실행됐습니다.** `review/reference-patterns.md`,
   `review/upgrade-proposals.md`, `review/competitor-gap-2026.md`,
   `review/designer-patterns-2026.md`, `review/marketplace-pdp-learning-2026.md`가 전부
   존재하고, `scripts/competitor-gap-scan.ts` / `scripts/marketplace-pdp-scan.ts`라는 $0 비용
   자동 크롤 스크립트까지 만들어져 후커블·크리에이지·GENCY·알잘AI·드랩아트 5곳 + 마켓 가이드
   3곳을 이미 스캔했고, 그 결과로 반려동물 전용 템플릿, 리뷰 하이라이트 섹션, 모바일 sticky
   CTA, 에디토리얼 풀블리드 레이아웃, 후커블식 분할 ZIP 다운로드, 마켓플레이스 6블록 CRO
   가이드 등이 **이미 구현 완료**되어 있습니다. 이 브리프는 이걸 무시하고 처음부터 다시 하라는
   게 아니라, 그 다음 라운드입니다.

2. **오늘 제가 직접 후커블·알잘AI를 브라우저로 다시 열어봤습니다** (기존 스캔은 랜딩페이지
   텍스트만 긁은 거라 실제 화면·입력 UI는 못 봤음). 그 결과 하나 중요한 걸 발견했는데 —
   **좋은 소식입니다.** 후커블은 "디자인 레퍼런스 가져오기"(무드·톤앤매너·색상 분석)를 핵심
   기능으로 홈페이지 맨 위에 내세우고, Gaoding도 별도 "참고 이미지" 업로드 기능이 있습니다.
   그런데 **Pagzly는 이미 이 기능을 완전히 갖고 있습니다**:
   - `lib/reference-analysis.ts`의 `analyzeReferenceImage()` — Haiku Vision으로 레퍼런스
     이미지에서 색상 hex·무드 키워드를 뽑는 함수 (이미 존재)
   - `app/api/generate/route.ts` 498~508행, 602행 — 위 함수를 실제로 호출해서 프롬프트에
     반영 (이미 연결됨)
   - `components/CreateProductForm.tsx` 855~901행 — "레퍼런스 이미지 (선택)" 업로드 UI
     (이미 있음)
   - `app/create/draft/page.tsx` 588~625행 — 분석 결과(색상 hex 스와치·무드 키워드)를
     사용자에게 카드로 보여주기까지 함 (이미 있음)

   즉 **경쟁사 대비 뒤처진 기능이 아니라 이미 동등하거나 앞서 있는 기능인데, 이 사실이
   랜딩페이지 어디에도 마케팅되지 않고 있습니다.** 지난 8/24 Adomate 전략 문서의 "Phase 0"
   (리뷰 인사이트·레퍼런스 분석 결과를 사용자에게 노출)도 위 draft 페이지 카드로 이미 구현되어
   있는 걸 확인했습니다. 다만 그 문서의 "Phase 1"(경쟁사 URL 분석을 구조화된 차별화 포인트로
   뽑아서 보여주는 것)은 아직 없습니다 — `lib/url-crawler.ts`는 여전히 제목/본문 요약만
   추출하고, 결과가 카피 생성 프롬프트에 raw text로만 들어갈 뿐 사용자에게는 안 보입니다.

3. **웹 검색으로 기존 스캔에 없던 경쟁사 2곳을 추가로 찾았습니다**: 가비아(대기업 호스팅사)의
   AI 에디터(`aieditor.gabia.com`, `clickn.co.kr/ai_editor`)와, Pagzly와 정확히 같은 타겟
   ("쿠팡·스마트스토어 상세페이지 AI 자동 생성")을 내세우는 **셀러비서**(`sellerbiseo.com`).
   사용자가 "전부"라고 했으니 이번 라운드에서 스캔 대상에 추가합니다.

4. **아직 안 고쳐진 실제 버그도 하나 남아있습니다.** `review/qa-report.md`(8/18)에 전자기기·
   생활용품 카테고리에서 DOM 이미지 해시 중복 경고(WARN)가 있었고,
   `review/marketplace-pdp-learning-2026.md`(8/28)의 "다음 (코드만)" 목록에도 "이미지 dedup
   QA — assignDistinctSectionImages 회귀 테스트 강화"가 여전히 미해결로 남아있습니다.

## 이번 라운드 범위 — 4트랙, 전부 저비용

**공통 원칙**: 새 유료 이미지 생성 API 호출은 이번 라운드에 하나도 추가하지 않습니다. 텍스트
LLM 호출 1회(B), 코드/문구 수정(A), 크롤 스크립트 확장(C, 여전히 공개 HTML만 대상 $0),
QA 재실행(D)만 있습니다.

---

### A. 레퍼런스 이미지 기능을 랜딩페이지에 마케팅으로 노출 (거의 무료, 최우선)

`lib/landing-content.ts`의 `LANDING_FEATURES`(현재 3개: "AI 자동 생성", "완성 즉시 다운로드",
"직접 편집 가능")에 이미 있는 기능인데 아무도 모르는 걸 문구로 알립니다. 그리드 3열이 깨지지
않도록 **새 카드를 추가하지 말고, 첫 번째 항목("AI 자동 생성")의 description을 교체**하세요:

```ts
// before
{
  title: "AI 자동 생성",
  description:
    "상품 사진만 업로드하면 AI가 카피, 레이아웃, 디자인까지 자동으로 완성합니다.",
},

// after
{
  title: "AI 자동 생성",
  description:
    "상품 사진만 업로드하면 AI가 카피, 레이아웃, 디자인까지 자동으로 완성합니다. 원하는 톤의 레퍼런스 이미지를 함께 올리면 그 색감·무드까지 반영해요.",
},
```

`CreateProductForm.tsx` 860행 근처 "레퍼런스 이미지 (선택)" 라벨 자체는 UI 공간 제약상 그대로
두되, 855행의 안내 문구("레퍼런스 이미지·리뷰·기획안을 첨부하면 AI가 색감·후기 톤·기획 톤을
참고합니다")는 이미 적절하니 손대지 않습니다. **UI 코드 변경은 이 랜딩 문구 하나만**입니다 —
CSS/레이아웃 변경 없음.

---

### B. 경쟁사 URL 분석 → 구조화된 차별화 포인트 추출 (Phase 1, 낮은 비용)

알잘AI는 "AI가 경쟁사 분석으로 차별화 요소를 발견합니다"를 명시적 판매 포인트로 내세웁니다.
Pagzly는 `lib/url-crawler.ts`로 경쟁사 페이지를 이미 가져오고 있지만, 그 결과를 구조화하거나
사용자에게 보여주지 않습니다. 8/24 Adomate 전략 문서의 Phase 1 제안을 좁혀서 이번에 구현하세요.

**신규 함수** — `lib/url-crawler.ts`에 추가 (기존 `extractUrlSummary` 아래):

```ts
export type CompetitorDifferentiation = {
  competitorFocus: string[]; // 경쟁사가 강조하는 포인트 2~3개
  differentiationHints: string[]; // 우리 상품이 다르게 어필할 수 있는 지점 2~3개
};

/**
 * 경쟁사 URL 요약(extractUrlSummary 결과)을 구조화된 차별화 포인트로 변환.
 * 텍스트 LLM 호출 1회 — 이미지 파이프라인($0.30) 대비 원가 무시 가능한 수준.
 * 실패 시 조용히 null 반환 (기존 raw text 프롬프트 삽입 경로는 그대로 유지 — 이 함수는
 * "추가 노출"용이지 기존 카피 생성 로직을 대체하지 않음).
 */
export async function extractCompetitorDifferentiation(
  productName: string,
  productKeyFeatures: string[],
  competitorSummary: { title: string; excerpt: string },
): Promise<CompetitorDifferentiation | null> {
  // DeepSeek 또는 Haiku 텍스트 호출 1회.
  // 프롬프트: "다음은 경쟁사 상품 페이지 요약이다. 우리 상품 정보와 비교해서
  // (1) 경쟁사가 강조하는 포인트 2~3개, (2) 우리 상품이 다르게 강조할 수 있는 지점 2~3개를
  // JSON으로만 반환하라. 없는 사실을 지어내지 말고, 입력에 없는 수치/인증은 절대 만들지 말 것."
  // 파싱 실패/API 실패 시 null 반환 (throw 금지 — review-insights.ts 패턴과 동일)
}
```

구체적인 프롬프트 문구와 파싱 로직은 `lib/review-insights.ts`(이미 있는 비슷한 패턴 — 리뷰
장단점 추출)를 그대로 참고해서 동일한 스타일로 작성하세요 (허위 생성 금지 문구 포함).

**연결 지점** — `app/api/generate/route.ts`에서 `competitorUrl`이 있고 `extractUrlSummary`가
성공했을 때만 위 함수를 호출하고, 응답 JSON에 `competitorDifferentiation` 필드로 추가합니다.
`referenceAnalysis`/`reviewInsights`와 같은 흐름(draft 응답 → draft 세션 payload)을 그대로
따라가면 됩니다.

**노출 지점** — `app/create/draft/page.tsx` 588~644행의 기존 "참고 자료 분석 결과" 카드에 세
번째 섹션으로 추가하세요 (레퍼런스 이미지 색감/무드, 리뷰 장단점과 같은 카드 안에 나란히).
`competitorUrl`을 입력하지 않았거나 크롤링이 실패했으면 이 섹션 자체가 안 보여야 합니다
(기존 두 섹션과 동일한 조건부 렌더링 패턴).

**하드 룰**: 이 기능은 "경쟁사 URL 요약 텍스트"만 근거로 삼습니다. 입력에 없는 수치·인증·
가격 비교를 만들어내지 않습니다. 경쟁사 브랜드명이나 카피 문구를 그대로 인용하지 않고, 구조적
차이점만 요약합니다 (29차 절대 규칙과 동일).

---

### C. 경쟁사 스캔 확장 — 대상 추가 + 실제 화면 스크린샷 확보

기존 `scripts/competitor-gap-scan.ts`/`scripts/marketplace-pdp-scan.ts`는 랜딩페이지 텍스트만
긁습니다. 텍스트만으로는 "저쪽이 화면을 얼마나 잘 만들었는지" 알 수 없습니다 — 이번에 두 가지를
추가하세요.

**C-1. 스캔 대상 추가** (양쪽 스크립트의 타겟 목록에 추가):
- 가비아 AI 에디터: `https://aieditor.gabia.com/` (또는 `https://www.clickn.co.kr/ai_editor`—
  둘 다 접속 가능한 쪽으로)
- 셀러비서: `https://sellerbiseo.com/ko/` — Pagzly와 정확히 같은 타겟(쿠팡·스마트스토어)을
  내세우는 곳이라 우선순위 높게 볼 것

**C-2. 스크린샷 캡처 추가**: 기존 스크립트가 쓰는 Playwright(이미 프로젝트에 있음 — 다른
review 스크린샷들도 Playwright로 찍은 것)로, 각 경쟁사 랜딩페이지를 방문할 때 풀페이지
스크린샷을 `review/competitor-screens/{name}-landing.png`로 저장하는 로직을 추가하세요.
로그인 없이 접근 가능한 범위까지만 — 로그인 벽에 막히면 그 사이트는 랜딩까지만 캡처하고
넘어갑니다 (텍스트 스캔과 동일한 실패 처리 패턴). 목적은 "완벽한 예시 갤러리 확보"가 아니라,
다음에 사람이 Pagzly 결과물(`review/fullpage-*-desktop.png`)과 나란히 놓고 육안 비교할 수 있는
자료를 만드는 것입니다.

**C-3. 문서 갱신**: 재실행 결과로 `review/competitor-gap-2026.md`와
`review/marketplace-pdp-learning-2026.md`를 2026-08-31 날짜로 갱신하고, 새로 추가된 2곳의
기능 매트릭스 행을 넣으세요. 스크린샷 캡처가 새로 추가한 부분이므로, 문서에 "이번엔 텍스트뿐
아니라 실제 화면도 캡처함 — `review/competitor-screens/`" 한 줄 남겨주세요.

---

### D. 이미지 중복 배정 QA 재점검 (남은 버그, 저비용)

`review/qa-report.md`(8/18)에서 전자기기·생활용품 카테고리에 DOM 이미지 해시 중복이
WARN으로 남아있었고, 8/28 문서에도 여전히 "다음" 항목으로 남아있습니다. 이번 라운드에서
처리하세요:

1. 기존 Playwright 시각 QA(`review/qa-report.md`를 만든 스크립트)를 화장품/전자기기/생활 3개
   카테고리에 다시 돌립니다.
2. 전자기기·생활용품에서 여전히 DOM img 해시 중복이 나오면, `lib/assign-section-images.ts`의
   `assignDistinctSectionImages` 로직에서 왜 같은 사진이 여러 슬롯에 배정되는지 원인을 찾아
   고칩니다 (사진 장수가 부족해서 어쩔 수 없이 재사용하는 경우라면 FAIL이 아니라 "사진을 더
   올려달라"는 안내로 처리하는 것도 방법 — 원인 파악 후 판단).
3. `review/qa-report.md`를 갱신하고, WARN이 사라졌는지 혹은 왜 구조적으로 남을 수밖에 없는지
   결론을 남깁니다.

---

## 절대 규칙 (29차와 동일하게 유지)

1. 브랜드명·세일즈 카피·슬로건을 그대로 베끼지 않습니다 — 배치 구조·기능 유무만 참고.
2. 후기·채팅형 리뷰·인증 배지·QC 그리드는 만들지 않습니다 (경쟁사 조사에서 아이디어가
   나와도 마찬가지).
3. 없는 수치·스펙·차별화 근거를 만들어내지 않습니다 (B 항목의 핵심 제약).
4. 슬롯 순서·종류(`lib/section-templates.ts`)는 이번 라운드에서 바꾸지 않습니다.
5. 새 유료 이미지 생성 API 호출을 추가하지 않습니다 — 텍스트 LLM 호출 1회(B)만 추가.
6. "채팅형 섹션 편집"(patch 탭 고도화)은 여러 문서에서 계속 최우선 후보로 남아있지만, 이번
   라운드 범위가 아닙니다 — 큰 UX 작업이라 별도 브리프로 분리합니다. 이번엔 저비용 항목만.

## 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] A: 랜딩페이지 "AI 자동 생성" 카드 문구에 레퍼런스 이미지 언급이 자연스럽게 들어갔는지
- [ ] B: `경쟁사 URL`을 입력하고 draft 생성 시 "경쟁사 대비 차별화 포인트" 섹션이 참고 자료
      카드에 나타나는지 / URL 미입력 시 안 나타나는지
- [ ] B: 근거 없는 수치·경쟁사 브랜드명 그대로 인용이 없는지 육안 확인
- [ ] C: `npx tsx scripts/competitor-gap-scan.ts`, `scripts/marketplace-pdp-scan.ts` 재실행
      로그 + 가비아/셀러비서 포함 여부
- [ ] C: `review/competitor-screens/`에 스크린샷 파일 생성 확인
- [ ] D: QA 재실행 후 전자기기·생활용품 DOM 이미지 중복 WARN 해소 여부(또는 구조적 사유)

## 완료 보고 형식

기존과 동일 — 변경/신규 파일 목록, `tsc` 결과, 위 체크리스트 결과, B 항목에서 실제 생성된
"차별화 포인트" 예시 1~2개(허위 생성 여부 확인용), C 항목의 신규 경쟁사 스캔 요약, D 항목의
QA 재실행 결과를 포함해 주세요.
