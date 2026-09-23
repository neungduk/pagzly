# Pagzly 백로그 마스터 (2026-09-15)

생성: 2026-09-15  
목적: 45차~184차 문서에 흩어진 「다음 라운드 후보 / 채택하지 않은 것 / 미해결」을 한곳에서 고르게 한다.  
규칙: 새 라운드는 이 문서를 먼저 열고 항목을 고른 뒤, 완료 시 상태만 갱신한다.

상태 키:

| 상태 | 의미 |
|------|------|
| `완료됨` | 이후 라운드에서 실제로 처리됨 (처리 차수 명시) |
| `의도적 보류` | 버그 아님 · 취향/가드레일/카테고리 특성상 안 함 |
| `미해결·API불필요` | 코드만으로 지금 가능, 아직 미착수 |
| `API필요·허가대기` | DeepSeek/Replicate 등 생성 API 또는 유료 실사가 필요 |

---

## 요약 (2026-09-17 / 218차 반영 — 실행·독립 검증 완료, 매칭 강도 보강 프로덕션 반영)

> 218차 실행 검증: Cursor가 `review/218cha-report.md`로 완료 보고 → Claude가
> `lib/photo-composite.ts`를 재스테이징해 상수 diff를 직접 대조(colorMix
> 0.22→0.38, lumMix 0.14→0.24, contrastMix 0.16→0.28, 채널 클램프
> [0.82,1.18]→[0.65,1.40], 콘트라스트 클램프 [0.88,1.15]→[0.75,1.30], 그레인
> 알파 0.02~0.05→0.03~0.07 — 전부 보고서와 일치), `matchCutoutSharpness`·
> 세이프가드·`lifestyle-product-composite.ts`는 mtime이 216차 검증 시점과
> 완전히 동일해 미변경 확인. **핵심 수치(극단 색역 거리 150.04/97.24/62.88,
> 회귀 케이스 배경·컷아웃 평균색)를 Cursor의 스크립트를 실행하지 않고 별도
> Node 샌드박스에서 처음부터 재구현해 재계산** — 소수점 둘째 자리까지 정확히
> 일치 확인(`218cha-cursor-execution-report.md`). 보고서가 "브리프 제안
> 상수로 1차 실행 시 축소율 24.9%로 실패 → WB만 재조정해 35.3%로 통과"라고
> 밝힌 실패 서사도 브리프 지침과 일치해 정직하게 보고된 것으로 판단. **결론:
> 합성 테스트 케이스 기준으로 극단 색역 매칭이 구 상수 대비 35.3% 더
> 개선됐고 과보정(오버슈트) 없음을 확인 — 프로덕션에 반영된 상태 유지**.
> 단 이는 유닛 테스트 수준 개선이며, 216차 electronics 실제 사진으로 육안
> 체감되는지는 아직 미확인(유료 재검증 필요, 사용자 판단 대기).

## 요약 (2026-09-17 / 218차 반영 — 매칭 강도 보강 브리프 작성, Cursor 실행 대기)

> 218차: 217차 무료 조사에 이어, 사용자가 216차 원인 후보 (1) "매칭 강도 부족"을
> 진행하기로 선택. `lib/photo-composite.ts`를 읽어 `matchCutoutWhiteBalance()`의
> 보정 강도(`colorMix`0.22/`lumMix`0.14/`contrastMix`0.16)와 클램프 상한
> (채널 ±18%, 콘트라스트 ±12~15%)이 216차 같은 극단 색역 격차를 흡수하기엔
> 너무 보수적임을 코드로 확인, `matchCutoutGrain()`의 알파 상한(0.02~0.05)도
> 실사진 그레인 대비 미미함을 확인. **이번 라운드는 유료 생성 API를 전혀 쓰지
> 않고 기존 `scripts/211cha-lifestyle-matching-verify.ts` 같은 순수 함수 유닛
> 테스트로만 검증**하는 스코프로 제한 — `colorMix`→0.34, `lumMix`→0.20,
> `contrastMix`→0.24, 채널 클램프→[0.70,1.32], 콘트라스트 클램프→[0.80,1.25],
> 그레인 알파→0.03~0.07로 상향 제안. `matchCutoutSharpness()`와 세이프가드
> 임계값은 스코프 밖(별도 원인이라 판단)으로 명시적으로 제외. 극단 색역
> 케이스·회귀(과보정 방지) 케이스·그레인 케이스 3종 신규 유닛 테스트 추가를
> Cursor에 요구, 회귀 케이스(이미 잘 맞는 배경에서 과보정 없는지)를 "가장
> 중요한 안전장치"로 명시. `cursor_brief_218cha_matching_intensity_boost.md`
> 작성, Cursor 실행 결과 대기 중.

## 요약 (2026-09-17 / 217차 반영 — 무료 조사, 컷아웃 형태 문제 확인)

> 217차: 216차 보고서가 제시한 품질 미흡 원인 후보 3가지(매칭 강도 부족/색역 차이 큰
> 상품컷/unreliable placement로 인한 위치·스케일 어긋남) 중, 사용자가 "컷아웃 형태
> 문제부터 조사"(무료)를 선택. 코드 변경·유료 API 실행 없이 (1) electronics 상품컷
> `02-pexels-33936400.jpeg`을 직접 열람해 케이스+낱개 이어버드 2개, 총 3개 오브젝트가
> 흩어진 플랫레이 사진임을 확인, (2) `lib/lifestyle-product-composite.ts`
> 927~943행을 읽어 `removeProductBackground()`가 오브젝트 분리 없이 이미지 전체를
> 하나의 컷아웃으로 반환하는 구조임을 코드로 확인, (3) 216차 합성 결과 이미지를
> 재열람해 케이스+낱개 이어버드가 실제로 한 덩어리로 붙어있음을 육안 재확인 —
> **가설 확인: 컷아웃 형태 문제가 216차 품질 미흡의 실제 원인 중 하나**. 추가로
> `전자제품/` 폴더 나머지 4개 상품컷을 전부 열람해 대체 후보 조사:
> `05-pexels-1279107.jpeg`(구글 홈 미니 스피커 단독, 쥐기 적합 크기, 부드러운 조명)를
> 가장 유력한 대체 후보로 식별, `01-pexels-10104890.jpeg`(손에 쥔 이어폰 박스)도
> 차선책, `03/04`는 216차보다 더 심한 다중 오브젝트라 제외 권장. 단, 기존
> `전자기기-액세서리/` 라이프스타일 사진은 전부 "납작한 케이스 그립" 구도라 둥근
> 스피커와는 안 맞음 — 새 라이프스타일 사진 소싱이 별도로 필요함을 확인.
> `217cha-cutout-shape-investigation.md` 작성. 다음 방향(새 페어 유료 재검증 / 매칭
> 강도 보강 / 조사 종료)은 사용자 판단 대기.

## 요약 (2026-09-17 / 216차 반영 — 실행·독립 검증 완료, 211차 매칭 경로 최초 실사 도달·품질은 미흡)

> 216차: 215차 결과(4/4 재실패, electronics가 임계값 0.4에 0.018차 근접)를 보고한 뒤
> 4가지 선택지(임계값 완화/디버그 강제 플래그/추가 이미지 재시도/중단)를 제시했고
> 사용자가 "너가 권장하는 걸로 해"로 판단을 위임 → **디버그 강제 플래그**를 추천·채택
> (임계값 완화는 프로덕션 안전값을 영구 변경하는 리스크가 커서 기각, 추가 이미지 재시도는
> 최선의 215차 쌍도 임계값 미달이라 성공 불확실해서 기각). `compositeProductOnLifestylePhoto()`에
> QA 전용 `qaBypassGraspSafeguard` 플래그를 추가해 세이프가드를 우회하고 215차 electronics
> 쌍(overlap 0.382로 가장 근접했던 실제 조합)을 재사용해 **정확히 1건만** 유료 실행,
> 검증 후 코드 변경은 되돌리는 조건으로 `cursor_brief_216cha_qa_bypass_grasp_safeguard.md`
> 작성. Cursor가 실행 완료(`review/216cha-report.md`) → Claude가 report·summary.json·
> run-log·`qa-flag.diff` 전부 대조하고, **PC의 현재 소스 파일을 직접 재스테이징해
> `qaBypassGraspSafeguard`/`allowPaste` 문자열이 0건임을 grep으로 직접 재현 확인**
> (보고서 텍스트를 신뢰한 게 아니라 파일 내용 자체로 되돌림을 검증), `app/api/generate/
> route.ts` mtime이 216차 작업 구간보다 이전임도 확인해 프로덕션 미연결을 재확인
> (`216cha-cursor-execution-report.md`). **결과: `pasteCutoutOnScene`이 실사에서
> 처음으로 실행돼 `method: "pixel-paste"`로 성공** — 214+215차 8건 전부가
> `nano-banana-fallback`이었던 것과 대비됨(214→215→216차 조사에서 처음 도달). 다만
> 산출 이미지를 원본과 나란히 직접 열어본 결과 **품질은 아직 부자연스러움**을 육안으로
> 확인: 원본의 기존 케이스가 지워지지 않고 비침, 컷아웃의 블루/오렌지 스튜디오 조명이
> 원본의 어둡고 중립적인 조명과 크게 충돌, 접촉 그림자·그레인 거의 없어 붕 떠 보임.
> 이는 세이프가드가 막으려던 "부자연스러운 합성"의 구체적 실례이기도 해, 214/215차의
> "임계값이 과도하게 보수적" 가설에 대한 반대 증거로도 볼 수 있음 — §4에 갱신, 코드는
> 브리프대로 완전히 되돌려졌고 216차 종료로 "생성 API 0건/코드 변경 없이 관찰만" 원칙
> 기본값 복귀.

## 요약 (2026-09-17 / 215차 반영 — 실행·독립 검증 완료, 4/4 재실패 — 임계값 근접-미달 확인)

> 215차: 214차가 grasp 세이프가드에 걸려 211차 매칭 3축을 실사 검증하지 못한 뒤, 사용자가
> "211차 매칭 3축 실사 포함해서 214차 진행하자"는 요청에 따라 **더 나은 이미지 쌍으로
> 재시도**, 사용자가 "4건" 허가. 유료 생성 전 `scripts/test-assets/`를 무료로 전수
> 재검토해 214차 실패 원인(비비기 동작·카테고리 불일치)을 코드로 추적, 명확한 "쥐기"
> 포즈 + 형태 일치 4쌍(뷰티 세럼/전자 이어폰 케이스/식품 보충제 보틀/생활 머그컵)을
> 새로 선정해 `cursor_brief_215cha_lifestyle_matching_grasp_retry.md` 작성. Cursor가
> 정확히 4건 실행(합계 $0.203491, Vision 포함 관측 총액 ≈$0.250) → Claude가 보고서·
> summary.json·run-log·스크립트·mtime·산출 이미지 4장을 전부 대조하고, **grasp overlap
> 값을 원시 Vision 좌표에서 직접 재계산해 코드 공식과 소수점 셋째자리까지 일치함을
> 확인**(`215cha-cursor-execution-report.md`). **결과: 4건 모두 다시 nano-banana-fallback
> — pasteCutoutOnScene 0/4건.** 다만 이번엔 유의미한 데이터를 얻음: electronics 건이
> 임계값(`minGraspOverlapFraction=0.4`)에 **0.018 차이로 근접 실패**(overlap 0.382) —
> "이미지를 잘못 골라서"가 아니라 **세이프가드 임계값 자체가 보수적으로 설정돼 있다는
> 것**을 시사. 211차 매칭 3축의 실사 육안 검증은 214+215차 총 8건·$0.353을 들이고도
> 여전히 미해결 — §4에 재등록, 사용자에게 4가지 선택지(임계값 완화/디버그 강제 플래그/
> 추가 이미지 재시도/여기서 중단) 제시하고 다음 지시 대기 중.

