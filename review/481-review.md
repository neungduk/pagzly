# 481차 눈 검수 — 실사 데이터 기준 전/후

픽스처: `scripts/fixtures/live-481.json` (product `e8c1c270-…`).  
캡처: `review/481-captures/` (커밋 금지). 프리뷰 전: `review/480-captures/result-*.png`.

## 1회차

| 항목 | 전 (480 실사·프리뷰 editorial) | 후 (로컬 auto = **catalog**) |
|------|-------------------------------|------------------------------|
| data-pz-bsig / vsig | editorial | catalog (clinic+쿨 팔레트) |
| 제목 서체 로드 | Gowun Batang(+Noto), 라이브에서 display-headline이 Noto에 덮임 | catalog=Noto(정상). 8종 강제 시 제목 패밀리 분화(고운바탕·돋움·블랙한·도현·세리프·주아) |
| hero-stack | vsig 있으나 AI 파스텔 면과 충돌로 약해 보임 | 사진 래퍼 `background:var(--pz-surface)` |
| slug 노출 | 사이드바·킥커에 seller_trust… | SLOT_LABELS+킥커 폴백 수정 → 한글/PROOF |
| 시계 일러스트 | 키워드 느슨 매칭 | 시각·지속 단위 있을 때만 |
| 빈 페르소나 알약 | 빈 사진 칸 | 텍스트 알약 폴백 |

소감: 같은 실사 JSON으로 자동 선택이 editorial→catalog로 갈라지고, 8종 강제 캡처는 서체·히어로 틀이 눈에 띄게 다르다. 프리뷰 재배포 전엔 라이브 화면은 아직 480과 같음.

## 2회차

| 확인 | 결과 |
|------|------|
| `npx tsx scripts/regression/live-481.ts` | 통과 |
| type-474 / color-eye-476 / hero-472 | 통과 |
| auto HTML `data-pz-bsig` | catalog |
| 8×(750,390) 캡처 재생성 | 완료 (auto-catalog 포함) |
| softlife vs impact vs techsheet (390) | 히어로 틀·면색·제목 서체 차이 확인 |

소감: catalog 자동본은 스플릿 흰 면·스펙형 바에 가깝고, impact/pop와 첫 화면이 분명히 갈린다. 남은 한계는 AI 사진 픽셀 안의 파스텔(이미지 자체)과, 프리뷰 미재배포 상태의 라이브 확인.

## 비교 메모 (로컬 editorial 강제 vs 프리뷰)
로컬 `editorial` 강제 렌더 ≈ 480 프리뷰 골격(동일 CDN 사진·섹션). 격차의 1순위는 “렌더 엔진 불일치”가 아니라 **선택·라이브 CSS 순서·라벨·면색**.
