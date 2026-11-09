# 한국 규칙 — 수정 제안 필드 작성 대기 (기획 담당)

`kr_label_rules_draft_v0.1.json`·`ad-phrases-kr_draft_v0.1.json`에는 `fix_ko` / `fix_example` / `how_to_fix` 필드가 없다.
494차는 데이터 파일을 수정하지 않는다. 아래 id에 수정 제안 초안이 필요하다.

## 규칙표 (표시·기재)
- KR-LBL-001 ~ KR-LBL-027 (전 항목)
- 특히 우선: KR-LBL-002(상호·주소), KR-LBL-003(용량), KR-LBL-004(사용기한), KR-LBL-005(제조번호), KR-LBL-006(전성분), KR-LBL-009(주의사항), KR-LBL-022(알레르기)

## 광고 (규칙표 ADV)
- KR-ADV-001 ~ KR-ADV-007

## 광고 표현 초안 (ad-phrases)
- AD-MED-001 ~ AD-MED-003
- AD-FUN-001 ~ AD-FUN-006
- AD-MIS-001 ~ AD-MIS-010
- AD-EVD-001 ~ AD-EVD-002

## 권장 스키마 (작성 시)
```json
{
  "fix_ko": "어떻게 고치면 되는지 한두 문장",
  "fix_example": "예시 문구(그대로 쓰지 말 것)",
  "fix_kind": "fix | soften | evidence"
}
```
