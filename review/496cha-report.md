# 496차 보고서

## 확인하지 못한 항목
- 320px 실기기 렌더 미실시.
- `/label-check` 공개 인덱싱 정책 미결정(현재 noindex 유지).
- `KR-PEND-001` 제안 문구 미작성(커버리지 제외).

## 제안 커버리지
- 필수 id(비 PEND 규칙 + ad-phrases) 대비 제안 파일 **누락 0**.
- kind 라벨: fix=수정 제안 / soften=표현 완화 예시 / evidence=근거 자료 확인.

## 금지어 검색 허용 목록
| 패턴 | 이유 |
|------|------|
| ‘위반’이 아니라 | 면책 |
| 위반 가능 | 상태 라벨 |
| 위반 여부 | 부정·면책 |
| 법적 판단이 아닙니다 | 면책 |
| severity_if_missing / "위반" 매핑 | 코드 필드 |
| 회귀 단정 검사 문구 | 테스트 |

## 접근성 수정 목록
- 시장 radio name, PDF label/aria-label 연결.
- new/history noindex layout.
- 오류 role="alert" 유지.

## 변경 요지
- `lib/label-check/fix-suggestions-kr.ts` 로드·부착
- ResultPanel·게스트 UI kind 라벨
- `forbidden-words-496.ts` + `label-check-496` 회귀

## 검증
- tsc / build / 회귀 496
- push: cloud-work only
