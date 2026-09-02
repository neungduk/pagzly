# 35차 Cursor 구현 브리프 — 이미 계산되는 "숨은 분석" 2종을 draft 화면에 노출 (Phase 0, 새 AI 호출 0건)

## 배경

이번 라운드는 가오딩(稿定设计, 중국 AI 상세페이지 서비스)의 실제 입력 폼을 로그인 없이 직접
열어보고 Pagzly와 기능을 비교하는 리서치에서 시작했습니다. 가오딩의 `商品详情页/A+` 생성 폼에는
"참고 이미지 업로드(스타일 레퍼런스)"가 있는데, 확인해보니 **Pagzly에도 이미 거의 동일한 기능이
있었습니다** — `components/CreateProductForm.tsx`의 "레퍼런스 이미지(선택)" 업로드가 Haiku
Vision으로 색상 2~4개(hex)와 무드 키워드 3~5개를 뽑아 카피/배경 생성 프롬프트에 주입하고
있습니다(`lib/reference-analysis.ts`의 `analyzeReferenceImage()`). 마켓플레이스별 규격 대응도
이미 `lib/download-platforms.ts`(스마트스토어 860px·쿠팡 780px·토스쇼핑/오늘의집 750px)와
`lib/split-detail-download.ts`(세로 슬라이스 ZIP 다운로드)로 결과 페이지에 완전히 구현돼
있었습니다 — 이 두 가지는 **이미 완료된 기능**이라 이번 브리프에서 손댈 필요가 없습니다.

다만 코드를 따라가다가 지난 8월 24일 Adomate 전략 문서에서 지적했던 것과 **똑같은 패턴의 결함**을
하나 더 발견했습니다: `analyzeReferenceImage()`가 뽑아내는 색상/무드 분석 결과가 `draft` 화면
어디에도 렌더링되지 않습니다. `app/create/draft/page.tsx` 전체를 grep해봐도 `colorHex`나
`moodKeywords`를 화면에 표시하는 코드가 없고, 데이터는 `DraftSessionPayload.referenceAnalysis`에
그대로 담겨 있지만 사용자 눈에는 보이지 않은 채로 카피 생성에만 조용히 반영되고 있습니다.
`lib/review-insights.ts`의 리뷰 파일 분석(`commonPraises`/`commonComplaints`, 이미
`DraftSessionPayload.reviewInsights`로 존재)도 정확히 같은 상태입니다 — 8월 24일 문서에서
"Phase 0"으로 지정했던 항목이 아직 처리되지 않은 채 남아있었던 것입니다.

**요약하면 이번 지시는 새 기능을 만드는 게 아니라, 이미 계산되고 있는 데이터 2종을 화면에
꺼내놓기만 하면 되는 작업**입니다. 새 AI 호출 없음, 원가 증가 없음, 순수 UI 추가입니다.

## 왜 중요한가

레퍼런스 이미지나 리뷰 파일을 업로드한 사용자는 지금 "진짜 반영이 됐는지" 결과물(카피)을 보고
짐작할 수밖에 없습니다. 이 카드 하나만 추가해도 "내가 올린 자료를 AI가 실제로 읽고 있구나"라는
신뢰가 바로 생깁니다. 또한 8월 24일 리서치에서 확인했듯 "리뷰 분석 기반 카피"는 후커블 같은
경쟁사가 이미 유료로 파는, 시장에서 검증된 기능인데 Pagzly는 이걸 이미 갖고 있으면서 숨겨두고
있었습니다.

## 확인한 사실 (코드 근거)

- `components/CreateProductForm.tsx:55-70` — `DraftSessionPayload` 타입에 `referenceAnalysis?:
  DraftGenerateResponse["referenceAnalysis"]`, `reviewInsights?:
  DraftGenerateResponse["reviewInsights"]`가 이미 최상위 필드로 존재.
- `lib/reference-analysis.ts` — `ReferenceAnalysis = { colorHex: string[]; moodKeywords: string[] }`.
  실패 시 폴백 값(`#2F4858`/`#E3A72E`, "클린"/"미니멀"/"차분한")까지 갖춘 안정적인 함수.
