# 467차 보고서 — 상세페이지 "다이나믹" 대공사 (깊이·겹침·스케일 대비·기울임·도형 전환)

## 0. 한눈에
- **push**: `cloud-work` 완료(Phase마다 커밋·push). main에는 push하지 않음.
- 466차 보고서 커밋 이후에 시작했다(처음 pull 때는 466차가 없어 "466차 미완료"를 기록하고 466차를 먼저 끝냈다).
- 눈으로 확인하지 않았다(캡처·브라우저·실사진·네트워크 없음). 전부 `NEXT_PUBLIC_DESIGN_V5=on` 뒤(기본 꺼짐), V4 꺼짐·편집 모드 미적용. 롤백 = 플래그 끄기.
- **다이나믹 목표 36/48 달성**(§4). 미달은 사진 틀 종류(8건)·직선 이음새 비율(impact·pop 등)·일부 겹침/카드 — 원인과 수치 그대로.
- **중요한 한계**: 초점 스케일(④)은 큰 **배경 글자(장식)** 가 섹션 최대 글자로 잡힌 값이다. 읽히는 제목 크기가 3배가 된 것이 아니다.

## 1. Phase 표
| Phase | 판정 | 요약 |
|---|---|---|
| 0 진단 | ○ | `docs/dynamics-audit-467.md`: 전 기준선·안전 SVG/CSS 조사(불확실 목록)·일반 섹션 후보·목표 선기재, 지표 도구 |
| 1 부품 라이브러리 | ○ | `lib/dynamics-v5.ts` 30종 + `dynamics-467` 극단 입력 회귀 |
| 2 초점·레이어 | △ | 큰 배경 글자·기울인 판·스티커/테이프·카드 변주를 `lib/dynamics-layer-v5.ts`로. 변형별 레시피 재작성은 하지 않고 레이어(후처리)로 일반화 |
| 3 일반 섹션 V5 단일 소스 | △ | 3종(stat_infographic→stats, gallery→gallery, text_only→story). 목표 "8종 이상"에는 못 미침(사유 §5) |
| 4 페이지 레벨 | △ | 이음새 5종·걸침·티커 띠(최대 1)·상한. 직선 이음새 비율 일부 미달. 좌우 비대칭 구도 계획기는 따로 만들지 않음(보고용 지표만) |
| 5 사진 틀·일러스트 | △ | 사진 틀 모서리 6종 변주·배경 질감 3종. 틀 종류 목표 미달, 아이콘 구성 레시피 미착수 |
| 6 모션(선택) | 건너뜀 | PNG가 라이브 DOM을 복제하므로 모션 CSS가 PNG에 새지 않는다는 보장을 코드로 확인하지 못함 |
| 7 ph2·갤러리 | ○ | `scripts/make-ph2-467.ts`(SVG 24개), 갤러리 `--ph2` |
| 8 안전망·지표 | ○ | `dynamics-467`·`dynamics-report-467` |
| 9 문서·마무리 | ○ | `docs/v5-overview.md` 다이나믹 레이어, `docs/pc-todo.md` 눈 검수, 이 보고서 |

## 2. 출력 잠금(최종)
V5 꺼짐(UP1 꺼짐/켜짐) vs 466차 끝 export 21·섹션 단독·라이브 SSR: diff 0 / 438차 기준 4a·4b·4c 통과. 새 코드는 소스 가드로 V5 켜짐·토큰(편집 모드 null) 뒤에서만 호출됨을 회귀가 잠금.

## 3. 만든 것
- **부품 30종**(`lib/dynamics-v5.ts`): bigWord·numeralStack·statBlock / overlapStack·layeredCard·shadowPlate·floatingObject / tiltCard·tape·sticker·ribbon·stampBadge / slant·wave·scallop·zigzag·step 이음새·overlapSeam / highlighter·scribbleCircle·squiggleUnderline·arrowCallout / mosaic·polaroidStack·stepPath·gaugeRing·tickerBand·dotGrid·stripeField·gridPaper. 모두 순수 함수·결정적·`aria-hidden`/`pointer-events:none` 장식·넘침 래퍼.
- **레이어**(`lib/dynamics-layer-v5.ts`): 계획(표시 단계) + 적용(`impactHtml` 끝, 라이브·export 같은 함수). 적용 대상은 v4 블록 + 글 위주 기존 임팩트. 히어로·구매 카드·접점(가격)·고지·주의는 장식 금지(회귀가 검사).
- **일반 섹션 다시 그리기**: stat_infographic(수치 전부 number·측정·각주/자체평가 없음·숫자 게이트 통과) → stats(bignum·trio·rings), gallery(2~5장) → gallery(mosaic·polaroid), text_only(40~420자·강조/말풍선 없음) → story. 조건 미달·디스클레이머 필요한 수치는 기존 렌더러 그대로.
- **강도**: impact·pop 5 / softlife·narrative·catalog 4 / editorial·techsheet·luxe 3.
- **검수용 사진**: ph2 SVG(제품 8 × 톤 3, 스튜디오 조명 gradient·바닥 그림자). 앱·말뭉치·기준 출력은 불변.