## 요약 (2026-09-17 / 214차 반영 — 실행 완료·독립 검증 완료, 원래 목적은 미달성)

> 214차: 사용자가 "유료 생성 API 허가 요청" 방향을 선택하고 정확히 "2건만" 허가 → 브리프
> 작성 → Cursor가 정확히 2건 실행(합계 $0.108721, Vision 비용 포함 관측 총액 ≈$0.139) →
> Claude가 보고서·summary.json·실행 스크립트·실제 코드(`lib/lifestyle-product-composite.ts`)·
> 산출 이미지 2장을 전부 직접 대조해 독립 검증 완료(`214cha-cursor-execution-report.md`).
> **실행 자체는 브리프 가드레일(2건·무재시도·코드무변경) 그대로 정확히 지켜졌으나, 두 건
> 모두 89차부터 있던 정당한 안전장치(`detectHandPlacementWithGraspRetry` — Vision이
> grasp 위치를 3회 모두 `reliable=false`로 판정)에 걸려 `pasteCutoutOnScene()`(211차가
> 수정한 매칭 경로)이 구조적으로 도달 불가능했고, 대신 `nano-banana-fallback`(전체
> AI 재생성)으로만 완료됨.** 즉 214차가 원래 확인하려던 질문("211차 매칭 3축이 실사에서
> 자연스러운가")은 **여전히 미해결**입니다 — 돈은 정확히 허가된 만큼만 썼고 실행도 완벽했지만,
> 우연히 고른 이미지 쌍이 세이프가드를 통과하지 못해 목표 경로 자체가 실행되지 않았습니다.
> 추가 조치(더 나은 이미지 쌍 재시도, 또는 fallback을 막는 디버그 플래그 신설) 여부를
> 사용자에게 물었고, 사용자가 **"여기서 멈춤"**을 선택 — 211차 단위 테스트(전부 통과)를
> 실질적 검증 기준으로 채택하고 §2 의도적 보류로 이동. 재론 없음.

## 요약 (2026-09-17 / 213차 반영 — 코드 변경 없음, 정직한 null 결과)

| 상태 | 항목 수 (대략) |
|------|----------------|
| 완료됨 | 52 |
| 의도적 보류 | 16 |
| 미해결·API불필요 | **0** |
| API필요·허가대기 | 11 |

> 213차 (코드 변경 없음 — 새 마켓플레이스 크롤링 라운드): 사용자 지시 "새 마켓플레이스/사이트
> 재시도"에 따라 이전에 방문한 적 없는 사이트를 새로 크롤링. 네이버쇼핑(`search.shopping.naver.com`
> 등 서브도메인 포함) 재확인 → 여전히 도메인 전체 차단(3라운드 연속 실패, 정책적 차단으로 판단).
> 카카오쇼핑 → 내비게이션은 허용되나 렌더링 실패(원인 미상, 차단은 아님). 티몬 → 기업회생·인수
> 관련 정적 공지문만 노출, 정상 영업 재개 전이라 크롤 대상 아님. G9 → 서비스 종료 추정(에러
> 페이지). **W컨셉(wconcept.co.kr) → 신규 접근 성공**, 패션 실제 상품(니트 가디건) 상세페이지
> 전체 확인. 3개 후보 가설을 코드와 대조: (1) 법정 고시 "치수" 행이 "상세페이지참조"로 위임된
> 패턴(212차 11번가와 동일 계열) → `SPEC_SKELETONS["패션/의류"]`의 "사이즈" 행이 212차
> `SIZE_HINT_LABELS` 폴백에 이미 포함돼 있어 **선제적으로 이미 해결**돼 있음을 코드로 재확인.
> (2) "세탁방법" 행도 상세페이지 위임 패턴이나, `ProductInput`에 세탁·취급주의 입력 필드 자체가
> 없고(grep 0건) 원단별로 사실이 다른 정보를 AI가 지어내면 위험해 **의도적 보류**로 판단(신규
> §2 항목 추가, 의도적 보류 15→16). (3) 리뷰 상단 사이즈/색상/소재 정확도 % 배지 → 210차 쿠팡
> 크롤에서 이미 다룬 것과 동일 계열(플랫폼 집계 UI, Pagzly의 `buildAxisComparison`과 데이터
> 소스·프레이밍이 다름) — 재확인만 하고 결론 동일. **결론: 신규 사이트 접근엔 성공했지만 코드
> 변경 대상 없음 — 208/210차와 같은 정직한 null 결과.** `marketplace_crawl_findings_2026-09-07.md`
> §0 접근 결과 표 전체 갱신 + §6(W컨셉) 신규 추가.
>
> 212차 실행 검증 (Cursor 완료 보고 → Claude 독립 재검증): Cursor가 `review/212cha-report.md`로
> 완료를 보고해와, 보고 내용을 그대로 믿지 않고 `device_stage_files`로 PC의 실제 파일을 직접
> 대조했습니다. `lib/enrich-product-sections.ts`의 5곳 diff(전자/가전 스켈레톤에 "크기·용량·
> 형태" 행 추가, `resolveSkeletonValue`의 `productSizeHint` 폴백 — existing 값 우선순위
> 유지, 3개 함수 meta 타입 확장)와 `app/api/generate/route.ts` 1715행(`productSizeHint:
> body.productSizeHint`)이 브리프 지시와 정확히 일치함을 코드로 직접 읽어 확인. 카테고리
> 매핑도 `resolveTemplateCategory()`의 `"전자제품"→"전자/가전"` 별칭이 이미 있어 203차 같은
> 카테고리 문자열 혼동이 없었음을 grep으로 재확인. `lib/` 디렉토리 mtime 대조로 이번 라운드
> 변경 파일이 `enrich-product-sections.ts` 단 하나뿐임도 확인. **211차보다 한 단계 더
> 엄격하게**, 이번엔 Cursor의 검증 스크립트를 읽기만 한 게 아니라 핵심 로직을 별도 Node
> 샌드박스(`/tmp/212check/check.mjs`)에 처음부터 독립 재구현해 5개 검증 케이스(전자 크기
> 행=hint / 뷰티 용량=hint / hint 없으면 플레이스홀더 / 기존 값 있으면 hint로 안 덮어씀 /
> KC 인증 미입력 시 행 생략)를 직접 실행 — 전부 보고서의 "pass"와 일치. **결론: 212차
> 브리프대로 정확히 실행됨, 다른 파일 부작용 없음 — §3에서 §1로 이동, 완료됨 52건.**
>
> 212차 (브리프 작성, 코드 변경은 Cursor 실행 대기): 사용자 지시 "네이버 스마트스토어/
> 11번가 재시도"에 따라 실사 재크롤링. 네이버 스마트스토어는 이번에도 브라우저 접근
> 차단 상태 그대로(신규 정보 없음). 11번가는 210차 쿠팡처럼 이번에 새로 접근 가능해져
> 청소기 PDP(아이닉 아이타워 i50)를 크롤링 — "상품정보 제공고시"(법정 고시 표)에서
> "크기,용량,형태"/"KC 인증정보"/"정격전압,소비전력" 3개 항목이 전부 "상품상세설명
> 참조"로 위임 처리돼 있음을 확인. 이는 마켓플레이스가 이 정보를 셀러의 상세페이지
> 콘텐츠(Pagzly가 만드는 바로 그 페이지) 안에 있는 것으로 전제한다는 뜻. KC
> 인증정보/정격전압은 `SPEC_SKELETONS["전자/가전"]`에 이미 행이 있어 커버되지만
> "크기,용량,형태"는 전자/가전 스켈레톤에 행 자체가 없음을 코드로 확인. 더 나아가
> `lib/types/generate.ts:100`의 `productSizeHint`(폼 "용량·크기 힌트" 필드, 예:
> "35mL, 높이 약 9cm")가 정확히 이 데이터를 이미 판매자로부터 받고 있는데도, grep 전수
> 확인 결과 라이프스타일 합성 물리 스케일 매칭에만 쓰이고 `enrichSectionsWithProduct
> Metadata()`(spec_table 고시 표 보강 함수)에는 전달되지 않음(`app/api/generate/
> route.ts:1708~1715` meta 객체에 누락)을 확인 — 화장품(용량)·식품(내용량)·패션
> (사이즈)·생활리빙(규격) 카테고리도 동일 구멍. **입력 기근이 아니라 이미 받은 입력을
> 못 쓰고 버리는 배선 누락**으로 판단해 `cursor_brief_212cha_spec_table_size_hint_
> wiring.md` 작성 — `lib/enrich-product-sections.ts`(스켈레톤 행 1개 추가 + productSizeHint
> 폴백 배선)와 `app/api/generate/route.ts`(meta 객체 한 줄) 2개 파일만 대상, API 0.
>
> 211차 실행 검증 (Cursor 완료 보고 → Claude 독립 재검증): Cursor가 `review/211cha-report.md`로
> 완료를 보고해와, 보고 내용을 그대로 믿지 않고 `device_stage_files`로 PC의 실제 파일을 직접
> 대조했습니다. (1) `lib/lifestyle-product-composite.ts`의 import 목록에 `matchCutoutGrain`/
> `matchCutoutSharpness`/`matchCutoutWhiteBalance`가 실제로 추가됐고, `pasteCutoutOnScene()`
> 729~740행에서 브리프가 지시한 정확한 순서(화이트밸런스→선명도→그레인)로, 정확한 위치(크기/
> 회전 확정 직후, 그림자 계산 이전)에 배선된 것을 코드로 직접 읽어 확인. (2) mtime 대조로
> `lib/photo-composite.ts`(1789446527487)·`lib/photo-enhance.ts`(1789446548047)가 이번
> 라운드 이전 상태 그대로임을 확인 — "메인 파이프라인은 건드리지 않는다"는 하드 가드레일이
> 실제로 지켜짐. (3) Cursor가 작성한 `scripts/211cha-lifestyle-matching-verify.ts`를 직접
> 읽어 5개 검증 항목(매끈한 씬 스킵/파란 씬 화이트밸런스 이동/거친 씬 그레인 알파 범위/PNG
> 크기 일치/167차 캔버스 오버플로 회귀 없음)의 로직이 162~187차의 기존 검증 스크립트들과
> 동일한 방법론(순수 함수·결정론적 assertion)으로 타당하게 짜여 있음을 확인 — 보고서의 5개
> "pass"가 실제 코드 동작과 일치한다고 판단. **결론: 211차 브리프대로 정확히 실행됨, 다른
> 파일 부작용 없음 — §3에서 §1로 이동, 완료됨 51건.**
>
> 211차 (브리프 작성, 코드 변경은 Cursor 실행 대기): 210차 결과 보고 후 사용자가 "화면 배치
> 구성 / 이미지 합성 / 인포그래픽 상향 / 뒷배경 제품 색상에 맞게" 4개 영역을 지정해 재점검을
> 요청. 일반-목적 조사 서브에이전트로 4개 영역을 각각 (a) 관련 과거 라운드 문서 전수 대조,
> (b) 현재 코드 직접 열람으로 교차검증한 뒤, 제가 직접 핵심 주장(파일 경로·행 번호·import
> 목록)을 다시 코드로 재확인. 결과: **3개 영역(레이아웃, 인포그래픽, 배경색-매칭-로직 자체)은
> 이미 성숙하게 구현돼 있어 새 격차 없음** — 레이아웃은 151/183/190/195~198차 등 15개+
> 라운드가 이미 반복 정제, 인포그래픽은 각 다이어그램 타입(노이즈/무게/방수/전력/성분링 등)이
> 라이브·export 양쪽에 전부 동기화돼 있음을 직접 확인, 배경색 매칭은 `color-extract.ts`의
> 실제 픽셀 추출 테마가 히어로·섹션 배경 양쪽에 동일하게 흐르고 있음을 데이터 흐름으로 추적
> 확인(21~22차부터, 유사색조 전략은 53차부터 튜닝된 의도적 설계). **"이미지 합성" 1개 영역에서만
> 진짜 격차 발견**: 라이프스타일(AI 일상샷) 픽셀 페이스트 경로(`lib/lifestyle-product-composite.ts`
> `pasteCutoutOnScene()`)가 162차 그림자 색조 매칭만 받고, 그 후 163(콘트라스트)·164(선명도)·
> 187(그레인)차가 메인 히어로 경로에만 추가한 3개 매칭 축을 못 받은 채 방치돼 있었음 — 162차
> 문서 자체가 "이 파일도 동일하게 배선"이라 적어놓고 그림자 tint 하나만 실제로 배선했고, 이후
> 3개 라운드는 전부 이 파일을 언급조차 안 함(브리프·import 목록으로 직접 확인). 지어낸 문제가
> 아니라 문서 간 대조로 나온 실제 코드 격차 — `cursor_brief_211cha_lifestyle_composite_matching_axes_parity.md`
> 작성해 전달, §3에 신규 1건으로 등록. **결론: 4개 영역 중 3개는 재확인만, 1개(이미지 합성)는
> 실제 저위험 보강 브리프 발행.**
>
> 210차 (코드 변경 없음 — 신규 실사 크롤링 라운드): 사용자 지시("다시 한번 상세페이지들
> 싹 검토하고 크롤링해서 학습 한 다음 우리가 부족한 부분 지시사항으로 만들어봐")에 따라
> 208차와 달리 **기존 데이터 재사용이 아닌 신규 실시간 크롤링**을 수행. Claude in Chrome으로
> 쿠팡 실제 상품 상세페이지(쿠팡상품번호 9427713974, 무선 핸디 청소기)를 직접 열람 —
> 2026-09-07 `marketplace_crawl_findings_2026-09-07.md`에는 "브라우저 직접 접근 차단"으로
> 기록돼 있었으나 이번 라운드에는 정상 접근됨(신규 크롤링 소스 확보, 백로그 하단에 별도
> 기록). 히어로 갤러리 → 가격/스펙 → 새상품/반품 박스 → 교차판매 위젯 → "상품상세/상품평/
> 상품문의/배송" 탭바 → 실제 셀러 작성 "상품상세" 탭(충전 경고 레드 콜아웃 텍스트 → 마케팅
> 배너 이미지 시퀀스 → "상품정보 더보기" 접기) → 리뷰 탭(속성별 배지: 흡입력 92%·무게 97%·
> 소음 90%·사용시간 88%·가성비 96%, 각각 정성 태그 동반) 순으로 전체 구조를 스크롤·
> get_page_text로 확인. 추가로 hookable.ai/blog를 재방문해 2026-09-09 크롤링 이후 신규
> 게시물 7건(9/02~9/14)을 확인 — 대부분 콘텐츠 마케팅(촬영 단가, 추석 선물세트, 기획안
> 작성법 등)이라 코드 대조 대상이 아니었으나, "상세페이지 사이즈: 쿠팡·스마트스토어·
> 토스쇼핑 공식 규격 총정리"(8/28) 1건만 실제 검증 가능한 수치 주장이라 채택.
>
> 이번 라운드에서 나온 확인 가능한 가설 3건을 모두 현재 코드와 직접 대조:
> (1) 충전 경고 레드 콜아웃(마케팅 이미지 배치 전 안전 주의문) → `lib/types/generate.ts`의
> `CautionSection`(`type: "caution"`)이 이미 동일 역할로 존재 — 커버됨.
> (2) 리뷰 속성 배지(축별 % + 정성 태그) → 137차 `buildAxisComparison()`(`lib/review-insights.ts`)이
> 실제 업로드 리뷰 원문에서 결정론적으로 축별 매칭 비율을 뽑아 `insertReviewAxisComparisonSection()`
> (`lib/section-inserts.ts`)으로 `comparison_chart`에 이미 반영 중. 다만 프레이밍이 다름 —
> Pagzly는 "우리 제품 vs 일반 제품(기준선 50)" 비교형, 쿠팡은 플랫폼이 집계하는 중립적
> 절대 percentage+태그형(셀러가 작성하는 게 아니라 마켓플레이스 UI). 목적이 다른 두 UI라
> 버그도 취향 격차도 아니라고 판단 — 백로그 변경 없음.
> (3) 플랫폼별 권장 가로폭(스마트스토어 860px·쿠팡 780px·토스쇼핑 750px) → `lib/download-platforms.ts`
> 기존 값(smartstore 860 / coupang 780 / toss 750 / ohouse 750)과 정확히 일치. 웹서치로
> 2026년 최신 업계 가이드 다수와 대조해 780/860/750 수치가 지금도 표준임을 외부 검증 —
> 기존 구현이 정확했음을 재확인, 코드 변경 불필요.
> **결론: 신규 소스(쿠팡)를 포함한 실사 크롤링에서도 새 코드 버그는 발견되지 않음 —
> 3건 모두 이미 커버되었거나 기존 구현이 정확함이 확인됨. 208차와 마찬가지로 지어낸
> cursor_brief 없이 "재확인 완료"만 기록. 새 자산은 "쿠팡 접근 가능"이라는 크롤링 인프라
> 사실 하나 — 다음 라운드가 쿠팡을 벤치마크 소스로 쓸 수 있게 됨.**
>
> 209차 (코드 변경 없음 — 백로그 재분류 라운드): 사용자 지시("의도적 보류 항목 재검토")에
> 따라 §2(의도적 보류) 15건 전부를 현재 코드와 다시 대조. 가드레일 성격 항목(무지개차트·
> 경쟁사실명·anti-hallucination·가짜후기·AI인물생성)은 원칙 재확인만 하고 그대로 유지 —
> 이런 항목은 "재검토 대상"이 아니라 지켜야 할 제약이라 판단. 취향/공수 판단이었던 나머지
> 항목을 하나씩 확인한 결과 **2건이 실제로는 이미 완료돼 있었는데 백로그에 반영이 안 된
> 것**을 발견: (1) "히어로 그림자/색온도 A/B"(160, 취향) — 162차의 `tintedShadowColor()`가
> 이미 A/B 실험 없이 전 배경에 무조건 적용되는 프로덕션 기본값임을 코드로 재확인, 색온도
> 부분만 §1로 승격하고 그림자 "방향"(광원 각도)만 별도 항목으로 남김(실제 니즈 불확실이라
> 계속 보류). (2) "Track A 알파 soft/hard 미세 조정"(169, 사용자 취향 대기) —
> `design-tokens.ts`에 soft/hard를 고르는 토글·env가 전혀 없고 169차 대비 강화값이 44라운드째
> 유일한 프로덕션 값으로 운영 중임을 grep으로 확인, "대기 중인 결정"이 실은 존재하지 않아
> 완료로 재분류. 그 외 "POINT 배지 점선 연결선"(공수 사유는 185차 원형링 구현으로 무효화됐지만
> 디자인 언어 충돌이라는 원 사유는 여전히 유효 — 보류 유지), SPF/온도 기준표·색면 채도·
> Behance 전면교체·섹션 큐레이션·섹션 DnD 등 나머지 항목은 재확인 결과 원 판단 그대로
> 유효함을 확인. **결론: 코드 변경 없이 백로그 정확도만 개선 — §1에 2건 이동, §2 순항목
> 수는 그대로(재분류로 상쇄).**
>
> 208차 (코드 변경 없음 — 재조사 라운드): 사용자 지시("이전에 크롤링한 데이터와 내가
> 줬던 데이터 기반으로 확인해")에 따라 신규 크롤링·신규 생성 없이 (1) 기존 크롤링
> 문서 4건(`hookable_category_examples_2026-09-09.md`, `marketplace_crawl_findings_2026-09-07.md`,
> `151cha-category-layout-upgrade.md`, `159cha-designer-benchmark-footnote-dedupe.md`)의
> "다음 라운드 후보"를 전부 현재 코드와 재대조하고, (2) 사용자가 이미 만들어둔 실제
> 생성 세션 데이터(`review/181cha-live/{beauty,electronics,food,fashion,living,pet}/
> session.json·summary.json`, 6카테고리 실제 생성 결과)를 직접 열어 섹션 구성을 재검토함.
> 결과: 발견된 후보 전부 이미 이전 라운드에서 처리 완료로 확인됨 — `comparison_chart`
> 6카테고리 커버리지(151/161/181차 완료, rollup-final.json `charts:6`으로 재확인),
> `ingredient_highlight` 컴플라이언스 각주(160차 완료), 성분/균주 원형 배치도(185차
> `lib/ingredient-ring-diagram.ts` 완료), 전자제품 KC 인증 노출(기존 `enrich-product-sections.ts`
> 완료), 패션 "신장 대비 기장" 다이어그램(161차 의도적 스킵 — 모델키+기장 동시 입력 사례
> 0건, 억지 매핑 시 anti-hallucination 위반 위험이라는 근거 있음, 181cha-live 6개
> 세션 재확인으로도 해당 입력 패턴 여전히 없음), 저관여(생활/펫) step_card 데모트 여부
> (190차 판단·근거 있음, 재작업 금지 항목). living/electronics 세션에 `review_highlight`가
> 없는 것도 재확인 결과 리뷰 파일 미입력에 따른 정상 게이팅(입력 기근, 버그 아님)임을
> 확인. **결론: §3 미해결·API불필요 항목 0건 그대로 — 이번 라운드는 코드 변경 없이
> "재확인 완료"만 기록.** 다음 실제 새 축은 (a) 사용자가 새 방향을 지정하거나 (b) 생성
> API 허가 후 신규 실사 벤치마크 중 하나가 필요.
>
> 207차: 사용자 지시("후커블 및 디자이너가 만든 수준까지 나와야해")에 따라 Claude가
> 148차(2026-09-09) 실사 검증 문서에 59라운드째 "다음 라운드 후보"로만 남아있던 실제
> 버그를 코드 재검토로 확인·해소. `lib/apply-ingredient-circle-pair.ts`의
> `applyIngredientCircleVisual()`에서 성분 라벨 2개 이상(circle-pair) 경로가
> `texture_feel` 슬롯(선택 슬롯, `section-templates.ts` `required:false`)이 실제로
> 존재해야만 원형 성분 강조 비주얼을 만들었는데, DeepSeek가 이 슬롯을 자주 생략해
> 성분을 2개 이상 입력해도 원형 비주얼 자체가 조용히 통째로 스킵되고 있었음. 성분
> 1개짜리 circle-solo 경로가 이미 쓰고 있던 `pickAlternateIndex()`(texture_feel 우선
> 시도, 없으면 다른 상품 사진으로 폴백하는 기존 함수)를 circle-pair에도 그대로
> 재사용하는 것만으로 해소 — 신규 로직 0줄, 렌더링 컴포넌트(`DetailSectionRenderer.tsx`/
> `export-detail-html.ts`) 미수정. Cursor 구현 후 Claude가 diff를 코드 대조해
> `pickAlternateIndex` 재사용만 확인(신규 함수 없음), 4개 케이스(texture_feel
> 있음/없음/이미지 1장뿐/이미 circle 있음)를 별도 Node 샌드박스에서 독립 재시뮬레이션해
> 보고서 수치와 전부 일치함을 재확인. `tsc` 0, API 0.
>
> 206차: review-signal 계열(192~205차)이 205차로 종료된 뒤, 사용자 지시("코드 재검토해서
> 새 축 자체 발굴")에 따라 Claude가 코드를 직접 재검토해 발굴한 **컴플라이언스 축의 세
> 번째 카테고리 확장**. `lib/food-compliance.ts`(식품)·`lib/cosmetics-compliance.ts`
> (화장품)에 이미 있던 "AI 생성 카피에서 표시광고법 위반 표현을 서버가 최종 강제 치환"
> 패턴을 `전자제품` 카테고리로 확장(`lib/electronics-compliance.ts` 신규,
> `reviewElectronicsCopy()`) — 완벽 방수/고장 없음/평생 보장/전자파 없음/세계 최초 등
> 13개 금지 표현 치환 규칙. `mfdsReviewed`/`replacements` 필드가 이미 카테고리 무관 범용
> 타입이라 타입 파일·UI 컴포넌트 수정 없이 `route.ts` 3곳(import, 프롬프트 가이드,
> 최종 검수 3분기)만으로 배선 완료 — review-signal 계열보다 더 단순한 배선. Claude가
> 브리프 작성 중 정규식 13개를 직접 Node 샌드박스에서 시뮬레이션해 "반영구적으로"→
> "반장기간으로" 같은 단어 잘림 버그를 사전에 발견·수정(순서 조정 + `적?` 접미사 흡수).
> Cursor 구현 후 Claude가 파일을 재스테이징해 소스 100% 대조, 중첩 매칭 케이스를 별도
> 샌드박스에서 독립 재현해 재확인. `tsc` 0, DeepSeek 호출 경로 미추가, API 0.
>
> 205차: 사용자 지정("남은 카테고리에 review-signal 계속") — 192(반려동물)→203(식품)→
> 204(패션)에 이은 네 번째이자 마지막 review-signal 라운드. 화장품/뷰티·전자제품·
> 생활용품 3개 카테고리를 "장기 사용 후기 언급"(`countLongTermUseMentions`,
> `LONG_TERM_USE_PATTERN` — 숫자+기간 단위+사용 동사가 모두 붙은 경우만 매칭) 신호
> 하나로 동시에 커버 — 3카테고리가 "오래 써도 괜찮다"는 동일한 상업적 신호를 공유해서
> 카테고리별로 다른 정규식을 만들 필요가 없었음. 한글 고유어 숫자("한 달째")는 192차와
> 동일한 원칙으로 의도적 제외(안전한 과소집계). Cursor 구현 후 Claude가 정규식을 별도
> 샌드박스에서 독립 재구현해 hit/mixed 값과 오탐 방지 케이스("10개월 전에 상했어요",
> "가격이 10만원대") 전부 재확인, `route.ts`의 3중 OR 게이팅 문자열도 grep으로 재대조.
> **이걸로 "기타"를 제외한 실제 6개 카테고리 전부에 review-signal 롤아웃 완료** —
> 반려동물(나이·체중)/식품(재구매)/패션(사이즈·핏)/뷰티·전자·생활(장기 사용). `tsc` 0,
> DeepSeek 신규 호출 0, API 0.
>
> 204차: 사용자가 직접 방향 선택("패션 사이즈/핏 리뷰 신호") — 192(반려동물)→203(식품)에
> 이은 세 번째 review-signal 축. 패션 카테고리에 "사이즈/핏 언급" 신호
> (`countSizeFitMentions`, `SIZE_FIT_PATTERN`)를 동일 구조로 추가. "크다/작다" 단독
> 표현은 문맥 의존적 오탐 위험(예: "가격이 크게 부담되진 않아요")이 있어 애초 제외하고
> "사이즈" 키워드가 반드시 동반되는 명시적 어휘(`정사이즈`/`사이즈업`/`사이즈다운`/
> `사이즈 크게·작게`)만 다루도록 설계 — 203차에서 카테고리 문자열을 잘못 적었던 교훈으로
> 이번엔 `CreateProductForm.tsx`의 `CATEGORIES` 배열을 미리 확인해 `"의류/패션"`(단독
> `"패션"` 아님)을 브리프에 정확히 명시. Cursor 구현 후 Claude가 별도 샌드박스에서
> 정규식을 독립 재구현해 hit/miss/mixed 값과 오탐 방지 케이스("가격이 크게…", "작다고
> 느낄…" → 0건)를 재확인, `route.ts`의 게이팅 문자열도 grep으로 재대조. `tsc` 0,
> DeepSeek 신규 호출 0, API 0.
>
> 203차: §3이 비어 있어 Claude가 코드를 직접 재검토해 새 축 발굴(아래 §1 추가) —
> 192차 반려동물 "나이·체중 언급" 정규식 패턴(`countPetAgeWeightMentions`)이 다른
> 카테고리로 확장된 적이 없었던 것을 확인, 식품 카테고리에 "재구매 의사 언급" 신호
> (`countRepurchaseMentions`, `REPURCHASE_PATTERN`)를 동일 구조로 추가. Cursor가
> 브리프의 `body.category === "식품"` 게이팅 오류(실제 폼 값은 `"식품/건강기능식품"`
> 복합 문자열)를 스스로 발견해 `food-compliance.ts`의 `FOOD_CATEGORY`와 동일한 값으로
> 수정 — Claude가 코드 재조회(`grep`)로 이 수정이 정확한지 확인, 정규식 자체도 별도
> 샌드박스에서 재구현해 hit/miss/mixed 값과 "또 사용해보니"류 오탐 없음을 독립 검증.
> DeepSeek 호출 경로 불변(신규 호출 0) 확인. `tsc` 0, API 0.
>
> 195~198차: 사용자가 반복해온 "후커블과 똑같은 퀄리티" 요구에서, 183차가 "DeepSeek
> 재생성 필요"로 API 허가 대기(§4)에 넣어뒀던 "매거진풍 짧은 캡션/대형 타이포 오버레이"
> 항목이 실제로는 오판정이었음을 발견 — 이미 짧은 heading(기존 카피 재사용)을 이미지 위로
> 옮기기만 하면 되는 코드 전용 작업이었음(195). 그 과정에서 재사용한 `getHeroGradient`가
> 짧은 박스에서 사진과 브랜드색이 섞여 오염되는 회귀를 스크린샷 직접 대조로 발견해 중립
> 스크림으로 교체(196), 같은 패턴을 쓰는 다른 자리(`custom_gif`/`illustration_banner`)를
> 전수 감사(197), 검증에 쓴 QA 스크린샷이 실은 Supabase 스토리지 쿼터 초과(402)로 전부
> 깨진 이미지였던 것까지 발견해 로컬 자산으로 재검증(198) — 최종적으로 6카테고리 실사진
> 기준 오염 없음을 확인. "확인했다"는 보고를 매번 스크린샷 원본까지 열어 대조해 두 차례
> 회귀(196/198)를 잡아낸 사례.

---

## 1. 완료됨

| 항목 | 출처(후보로 남긴 차) | 완료 차 | 비고 |
|------|----------------------|---------|------|
| spec_table(상품정보 고시 표)에 `productSizeHint`(용량·크기 힌트) 폴백 배선 — 전자/가전 "크기·용량·형태" 행 신설 | 212차 자체 발굴(11번가 실사 재크롤링, 법정 고시 표 "상품상세설명 참조" 위임 발견) | **212** | Cursor 실행 완료, Claude가 PC 실제 파일 대조 + 별도 Node 샌드박스 독립 재구현으로 5개 케이스 재실행 검증. `lib/enrich-product-sections.ts` 5곳 + `route.ts` 1줄, 다른 파일 부작용 없음 |
| 라이프스타일 픽셀 페이스트(`pasteCutoutOnScene`)에 컷아웃-배경 매칭 3축(화이트밸런스·선명도·그레인) 보강 | 211차 자체 발굴(162/163/164/187차 방치분) | **211** | Cursor 실행 완료, Claude가 PC 실제 파일·mtime·검증 스크립트로 독립 재검증. 메인 파이프라인(`photo-composite.ts`/`photo-enhance.ts`) mtime 불변 확인 — 하드 가드레일 준수 |
| 채팅형 섹션 편집 Phase 1 (`SectionPatchChat` + `/api/patch-section`) | 45/48 | 48~96 | Phase 2=95 구성 채팅, Phase 3=96 요소+레퍼런스 |
| 채팅형 Phase UX: 적용 전 미리보기 / undo / 세션 히스토리 | 45 (고도화 반복) | **185** | API 호출 로직·횟수 불변, UI/상태만 |
| 성분/균주 원형 곡선 텍스트 (`textPath` 링) | 159 Behance | **185** | `lib/ingredient-ring-diagram.ts`, beauty/pet 게이팅 3~8 |
| Waterproof IP 다이어그램 | 160 후보 | 160 | |
| comparison_chart 카테고리 갭(패션·펫·홈 등 슬롯 정책) | 160→161 | **161**, 181 재확인 | 6/6 live `hasComparisonChart` |
| BRIA 배경 후보 2→4 | 145/160 | **166** | 스튜디오 8 유지 |
| electronics chart 채움 프롬프트/픽스처 | 166~170 | 167~171 경로 | 실사 재확인은 선택 사항으로 잔여 |
| export HTML 카테고리 SVG `url('data:...')` 이스케이프 | 169 | **170** | |
| 색면/리듬 보드·네이티브 픽스처 | 168~169 | 169 | |
| tradeoff / length guide | 170~171 | 171 | |
| 다이어그램 아이콘 세트 + monochrome normalize + tint | 174 후보 축 | **174~175** | |
| 아이콘 스타일 통일 프로브 → 실루엣 톤 | 176 | **177~178** | |
| elevation 토큰 감사·drift | 176/178 | **179** | |
| radius 스케일 축소·병합 | 178/179 | **180** | |
| Behance 벤치 + comparison 커버리지 재확인 | 181 | 181 | 코드 갭보다 포맷/취향 |
| FONT_SIZE 토큰화·역할 별칭 | 182 | **182** | |
| FONT_SIZE/ELEVATION 스케일 축소 | 182 미실시 | **184** | |
| living/pet display budget 28→20 + hero 대비 | 183 갭 | **183** | `section-display-budget` |
| comparison_chart 3토큰 대비 강화 | 183 | **183** | |
| lifestyle composite / height / grasp 계열 | 81~127 다수 | 81~127 | 세부 잔여는 보류표 |
| 사진 1장 상품도 섹션별 배경 생성(히어로와 동일 배경 반복 방지) | 13 (`uploaded.length>=2` 조건 지적) | 시점 불명 (코드 `uploaded.length>=1`로 이미 전환, 주석 확인) | 문서 추적 누락분, 187차 재점검 중 발견 |
| 후기 증거·안심 문장 게이팅 | 131~135 | 135 | |
| dead code / 과금 SSOT 정리 일부 | 136 | 136 | |
| persuasion framework labels | 138 | 138 | |
| 멀티카테고리 회귀 QA 픽스처 | 121/139 | 139 | |
| Recraft 선택 롤아웃·텍스트 환각 완화 | 141~143 | 141~143 | |
| 프리미엄 모드 프로브 | 144~146 | 145~146 | |
| canvas overflow clamp | 167 | 167 | |
| Pexels/업로드 상품 일치 가드 넛지 (UI 경고) | 181 | **186** | 폼·결과 안내 문구만 (유사도 검증 없음) |
| legacy `*-legacy-pexels.json` 삭제 | 170 | **186** | 코드 참조 0 → `139cha-session-electronics-legacy-pexels.json` 삭제 |
| food/fashion(+타 카테고리) 픽스처 뷰티 오염 잔여 정리 | 166 | **186** | keyFeatures는 168/169 완료; headlines·conceptBrief·wholesaleUrl 등 잔여 정리 + assert |
| electronics `comparison_chart` 네이티브 픽스처 커버리지 확인 | 169 | **186** | `139cha-session-electronics.json` chart metrics≥2 확인; legacy 삭제 |
| patch 미리보기 섹션 outline ring | 185 | **186** | `pendingHighlightIndex` → ring-2 registration-red + 스크롤 |
| ingredient_highlight 컴플라이언스 각주("*원료적 특성에 한함") | 159/160 | **160** (문서 누락 → **187**에 반영) | `INGREDIENT_HIGHLIGHT_COMPLIANCE_NOTE`(`cosmetics-compliance.ts`), live(`DetailSectionRenderer.tsx:1919`)·export(`export-detail-html.ts:513`) 양쪽 배선 코드로 재확인 완료 |
| 컷아웃/배경 그레인(노이즈) 매칭 (색상162·콘트라스트163·선명도164에 이은 4번째 매칭 축) | 164 후보 | **187** | `matchCutoutGrain()`(`photo-composite.ts`) — 배경 고주파 잔차 측정, `skipThreshold=2.2` 미만 스킵, 알파 0.02~0.05만 컷아웃에 overlay; `unifyCompositeGrain()`(합성 전체용)은 그대로 유지; `photo-enhance.ts`에서 sharpness 매칭 직후 배선 코드로 재확인 완료 |
| 색상 대비(WCAG) 감사 — 하드콘트라스트 블록(패턴C)·CTA/배지 accent 솔리드+paper 텍스트 조합 | 188 (자체 발굴, §3 소진 후 코드 재점검) | **188** | `ensureReadableOnPaper()`(`design-tokens.ts:558`) 신규 — 기존 `contrastRatioToken()` 재사용, hue/채도 유지·명도만 낮춤(`ensureReadableNeutralHue()`의 반대 방향). 패턴C `inkDeep`/`inkAccent`(121~133행)에 배선 + `solidAccentOnPaper()`/`solidDeepOnPaper()`(576~584행, CTA/배지용 UI 3:1) 신규 노출. 168개 조합(6카테고리×4변형×7) 감사 → 최초 9건 미달 → 재감사 168/168, `tsc` 0, API 0. 코드 대조 확인 완료 |
| 색상 대비(WCAG) 감사 — accent/deepAccent가 텍스트 색으로 밝은 배경(paper·옅은 틴트) 위에 직접 쓰이는 자리 (188 반대 방향) | 189 (자체 발굴, 188 감사 범위 밖 발견) | **189** | `readableTextAccent()`/`readableTextDeep()`(`design-tokens.ts:590~596`) 신규 — `ensureReadableOnPaper()` 그대로 재사용, 새 로직 없음. `DetailSectionRenderer.tsx`/`export-detail-html.ts`의 섹션 타이틀·라벨·체크아이콘 등 순수 텍스트 색 자리에 배선(라이브 44곳 배선 코드로 재확인). 96개 조합(역할4×카테고리6×변형4) 감사 → 최초 14건 미달(식품 base/warm/cool·펫 warm/bold) → 재감사 96/96, `tsc` 0, API 0 |
| 저관여(생활·펫) 표시 예산 추가 축소 — 183차가 API 필요로 분류했던 것을 코드 전용으로 재판단 | 183 트랙C (자체 재검토로 오판정 발견) | **190** | `section-display-budget.ts` 상수만 조정 — `MAX_EVIDENCE_LOW` 2→1(comparison_chart만 유지), `MAX_EXTRA_IMAGE_LOW` 1→0(material_detail/packaging_design/care_tip/material_feature 전부 데모트). 메커니즘·슬롯 목록·anti-hallucination 미변경. living/pet 181 raw 28 → 183차 20 → **190차 18**. `step_card`은 living「설치와 정리」·pet「급여 순서」로 실제 구매 정보라 판단해 유지(데모트 안 함). 뷰티/패션/식품/전자 영향 0건 확인 |
| 이미지 lazy-loading (성능, 신규 발굴) | 191 (자체 발굴, 174~190차 미다룬 축) | **191** | `components/SectionImage.tsx`에 `priority` prop 신설(기본 false→`loading="lazy" decoding="async"`, true→`loading="eager" fetchPriority="high"`). 라이브 히어로(`DetailSectionRenderer.tsx:1363`)만 `priority` 지정, 나머지 15곳 이상은 무변경으로 자동 lazy. `lib/export-detail-html.ts` 비히어로 `<img>` 13/13 lazy, 히어로 1곳만 `fetchPriority="high"` — grep으로 13/13·1 코드 대조 확인. 레이아웃/색/카피 변경 없음, `tsc` 0, API 0 |
| 반려동물 리뷰 나이·체중 언급 신호 (크롤링 재발굴) | 152차 크롤(펫프렌즈, 2026-09-09) — "다음 라운드 후보"로 43라운드 미착수 | **192** | `lib/review-insights.ts`에 `countPetAgeWeightMentions()`(정규식, `PET_AGE_WEIGHT_PATTERN`) 신규 — `lines` 순수 매칭, DeepSeek 호출 미증가, 모든 반환 경로에 `petAgeWeightMentionCount` 포함. `ReviewHighlightSection`에 필드 추가, `route.ts`에서 `body.category === "반려동물"`일 때만 값 전달(타 카테고리 "2kg"류 오작동 방지 게이팅). `DetailSectionRenderer.tsx`(3208~3216행)·`export-detail-html.ts`(885~888행) 양쪽에 조건부 캡션("반려동물 나이·체중 언급 리뷰 N건") 배선 — 코드 대조 확인. 품종 추출은 자유 텍스트라 지어내기 위험으로 제외(숫자 패턴만). `tsc` 0, API 0 |
| 갤러리 사진 그리드 간격 확대 + export 섹션 타이틀 폰트 누락 배선 (사용자 스크린샷 직접 지적) | 193 (사용자 스크린샷 피드백 직접 반영, 자체 코드 대조로 원인 특정) | **193** | 트랙A: `lib/design-tokens.ts` `galleryGapClass` DEFAULT+5카테고리 전부 `gap-0`/`gap-px`/`gap-1`(0~4px) → `gap-2`(8px) 통일, `DetailSectionRenderer.tsx` 뷰티 pairCompare도 `gap-2`, `export-detail-html.ts` 갤러리 그리드 하드코딩 `gap:2px` → `gap:8px`(live·export 픽셀값 일치). 트랙B: export HTML에서 117차 `dh2()`(카테고리별 헤드라인 폰트) 헬퍼를 안 거친 raw `<h2>` 섹션 타이틀 7곳(highlight_box/callout/gallery/caution/illustration_banner/review_highlight/fallback) 전부 `dh2()`로 전환, `dh2(` 카운트 16→23. 라이브 렌더러는 CSS 선택자(`[data-headline-face]`)로 이미 전체 적용돼 있어 문제 없었음 — export만 어긋나 있던 것. 코드 대조 확인 완료. `tsc` 0, API 0 |
| 섹션 배경 장식 텍스처("물방울") 전체 비활성화 (사용자 직접 지적 + 51차 원래 설계 의도 복원) | 51차(2026-09-01) 도입 시 "기본 꺼짐·옵트인" 명시됐으나 옵트인 스위치 누락으로 44라운드 항상 켜짐 | **194** | `lib/design-tokens.ts` `getCategoryPatternBackground()` 맨 앞에 `CATEGORY_PATTERN_ENABLED = false` 플래그 1줄 추가 — live(`composeSectionBackground`)/export(`resolveSectionSurface`) 공통 단일 지점이라 호출부 미수정으로 양쪽 자동 반영, `CATEGORY_PATTERN_SVG` 데이터·인코딩 로직은 삭제하지 않고 보존(재활성화 시 상수만 되돌리면 됨). 그라데이션 배경(패턴 A/B/D/E, 사용자가 말한 "단색 배경")·강조 색면 패턴 C는 미변경. `tsc` 0, 6카테고리 전부 `undefined` 반환 확인, API 0 |
| 에디토리얼 풀블리드(image_text) 섹션에 대형 타이포 오버레이 — 후커블 "이미지 풀블리드+대형 타이포+매거진풍 캡션" 격차 해소, 183차가 "DeepSeek 재생성 필요"로 오판정했던 것을 코드 전용으로 재판단 | 183 트랙C(오판정 발견) — "매거진풍 짧은 캡션" | **195~198** | 195: `EDITORIAL_BLEED_SLOTS`(usage_scenario/coordination 등 10슬롯) image_text에 한해 kicker+heading을 이미지 위 오버레이로 이동(`EDITORIAL_BLEED_OVERLAY_CLASS`, `TYPO.bannerTitle`/`heroCategory`), body는 이미지 아래 그대로 유지(정보량 무변화). 196: 195가 재사용한 `getHeroGradient`(브랜드 accent/deepAccent 기반)가 히어로보다 훨씬 짧은 `aspect-[4/5]` 박스에서 사진 색과 섞여 오염되는 회귀를 스크린샷 직접 대조로 발견 → `BRAND.ink` 중립 스크림(`getEditorialBleedScrim`, 정지점 0/24/42/55·불투명도 0.82)으로 교체, heading 1줄 고정. 197: 같은 `getHeroGradient` 패턴을 쓰는 다른 자리 전수 감사 — `custom_gif`도 동일 위험 확인돼 선제 수정(`getAspectVideoBleedScrim`), `illustration_banner`는 실사 확인 결과 "가짜 UI 가리기" 목적의 의도적 이중 그라데이션이라 문제없어 미수정. 198: 197차 스크린샷이 전부 깨진 이미지였던 것 발견(원인은 코드 버그가 아니라 **Supabase 스토리지 프로젝트 쿼터 초과 402** — 201~202차에서 해결됨, 아래 비고 참조) → 로컬 테스트 자산(`scripts/test-assets/_181cha-live/`)으로 재검증, 6카테고리(뷰티/전자/생활/펫/식품/패션) 전부 실사진 기준 스크림 정지점 조정 없이 오염 없음 최종 확인. `tsc` 0 전 라운드, API 0 |
| 식품 카테고리 재구매 의사 언급 리뷰 신호 (192차 정규식 패턴 확장) | §3 비어 있어 자체 발굴 — 192차 패턴이 타 카테고리로 확장된 적 없었음을 확인 | **203** | `lib/review-insights.ts`에 `countRepurchaseMentions()`(정규식, `REPURCHASE_PATTERN` = `재구매`\|`재주문`\|`또 (구매\|구입\|주문)`\|`계속 (구매\|구입)`) 신규 — `countPetAgeWeightMentions`와 동일 구조, DeepSeek 호출 미증가. `route.ts`에서 `body.category === "식품/건강기능식품"`일 때만 값 전달 — Cursor가 브리프의 `"식품"`(템플릿 키, 실제 폼 값 아님) 게이팅 오류를 스스로 발견해 `FOOD_CATEGORY`와 동일한 실제 폼 카테고리 문자열로 수정, Claude가 grep으로 이 수정을 재확인. 정규식도 Claude가 별도 샌드박스에서 재구현해 hit=2/miss=0/mixed=3 및 "또 사용해보니"류 오탐 없음을 독립 검증. `DetailSectionRenderer.tsx`·`export-detail-html.ts` 양쪽에 조건부 캡션("재구매 의사 언급 리뷰 N건") 배선. `tsc` 0, DeepSeek 신규 호출 0, API 0 |
| 패션 카테고리 사이즈·핏 언급 리뷰 신호 (192/203차 정규식 패턴 확장) | 사용자가 직접 방향 지정("패션 사이즈/핏") | **204** | `lib/review-insights.ts`에 `countSizeFitMentions()`(정규식, `SIZE_FIT_PATTERN` = `정사이즈`\|`사이즈(업\|다운\|크게\|작게)`) 신규 — "사이즈" 키워드 동반 표현만 매칭해 "크다/작다" 단독 문맥의존 오탐(예: "가격이 크게 부담되진 않아요") 원천 차단. `route.ts`에서 `body.category === "의류/패션"`일 때만 값 전달 — 203차 교훈으로 Claude가 브리프 작성 전 `CreateProductForm.tsx`의 `CATEGORIES` 배열을 직접 확인해 정확한 문자열을 미리 명시, Cursor 구현 후 grep으로 재대조. 정규식도 Claude가 별도 샌드박스에서 독립 재구현해 hit=2/mixed=3 및 오탐 방지 케이스 2건(0건 기대) 전부 재확인. `DetailSectionRenderer.tsx`·`export-detail-html.ts` 양쪽에 조건부 캡션("사이즈·핏 언급 리뷰 N건") 배선. `tsc` 0, DeepSeek 신규 호출 0, API 0 |
| 뷰티·전자·생활용품 장기 사용 후기 언급 리뷰 신호 (192/203/204차 정규식 패턴 확장, 3카테고리 동시 롤아웃) | 사용자 지정("남은 카테고리에 review-signal 계속") | **205** | `lib/review-insights.ts`에 `countLongTermUseMentions()`(정규식, `LONG_TERM_USE_PATTERN` = `\d+`+기간단위(일/주/개월/년)+`째?`+사용 동사) 신규 — 숫자+단위+동사가 모두 붙은 경우만 매칭, 한글 고유어 숫자("한 달째")는 192차와 동일 원칙으로 의도적 제외(안전한 과소집계). `route.ts`에서 `body.category`가 `"화장품/뷰티"`\|`"전자제품"`\|`"생활용품"` 3중 OR일 때만 값 전달(3카테고리가 동일 신호를 공유해 정규식 1개로 동시 커버). Claude가 별도 샌드박스에서 정규식을 독립 재구현해 hit/mixed 값과 오탐 방지 케이스("10개월 전에 상했어요", "가격이 10만원대") 전부 재확인, `route.ts` 3중 게이팅 문자열도 grep으로 재대조. `DetailSectionRenderer.tsx`·`export-detail-html.ts` 양쪽에 조건부 캡션("장기 사용 후기 N건") 배선. **"기타" 제외 실제 6개 카테고리 전부 review-signal 롤아웃 완료.** `tsc` 0, DeepSeek 신규 호출 0, API 0 |
| 전자제품 표시광고법 컴플라이언스 모듈 (식품/화장품 패턴 3번째 카테고리 확장, review-signal 종료 후 새 축) | Claude 자체 코드 재검토로 발굴("코드 재검토해서 새 축 자체 발굴") | **206** | `lib/electronics-compliance.ts` 신규 — `food-compliance.ts`/`cosmetics-compliance.ts`와 100% 동일 구조(`sanitizeText`/`sanitizeSection`/`reviewElectronicsCopy`), 13개 금지 표현(완벽 방수·고장 없음·평생 보장·전자파 없음·세계 최초 등) 치환 규칙. `route.ts` 3곳만 배선(import, `generateCopyWithDeepSeek`의 `electronicsGuide` 프롬프트 삽입, 최종 검수 3분기 `isElectronicsCopy` 추가) — `mfdsReviewed`/`replacements`가 이미 카테고리 무관 범용 타입이라 타입 파일·UI 컴포넌트 수정 불필요(review-signal 계열보다 단순). Claude가 브리프 작성 중 Node 샌드박스에서 정규식 13개를 직접 시뮬레이션해 "반영구적으로"→"반장기간으로" 단어 잘림 버그를 사전 발견·수정(순서 조정+`적?` 접미사 흡수). Cursor 구현 후 파일 재스테이징으로 소스 100% 대조, 중첩 매칭 케이스 별도 샌드박스 독립 재현 재확인, cosmetics/food 분기 회귀 없음 확인. `tsc` 0, DeepSeek 호출 경로 미추가, API 0 |
| ingredient_circle_pair texture_feel 필수 조건 완화 (148차부터 59라운드 미해결이던 후커블 격차) | 148차 실사(2026-09-09) 발견 — "다음 라운드 후보"로 59라운드 미착수 | **207** | `lib/apply-ingredient-circle-pair.ts`의 `applyIngredientCircleVisual()` circle-pair 경로가 `texture_feel`(선택 슬롯, 자주 생략됨) 필수였던 조건 제거 — circle-solo가 이미 쓰던 `pickAlternateIndex()`(texture_feel 우선, 없으면 다른 상품 사진 폴백)를 그대로 재사용. 신규 함수·로직 0, 렌더링 컴포넌트 미수정. Claude가 diff를 코드 대조해 재사용만 확인, 4개 케이스(texture_feel 있음/없음/이미지 1장뿐/이미 circle 있음)를 별도 Node 샌드박스에서 독립 재시뮬레이션해 보고서 수치와 전부 일치 확인. `tsc` 0, API 0 |
| 히어로 합성 그림자 **색온도** 매칭 (160차가 "히어로 그림자/색온도 A/B"로 "취향"만 놓고 미뤄뒀던 것 — 실제로는 이미 완료돼 있었음) | 209차 재분류 — §2 재검토 중 발견 | **162** (문서 반영 누락 → **209**에서 재분류만) | `lib/photo-composite.ts`의 `sampleBackdropAmbientColor()`(배경 4모서리 평균색 샘플)/`tintedShadowColor()`(ambient를 어둡게 눌러 그림자색 생성, darkness=0.78)가 `buildSilhouetteShadowBuffer`/`buildProductShadowSvg`/`buildSoftContactShadowSvg` 3개 함수 전부에 배선돼 있고, `lib/photo-enhance.ts`의 실제 합성 호출부 2곳(1612~1613행, 1945~1979행 부근)이 **A/B 실험 플래그 없이 무조건** ambient 샘플링 → tint 계산 → 적용하는 구조임을 코드로 재확인 — "따뜻한 우드톤 배경엔 어두운 브라운 그림자, 차가운 슬레이트 배경엔 어두운 네이비 그림자"가 이미 44라운드째(2026-09-11부터) 기본 동작. 188/189차 WCAG 감사도 이 값 기준으로 이미 통과했음. **그림자 "방향"(광원 각도)만 미해결로 남아 §2에 재기재** — 아래 참고 |
| Track A 알파 soft/hard 대비 강화 최종 확정 (169차가 "사용자 취향 대기"로 남겨뒀던 것 — 실제로는 이미 단일 값으로 확정 배선됨) | 209차 재분류 — §2 재검토 중 발견 | **169** (문서 반영 누락 → **209**에서 재분류만) | `lib/design-tokens.ts`의 `getSectionBackground()`에 soft/hard 두 버전을 고르는 토글이나 env 변수가 전혀 없음을 grep으로 확인(`SECTION_RHYTHM`/`RHYTHM_SOFT`/`RHYTHM_HARD` 등 매치 0건) — 169차가 만든 대비 강화값(A 0.48/0.24, B 168→125deg, D 175→210deg, E deepAccent 0.28/0.1)이 **유일한 프로덕션 값**으로 무조건 배선됨. 170~190차의 여러 라운드(특히 188/189차 WCAG 감사)가 이 값을 그대로 전제로 작업하며 별다른 재조정 요청 없이 44라운드 이상 운영됨 — "대기 중인 선택지"가 실제로는 존재하지 않음, 사용자가 다시 문제 제기하기 전까지는 확정으로 취급 |

**⚠️ 198차에서 발견한 운영 이슈 — 201~202차에서 해결 완료**: 세션 이미지가 저장된
Supabase 프로젝트 스토리지가 쿼터 초과(402 `exceed_storage_size_quota`)로 전체 잠긴
상태였습니다. 새 무료 조직/프로젝트(`pagzly-v2`, `qnstsrplqzoqlndojuyw`)로 전환해
해결했습니다 — 스키마 마이그레이션 16개, cron(`pg_cron`/`pg_net`) 등록까지 Claude가
Supabase 대시보드 SQL Editor로 직접 재확인 완료(자세한 내용은
`claude/pagzly-supabase-v2-migration-complete-2026-09-16.md` 참고). 기존 프로젝트
(`sblnthhayvrfkvaksest`)는 방치 상태로 남겨둠 — 급하지 않음.

---

## 2. 의도적 보류

| 항목 | 출처 | 사유 |
|------|------|------|
| SPF 기준표 다이어그램 | 160 | 연속량(dB)과 달리 카테고리형(15/30/50+); 뷰티는 용량(mL) 다이어그램으로 충분 |
| 온도(℃) 공개 기준표 | 160 | 판매자 스펙용 안정 기준 약함 |
| POINT 배지 ↔ 부위 점선 연결선 | 59/51 계열 | callout/pointLabel로 충분; 부위 좌표 연결은 공수 대비 이득 낮음 |
| 무지개 차트 / 경쟁사 실명 | 전 기간 | 가드레일 (`comparison-chart-guard`) |
| anti-hallucination 완화 | 160+ | 가드레일 |
| 가짜 후기·전문가·인증 배지·QC 그리드 | 48/159 | 거부 |
| AI 인물 생성 라이프스타일 | 64/81 | 원칙 |
| 144 env 추가 플립(이미지 레버) | 160 | 105/144 원칙 |
| effect 아이콘 전 카테고리 1→3 | 160 | 비용; live max 2 |
| 색면 A/B/D/E 채도 대폭 강화 | 166 | 취향 — 버그 아님 |
| Behance급 에디토리얼 여백·세리프 페르소나 전면 교체 | 183 | 174~184 타이포/토큰 축과 충돌; 카피 리듬 결합 필요 |
| 섹션 큐레이션 상한 A/B (취향만) | 181 | 코드 버그 아님; 실험 시 별도 허가 |
| 히어로 합성 그림자 **방향**(광원 각도) 다양화 | 160 (**209차** — "히어로 그림자/색온도 A/B" 항목에서 색온도 분리, 색온도는 완료로 이동) | AI 배경마다 광원 위치를 추정하는 로직이 없어 방향 매칭은 시도된 적 없음. 대부분의 스튜디오풍 상세컷은 수직 낙하 그림자가 업계 관례라 실제 니즈 자체가 불확실 — 사용자가 구체적으로 "이 사진 그림자가 어색하다"고 지적하기 전까지는 만들지 않음(158/159차 "억지 구현 금지" 원칙과 동일 결) |
| POINT 배지 ↔ 부위 점선 연결선 | 59/51 계열 | callout/pointLabel로 충분; 부위 좌표 연결은 공수 대비 이득 낮음. **209차 재확인**: 185차가 이보다 훨씬 복잡한 곡선 텍스트 링(`ingredient-ring-diagram.ts`)을 구현했으므로 "공수" 사유는 더 이상 유효하지 않지만, 여전히 기존 하이라이트 카드 디자인 언어(박스형)와 충돌 위험(159차 원 판단)이 핵심 사유라 보류 유지 |
| 섹션 드래그(DnD) 재배치 | 45/95 · §3 | **186 판단: 조치 없음** — `DetailStructureSidebar` up/down으로 충분. DnD는 공수 대비 UX 이득 낮음 |
| 패션 spec_table "세탁방법" 행 — 법정 고시가 상세페이지 위임(W컨셉 실사: "상품 품질표시 및 상품상세정보 참고")하지만 항상 플레이스홀더로 남음 | 213차 (W컨셉 실사 크롤링 자체 발굴) | `ProductInput`에 세탁·취급주의 입력 필드 자체가 없고(grep 0건), 원단 조성·가공별로 실제 세탁법이 다른 사실 정보라 AI가 일반화해서 채우면 잘못된 케어 정보를 지어내는 것 — 입력 필드 신규 추가도 위험(잘못된 표기 시 제품 손상·컴플레인). 213차 §6 참조 |

---

## 3. 미해결 · API 불필요 (코드만으로 가능)

*(비어 있음 — 212차 항목(spec_table productSizeHint 배선)이 Cursor 실행 + Claude 독립
검증(코드 대조 + 별도 샌드박스 재구현)까지 끝나 §1로 이동. 다음 라운드는 완전히 새 축을
자체 발굴하거나 사용자 지정 필요)*

> 206차 완료 후 Claude가 KC 인증정보 노출(marketplace_crawl_findings §2 후보)을 코드로
> 재확인 — `lib/enrich-product-sections.ts`의 `SPEC_SKELETONS["전자/가전"]`에 "KC 인증"
> 행이 이미 있고, 인증 미입력 시 행 자체를 생략(플레이스홀더 없음)하도록 이미 구현돼
> 있음을 확인(131~137행). **이 항목은 이미 해결된 상태라 브리프 불필요** — §1에 별도
> 추가하지 않고 여기 각주로만 기록.

---

## 4. API 필요 · 허가 대기

| 항목 | 출처 | 필요한 것 |
|------|------|-----------|
| 경쟁사 URL → 차별화 포인트 추출 (45 Track B) | 45 | DeepSeek/크롤+생성; 폼 필드는 이미 존재 |
| 매거진풍 짧은 캡션 | 183 | DeepSeek 톤/길이 재생성 |
| 히어로/라이프 **실사** 비중 확대 | 183 | Replicate/마켓 실사 재배정 |
| living/pet을 "대표+라이프 1~2컷" 수준까지 더 축소 | 183 | 템플릿 required 재설계 또는 short 기본 + 카피 재생성 (표시 예산 20은 183 완료) |
| DeepSeek JSON 복구 강화 | 181 | 생성 파이프라인 |
| Replicate 크레딧/402 운영 알림 | 181 | 운영/모니터링 |
| BRIA=4 픽커 UX + 기본값 승인 라이브 | 160/166 | 유료 1건+ |
| v4-svg 선별 롤아웃 A/B (checklist/highlight/usage) | 176 | Recraft |
| 아이콘 실패율 로그 집계(schnell 폴백) | 160 | 라이브 다건 |
| `/create/result` 풀 회귀 캡처 live↔export | 169 | 유료 가능 |
| 프리미엄 모드 실사용 1회 체험 | 145 | 사용자 허가 |
| 211차 라이프스타일 매칭 3축(화이트밸런스·선명도·그레인)이 실사에서 자연스러운 결과를 내는지 | 214+215+216차 (총 9건·$0.369) + 217차 무료 조사 + **218차 실행·검증 완료(유료 0건)** | 214/215차는 전부 `nano-banana-fallback`. 216차는 QA 우회로 `pasteCutoutOnScene` 실사 최초 도달했으나 품질 미흡. 217차(무료)가 원인 중 하나를 특정: electronics 상품컷이 다중 오브젝트 플랫레이. **218차 완료**: `matchCutoutWhiteBalance()`/`matchCutoutGrain()` 상수를 상향(mix 0.22/0.14/0.16→0.38/0.24/0.28, 클램프 ±18%→±35~40%, 그레인 알파 0.02~0.05→0.03~0.07) — 브리프 제안값은 1차 실행에서 축소율 24.9%로 미달해 WB만 재조정 후 35.3%로 통과했다는 보고를 Claude가 별도 Node 샌드박스에서 핵심 수치를 처음부터 재구현·재계산해 소수점 둘째자리까지 일치 확인(`218cha-cursor-execution-report.md`), `matchCutoutSharpness`·세이프가드·`lifestyle-product-composite.ts`는 mtime으로 미변경 재확인. **프로덕션에 반영된 상태로 유지** — 단 이는 합성 유닛 테스트 기준 개선이며 216차 electronics 실제 사진으로 육안 체감되는지는 미확인. 다음은 (a) 216차 페어로 유료 1건 재검증 (b) 217차 대체 상품컷+새 라이프스타일 사진으로 종합 재검증 (c) 여기서 종료 — (a)(b)는 유료 API 필요 |

**사용자 허가 전까지 생성 API(`/api/generate`, Replicate, Claude, DeepSeek 카피) 실행 금지 — 라운드 지시문에 명시된 경우만. 214차의 "2건만", 215차의 "4건", 216차의 "1건 + QA 전용 코드 변경(검증 후 되돌림 확인 완료)" 허가는 모두 소진됨. 217차는 무료 조사만, 218차는 유료 API 없이 유닛 테스트로만 검증(독립 재계산까지 완료) — 코드 변경은 프로덕션에 반영된 상태. 211차 매칭 3축 관련 추가 조치(유료 재검증 포함)는 §2/§4 갱신 내용대로 사용자 지시 대기.**

---

## 5. 이미 구현됨 · 재작업 금지 (185 조사)

| 기능 | 위치 | 비고 |
|------|------|------|
| 섹션 패치 API | `app/api/patch-section` + `handlePatchSection` | 호출 횟수 변경 금지(185) |
| 섹션별 채팅 메시지 히스토리 | `patchHistories` | 있음 |
| 구성 탭 순서 변경 | up/down (`DetailStructureSidebar`) | DnD 아님 — 186에서 DnD 보류 |
| 표시/숨김 | structure 에디터 | 95 Phase 2 |
| 요소 path + 레퍼런스 이미지 첨부 | 96 Phase 3 | |
| 174~184 아이콘/elevation/radius/font/hero/display-budget | — | **재작업 금지** |
| WCAG 대비 감사(`ensureReadableOnPaper`) | 188/189 | **재작업 금지** — 패턴C·CTA/배지 조합 168/168, 텍스트 색 조합 96/96 통과 상태 |
| 저관여 표시 예산(`section-display-budget.ts`) 생활·펫 18섹션 | 183/190 | **재작업 금지** — `MAX_EVIDENCE_LOW=1`/`MAX_EXTRA_IMAGE_LOW=0` 확정, `step_card` 유지 판단 근거 있음 |
| 이미지 lazy-loading (`SectionImage.tsx` `priority` prop, export 13곳) | 191 | **재작업 금지** — 히어로만 eager 확정, 나머지 전부 lazy |
| 반려동물 리뷰 나이·체중 신호 (`countPetAgeWeightMentions()`, `review_highlight` 캡션) | 192 | **재작업 금지** — 반려동물+count>0 게이팅 확정, 품종 추출 미포함 |
| 갤러리 그리드 간격(`galleryGapClass`=`gap-2`/8px), export `dh2()` 배선 7곳 | 193 | **재작업 금지** — 8px보다 더 키우지 않음, 카드/스텝 `<h3>`는 범위 밖으로 의도적 제외 |
| 섹션 배경 장식 텍스처 비활성화(`CATEGORY_PATTERN_ENABLED=false`) | 194 | **재작업 금지** — 그라데이션(A/B/D/E)·패턴 C는 그대로, SVG 데이터는 삭제 안 하고 플래그로만 끔 |
| 에디토리얼 풀블리드 오버레이(`EDITORIAL_BLEED_OVERLAY_CLASS`, `getEditorialBleedScrim`, `getAspectVideoBleedScrim`) | 195~198 | **재작업 금지** — 6카테고리 실사진 기준 정지점(0/24/42/55, 0/20/38/50)·불투명도(0.82) 확정, `illustration_banner`는 의도적으로 미수정(실사 확인 완료) |
| Supabase 프로젝트 전환(`pagzly-v2`, `qnstsrplqzoqlndojuyw`) — env/schema/cron | 201~202 (인프라, 이 백로그 §1에는 참고용으로만 기재) | **재작업 금지** — `.env.local` 3키·마이그레이션 16개·`pg_cron` 등록 전부 Claude 직접 재확인 완료. 기존 프로젝트는 건드리지 않음 |
| 식품 재구매 의사 리뷰 신호 (`countRepurchaseMentions()`, `REPURCHASE_PATTERN`, 카테고리 게이팅 `"식품/건강기능식품"`) | 203 | **재작업 금지** — 정규식·게이팅 문자열·DeepSeek 호출 불변 전부 Claude 독립 재검증 완료 |
| 패션 사이즈·핏 리뷰 신호 (`countSizeFitMentions()`, `SIZE_FIT_PATTERN`, 카테고리 게이팅 `"의류/패션"`) | 204 | **재작업 금지** — "크다/작다" 단독 표현 의도적으로 미포함(오탐 위험), 정규식·게이팅 문자열·DeepSeek 호출 불변 전부 Claude 독립 재검증 완료 |
| 뷰티·전자·생활 장기 사용 리뷰 신호 (`countLongTermUseMentions()`, `LONG_TERM_USE_PATTERN`, 카테고리 게이팅 `"화장품/뷰티"`\|`"전자제품"`\|`"생활용품"`) | 205 | **재작업 금지** — 한글 고유어 숫자("한 달째") 의도적으로 미포함, 정규식·3중 게이팅 문자열·DeepSeek 호출 불변 전부 Claude 독립 재검증 완료. **review-signal 계열(192/203/204/205) 6개 카테고리 전부 완료** |
| 전자제품 표시광고 컴플라이언스 (`lib/electronics-compliance.ts`, `reviewElectronicsCopy()`, 13개 치환 규칙, 카테고리 게이팅 `"전자제품"`) | 206 | **재작업 금지** — `food-compliance.ts`/`cosmetics-compliance.ts`와 동일 구조 확정, `mfdsReviewed`/`replacements` 범용 필드 재사용, 정규식 순서(`반영구적?`→`영구적?`)·13개 규칙·게이팅 문자열·DeepSeek 호출 불변 전부 Claude 독립 재검증 완료 |
| ingredient_circle_pair texture_feel 폴백 (`apply-ingredient-circle-pair.ts`, `pickAlternateIndex()` 재사용) | 207 | **재작업 금지** — texture_feel 있으면 그쪽 우선(회귀 없음), 없으면 대체 이미지로 폴백, 이미지 1장뿐이면 여전히 스킵(가드 유지) 전부 Claude 독립 재시뮬레이션 완료. 렌더링 컴포넌트 미수정 확정 |

---

## 6. 사용법 (다음 라운드)

1. 이 문서 §3 또는 §4에서 1~2개만 고른다. (§3이 비면 §4는 허가 후)  
2. 지시서에 「백로그 마스터 ID/행」을 적는다.  
3. 끝나면 표를 `완료됨`으로 옮기고 차수를 적는다.  
4. 새 「다음 후보」를 라운드 리포트에만 남기지 말고 **여기에도 한 줄 추가**.

최종 갱신: **218차 실행 검증** (Claude 직접 갱신 — Cursor의 218차 완료 보고를
diff 대조 + mtime 확인 + **별도 Node 샌드박스에서 핵심 수치 독립
재구현·재계산**(극단 색역 거리 150.04/97.24/62.88, reduction 35.3% 등 전부
일치)으로 검증. 매칭 강도 보강이 프로덕션에 안전하게 반영됐음을 확인,
`218cha-cursor-execution-report.md` 작성).

이전 갱신: 218차 (Claude 직접 갱신 — 217차 무료 조사에 이어 사용자가 216차 원인
후보 (1) "매칭 강도 부족"을 진행하기로 선택. `lib/photo-composite.ts`의
`matchCutoutWhiteBalance()`/`matchCutoutGrain()` 상수를 코드로 확인하고, 유료
API 없이 유닛 테스트로만 검증 가능한 범위로 스코프를 제한한
`cursor_brief_218cha_matching_intensity_boost.md` 작성. Cursor 실행 대기).

이전 갱신: 217차 (Claude 직접 갱신 — 216차 보고서가 제시한 품질 미흡 원인 후보 중
사용자가 "컷아웃 형태 문제부터 조사"(무료)를 선택 → 코드 변경·유료 API 없이 상품
이미지 직접 열람 + `lib/lifestyle-product-composite.ts` 코드 대조 + 216차 산출물
재확인으로 electronics 상품컷이 다중 오브젝트 플랫레이라는 원인을 확정. `전자제품/`
폴더 대체 후보 4개를 전부 열람해 단일 오브젝트 후보(`05-pexels-1279107.jpeg`)를
새로 식별. `217cha-cutout-shape-investigation.md` 참고).

이전 갱신: 216차 (Claude 직접 갱신 — 사용자가 판단을 위임한 QA 전용 우회 플래그를
Cursor가 실행 완료(1건·$0.015365)한 뒤, Claude가 report·summary.json·run-log·
`qa-flag.diff` 대조 + PC의 현재 소스 파일을 재스테이징해 `qaBypassGraspSafeguard`/
`allowPaste` 문자열 0건을 grep으로 직접 재현해 코드 되돌림을 검증(보고서 신뢰 아님),
`app/api/generate/route.ts` mtime으로 프로덕션 미연결도 시간상 재확인. **211차 매칭
경로(`pasteCutoutOnScene`, method=pixel-paste)가 214→215→216차 조사에서 처음으로
실사 도달**했으나, 산출 이미지를 원본과 직접 대조한 육안 확인 결과 화이트밸런스·그레인·
접촉 그림자가 아직 자연스럽지 않음을 확인 — §4 갱신, `216cha-cursor-execution-report.md`
참고. 코드는 완전히 되돌려짐, "생성 API 0건/관찰만" 원칙 기본값 복귀).

이전 갱신: 214차 (Claude 직접 갱신 — 사용자가 허가한 "2건만" 유료 실사 실행을
Cursor가 완료(합계 $0.108721)한 뒤, Claude가 보고서·summary.json·실행 스크립트·실제 코드·
산출 이미지 2장 전부 직접 대조해 독립 검증. 실행 자체는 가드레일 그대로 정확했으나, 89차
grasp 세이프가드가 두 건 모두에서 작동해 211차 매칭 경로(`pasteCutoutOnScene`)가 구조적으로
도달 불가능했음을 코드로 증명 — 원래 목적("211 매칭이 실사에서 자연스러운가")은 미해결로
§4에 재등록. 코드 변경 없음, `214cha-cursor-execution-report.md` 참고).

이전 갱신: 207차 (Claude 직접 갱신 — 사용자 지시 "후커블 및 디자이너가 만든 수준까지
나와야해"에 따라 148차부터 59라운드 미착수였던 `ingredient_circle_pair` texture_feel
필수 조건 버그 수정 완료·검증. `pickAlternateIndex()` 재사용만으로 해소돼 신규 로직
0줄, 렌더링 컴포넌트 미수정 확정. Claude가 diff 코드 대조 + 4개 케이스 별도 샌드박스
독립 재시뮬레이션으로 보고서 수치 전부 일치 확인. §3의 마지막 항목이 처리돼 다시
비게 됨 — 다음 라운드는 완전히 새 축 자체 발굴 또는 사용자 지정 필요).

이전 갱신: 206차 (Claude 직접 갱신 — 사용자 지시 "코드 재검토해서 새 축 자체 발굴"에
따라 식품/화장품 컴플라이언스 패턴을 전자제품으로 확장, `reviewElectronicsCopy()` 코드
대조 확인. 같은 조사 과정에서 marketplace_crawl_findings의 "전자제품 KC 인증 노출"
후보는 이미 `enrich-product-sections.ts`에 구현돼 있음을 확인해 §3 각주로 기록, 별도
브리프 불필요 판단).

그 이전: 205차 (Claude 직접 갱신 — 사용자 지정으로 review-signal 계열의 마지막
라운드 진행. 화장품/뷰티·전자제품·생활용품 3카테고리를 "장기 사용 후기" 신호 하나로
동시 커버, 정규식·3중 게이팅 문자열을 Claude가 독립 재검증. 이걸로 192/203/204/205
전체 review-signal 롤아웃이 "기타"를 제외한 실제 6개 카테고리 전부에서 완료됨 —
`countLongTermUseMentions()` 코드 대조 확인. §3을 review-signal 계열 종료로 갱신, 다음
라운드는 완전히 새 축이 필요함을 명시).

그 이전: 204차 (Claude 직접 갱신 — 사용자가 직접 지정한 "패션 사이즈/핏 리뷰 신호"를
192/203차와 동일 구조로 구현·검증. "크다/작다" 단독 표현의 오탐 위험을 사전에 배제하도록
"사이즈" 키워드 동반 조건으로 설계, 203차에서 겪은 카테고리 문자열 오류를 이번엔 사전에
`CreateProductForm.tsx` 확인으로 예방. Cursor 구현 후 Claude가 정규식·게이팅 문자열을
독립 재검증. `countSizeFitMentions()` 코드 대조 확인).

그 이전: 203차 (Claude 직접 갱신 — §3이 비어 있어 코드 재검토로 192차 반려동물
정규식 리뷰 신호 패턴이 타 카테고리로 확장된 적 없었음을 발견, 식품 "재구매 의사" 신호로
동일 구조 확장. Cursor의 카테고리 게이팅 문자열 자체 수정(`"식품"`→`"식품/건강기능식품"`)을
grep으로 재확인, 정규식 동작을 별도 샌드박스에서 독립 재구현해 검증. `countRepurchaseMentions()`
코드 대조 확인).

그 이전: 195~198차 (Claude 직접 갱신 — "후커블과 똑같은 퀄리티" 요구에서 183차가
API 필요로 오판정했던 "매거진풍 캡션/대형 타이포 오버레이"를 코드 전용으로 재판단·구현,
구현 중 발견한 회귀(브랜드색 스크림 오염) 2건을 스크린샷 직접 대조로 잡아 수정, QA
스크린샷 자체가 Supabase 쿼터 초과로 깨져 있던 것까지 발견해 로컬 자산으로 재검증 완료.
`getEditorialBleedScrim`/`getAspectVideoBleedScrim` 코드 대조 확인).

더 이전: 194차 이하는 이 문서 앞선 버전 히스토리 참고.