- `lib/review-insights.ts` — `ReviewInsights = { commonPraises: string[]; commonComplaints:
  string[] }`. 리뷰 원문에 없는 내용은 지어내지 않도록 프롬프트에 이미 방어 문구 포함.
- `app/create/draft/page.tsx` 639-640행 부근에서 `draft.sections`를 직접 렌더링하는 것과 같은
  패턴으로 `draft.referenceAnalysis`/`draft.reviewInsights`도 최상위에서 바로 접근 가능(타입상
  `draft: DraftSessionPayload | null`).
- 같은 파일을 전체 grep했을 때 `colorHex`/`moodKeywords`/`commonPraises`/`commonComplaints`를
  렌더링하는 JSX가 전혀 없음 — 데이터는 있는데 화면에 안 나옴을 확정.

## 수정 지시사항

### 파일: `app/create/draft/page.tsx`

**삽입 위치**: "Input summary" 카드(상품명·카테고리·업로드 사진 썸네일)를 닫는 `</div>` 직후,
`photoPending` 에러 블록 이전. 현재 코드:

```tsx
// 기존 (581~588행 부근)
                  />
                ))}
              </div>
            )}
        </div>

        {photoPending && (
```

이 사이에 아래 카드를 새로 삽입합니다. 새로 만드는 컴포넌트나 파일 없이 같은 파일 안에 인라인
JSX로 추가하면 됩니다(이미 import된 `CropMarks`를 재사용):

```tsx
// 수정 — "Input summary" 카드 닫는 </div> 다음, {photoPending && ( 이전에 삽입
                  />
                ))}
              </div>
            )}
        </div>

        {(draft.reviewInsights || draft.referenceAnalysis) &&
          ((draft.referenceAnalysis?.colorHex?.length ?? 0) > 0 ||
            (draft.referenceAnalysis?.moodKeywords?.length ?? 0) > 0 ||
            (draft.reviewInsights?.commonPraises?.length ?? 0) > 0 ||
            (draft.reviewInsights?.commonComplaints?.length ?? 0) > 0) && (
            <div className="relative mb-8 rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
              <CropMarks color="text-line/80" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
                Reference analysis
              </p>
              <p className="mt-1 text-xs text-ink/50">
                업로드하신 참고 자료를 AI가 이렇게 읽고 반영했습니다.
              </p>

              {((draft.referenceAnalysis?.colorHex?.length ?? 0) > 0 ||
                (draft.referenceAnalysis?.moodKeywords?.length ?? 0) > 0) && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-ink">레퍼런스 이미지 · 색감/무드</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {draft.referenceAnalysis?.colorHex?.map((hex) => (
                      <span
                        key={hex}
                        className="h-6 w-6 rounded-full border border-line"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                    {draft.referenceAnalysis?.moodKeywords?.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-md bg-line/40 px-2 py-0.5 text-xs text-ink/70"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {((draft.reviewInsights?.commonPraises?.length ?? 0) > 0 ||
                (draft.reviewInsights?.commonComplaints?.length ?? 0) > 0) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(draft.reviewInsights?.commonPraises?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-ink">자주 언급된 장점</p>
                      <ul className="mt-1 space-y-1 text-sm text-ink/70">
                        {draft.reviewInsights?.commonPraises.map((p) => (
                          <li key={p}>· {p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(draft.reviewInsights?.commonComplaints?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-ink">자주 언급된 아쉬운 점</p>
                      <ul className="mt-1 space-y-1 text-sm text-ink/70">
                        {draft.reviewInsights?.commonComplaints.map((c) => (
                          <li key={c}>· {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {photoPending && (
```

### 하드룰 (반드시 지킬 것)

1. **새 AI 호출을 추가하지 마세요.** `analyzeReferenceImage()`/`extractReviewInsights()` 호출부는
   전혀 건드리지 않습니다 — 이미 계산되어 `draft` 상태에 들어있는 값을 화면에 꺼내기만 합니다.
