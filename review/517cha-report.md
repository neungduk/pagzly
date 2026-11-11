# 517차 보고서 — 점검 시작·결과 v5 + 랜딩 결과 열

## 확인하지 못한 항목
- 실브라우저 360/860 캡처·가로 스크롤 육안(정적 CSS·미디어쿼리로 대체)
- PDF 1페이지 캔버스 미리보기 — 기존 pdfjs 추출 경로만 있어 **문서 아이콘 카드로 대체**(이미지는 `createObjectURL` 썸네일)
- ResultView517 실기기 prefers-reduced-motion·핀 클릭 스크롤 체감

## 적용 요약
- 공용 `lc517` 토큰·wash(2 blob)·얇은 헤더. CTA `무료로 점검하기` → `점검하기`
- 점검 시작: 2열 무대+설정, 세그먼트 탭, 칩 옵션(6개+더 보기), 미리보기/모바일 하단 바
- 결과: 어두운 요약 띠, 한 줄 행(단일 펼침), FindingCardBody512 유지, 읽은 라벨 핀(정규화 첫 일치)
- 저장 결과(history): `sourceText` 없음 → 라벨 패널 숨김
- 랜딩: v4b 검정 핵심 카드 + 행 3 + 번호 핀. 515 칩·mk·띠 유지
- 구 UploadCard/ResultView 파일 유지, 페이지는 517로 연결

## 기존 테스트 마크업 조정
- 없음(구 파일 유지·새 스위트 추가). CTA 상수만 `ui-status-507.ts`에서 교체

## 검증
- `npx tsc --noEmit` 통과
- `npm run regression:label-check` 29/29 통과
- `npm run build` 통과

## 커밋 해시
- `75ff44a` feat(517): shared v5 tokens, wash, pin helper, busy overlay
- `76be02c` feat(517): check-start v5 stage and settings panel
- `20f05ae` feat(517): result v5 summary band and accordion rows
- `2609cde` feat(517): landing result column v4b and client sourceText
- 이 커밋 `test(517): …` — `git log -5 --oneline` 확인