## 4. 다이나믹 지표 전/후 (목표는 코드 전에 `docs/dynamics-audit-467.md` §4에 적음)
(전체 48칸 표: 같은 문서 §7.) 요약 — 466차 끝 → 467차(페이지당 평균, 말뭉치 21):
| 지표 | 목표(강도 5/4/3) | 466차 끝 | 467차 | 달성 |
|---|---|---|---|---|
| ①겹침 | ≥12/10/8 | 3.3~9.9 | 8.0~14.3 | 7/8 (softlife 9.95 ×) |
| ②기울임 | ≥8/5/3 | 0.4~9.1 | 7.8~16.9 | 8/8 |
| ④초점 스케일 중앙값 | ≥3.0/2.6/2.2 | 1.6~1.9 | 8.0~12.7 | 8/8 (장식 글자 포함 — 위 한계) |
| ⑥직선 이음새 비율 | ≤0.45/0.55/0.65 | 0.76~0.79 | 0.51~0.62 | 6/8 (impact 0.52·pop 0.51 ×) |
| ⑤같은 카드 서명 비율 | ≤0.40/0.45/0.50 | 0.29~0.62 | 0.28~0.50 | 7/8 (catalog 0.50 ×) — **지표 정정** 아래 |
| ⑦사진 틀 종류 | ≥8/7/6 | 4.0~4.9 | 4.95~6.6 | 0/8 |
총 **36/48**. 지표 정정 1건: ⑤는 Phase 0 표가 정규식 때문에 과대(0.61~0.79)였고, 정정한 기준선(0.29~0.62)을 Phase 2에서 기록했다(목표는 그대로).
크기: V5 export는 UP1 대비 평균 +11~24%, 최대 +34.9%(pop) — 상한 +35% 안(상한을 465/466차 +25%에서 +35%로 올렸다, 467차 지시). 색상군·대비·금지 CSS·새 문구는 기존 회귀 통과.

## 5. 못 한 것·원인
- **사진 틀 종류**: 페이지당 사진 틀이 평균 5.4개뿐 → 목표 6~8이 사진 수를 넘는다. 모서리 6종 변주로 4.0~4.9 → 5.0~6.6까지.
- **일반 섹션 8종 이상**: 변환한 건 3종. 나머지(`highlight_box` 진한 블록·`illustration_banner` 배너 기본값 금지·`target_persona`·`spec_table`·`comparison_*`·`checklist`·`color_variation` 선택 인터랙션·`review_highlight`·`step_card`)는 정책·인터랙션·저빈도로 미변환.
- **변형별 레시피 재작성**: 변형마다 아키타입 조합을 따로 쓰지 않고 후처리 레이어로 일반화했다(크기·위험 때문).
- **좌우 비대칭 계획기·아이콘 구성 레시피**: 만들지 않음. **모션**: 건너뜀(위 표).
- **직선 이음새**: impact·pop은 크기 상한에 막혀 상한을 못 올림.
- 이번 차수 중 사고: 파일을 읽기 전에 쓰기 모드로 열어 `impact-templates.ts`가 비었다가 git에서 즉시 복구(커밋 전, 영향 없음).

## 6. 실행하지 않은 것
캡처, PNG 대조, 퍼징, pc-verify, launch-smoke, next build/dev, 전체 run-all, Playwright, 모든 네트워크, 사진 다운로드·업로드. 모두 문자열 렌더로만.

## 7. 통과 확인(단독 실행)
tsc, dynamics-467, v5-465, v5-466, variety-463, band-464, heavy-guard-461, layout-variants, variant-audit, twin-sections, env-names-461, migration-order-461, migration-sql-460, migrate-storage-460, premigration-draft-453.

## 8. 완료 기준 D
| # | 기준 | 판정 |
|---|---|---|
| 1 | 출력 잠금 diff 0 | ○ |
| 2 | 부품 20종 이상 + 단위 회귀 | ○ (30종) |
| 3 | 모든 V5 섹션 초점 규칙·인접 중복 없음 | △ (레이어로 일반화, 인접 같은 이음새 금지·상한 검사) |
| 4 | 일반 섹션 8종 이상 단일 소스 | △ (3종) |
| 5 | 이음새·걸침·티커·비대칭 계획기 | △ (비대칭 계획기 없음) |
| 6 | 사진 틀 10종 이상 + 폴백 | × (모서리 6종 변주, 기존 틀과 합쳐도 목표 미달) |
| 7 | 사전 목표 달성 | △ 36/48 |
| 8 | 안전 항목(가격·규정 안전 여백 포함) | ○ |
| 9 | ph2·갤러리 옵션 | ○ |

## 9. 집 PC에서 (R2 이전 완료 전)
```
git checkout cloud-work && git pull --no-rebase origin cloud-work
npm ci
npx tsc --noEmit
npx tsx scripts/regression/run-all.ts
```
R2 이전 뒤에만: `docs/pc-todo.md` "V5 다이나믹 눈 검수"(갤러리: `npx tsx scripts/v5-gallery-465.ts --compare=fx-skincare-serum --ph2 --localize-blocked`).

## 10. 다음 차수 제안
1. 눈 검수 결과로 장식 농도(기울인 판·큰 글자·이음새 수) 조정 — 과하면 줄이는 쪽이 안전.
2. 진짜 초점: 제목 자체를 키우는 변형별 레시피(읽히는 글자 기준 지표로 교체).
3. 사진 틀: 사진 수를 늘리거나(콘텐츠) 같은 사진을 다른 틀로 두 번 쓰지 않는 규칙 아래 틀 종류 지표를 "사진당 고유 틀"로 재정의.
4. 일반 섹션 추가 변환(target_persona·spec_table 등) — 정책 검토 후.
5. 모션: PNG 캡처 경로에서 모션 비활성 훅을 확인한 뒤 별도 플래그로.