2. 레퍼런스 이미지도 안 올리고 리뷰 파일도 안 올린 사용자에게는 **이 카드 자체가 렌더링되지
   않아야** 합니다(빈 카드 노출 금지 — 위 조건부 렌더링 그대로 유지). 진입 장벽을 높이면 안 되므로
   두 자료 모두 계속 선택 사항으로 둡니다.
3. `colorHex`/`moodKeywords`/`commonPraises`/`commonComplaints` 배열 접근은 전부 옵셔널 체이닝
   (`?.`)과 `?? 0` 폴백을 유지해서, `referenceAnalysis`나 `reviewInsights`가 `undefined`인
   기존 세션(레퍼런스/리뷰 없이 생성한 draft)에서 런타임 에러가 나지 않게 하세요.
4. 기존 "Input summary" 카드나 `photoPending`/`error` 블록의 마크업·로직은 건드리지 마세요 —
   순수 삽입입니다.
5. 색상 스와치(`<span style={{ backgroundColor: hex }}>`)에 인라인 스타일을 쓰는 건 hex 값이
   런타임에 동적으로 오기 때문에 불가피합니다 — 프로젝트의 다른 부분에 Tailwind 동적 클래스
   생성 규칙이 있다면 그에 맞춰 조정해도 되지만, 없다면 위 방식 그대로 사용하세요.

## 검증 체크리스트 (구현 완료 후)

1. `tsc --noEmit` — 신규 에러 0건 확인.
2. 레퍼런스 이미지 O + 리뷰 파일 X로 생성 → 카드에 색상 스와치·무드 키워드만 보이고 리뷰 섹션은
   안 보이는지 확인.
3. 레퍼런스 이미지 X + 리뷰 파일(xlsx 또는 txt) O로 생성 → 카드에 장점/아쉬운 점만 보이고
   레퍼런스 섹션은 안 보이는지 확인.
4. 둘 다 O로 생성 → 카드에 두 섹션이 같이 보이는지 확인.
5. 둘 다 X로 생성(기존 방식 그대로) → 카드 자체가 아예 렌더링되지 않는지 확인(빈 테두리 상자가
   보이면 조건문이 잘못된 것).
6. "다시 생성" 버튼을 눌러도 카드 내용이 최신 상태로 갱신되는지 확인(기존 재생성 로직과 상태
   갱신 경로가 이미 `draft.referenceAnalysis`/`draft.reviewInsights`를 갱신하고 있으므로 별도
   처리 없이 될 가능성이 높지만, 실제로 눈으로 확인 필요).
7. 기존 카피 미리보기(섹션 리스트)·승인 버튼·에러 배너 레이아웃에 회귀가 없는지 확인.

## 이번에 손대지 않는 것 (참고)

- **마켓플레이스별 이미지 규격 대응**: `lib/download-platforms.ts` + `lib/split-detail-download.ts`
  + 결과 페이지(`app/create/result/page.tsx`)에 스마트스토어/쿠팡/토스쇼핑/오늘의집 4개 플랫폼
  선택 UI와 세로 슬라이스 ZIP 다운로드까지 이미 완전히 구현·연결되어 있음을 확인했습니다. 가오딩의
  "플랫폼 호환성" 드롭다운과 같은 역할을 이미 하고 있어 이번 라운드에서는 손대지 않습니다.
- **참고 이미지 업로드 자체**: 이미 존재하는 기능이라 새로 만들지 않습니다. 이번 브리프는 그
  결과를 "보이게" 만드는 것만 다룹니다.
- **결제/크레딧 시스템**: 가오딩은 "콩" 단위 크레딧제(가입 시 70콩 무료, 섹션당 2~16콩 소모)를
  쓰고 있었지만, 이건 제품 기능이 아니라 별도 비즈니스 트랙 판단이 필요한 사안이라 이번 라운드
  범위에 포함하지 않습니다.
