# 표시사항 규칙 데이터 갱신 안내 (비개발자용)

이 문서는 `/label-check`가 읽는 **규칙 JSON**만 다룹니다. 코드 수정이 필요하면 개발자에게 요청하세요.

## 1. 파일 위치와 역할

모두 `review/data/` 아래입니다.

| 파일 | 역할 |
|------|------|
| `kr_label_rules_draft_v0.1.json` | 한국 표시사항 규칙표 |
| `ad-phrases-kr_draft_v0.1.json` | 한국 광고 표현(확인 필요) |
| `fix-suggestions-kr_draft_v0.1.json` | 한국 수정 제안 문구 |
| `us_label_rules_draft_v0.1.json` | 미국 표시사항 규칙표 |
| `us-ad-phrases_draft_v0.1.json` | 미국 광고 표현(확인 필요) |

## 2. 코드가 실제로 읽는 필드

### 한국 규칙표 (`kr_label_rules`)
- **사용**: `id`, `category`, `title`, `check_type`, `rule`, `severity_if_missing`, `examples`, `notes`, `applies_to`
- **참고용**: `meta`의 disclaimer·not_covered·changelog, 각 규칙의 `source`·`source_verified` 등(화면 판정 로직에 직접 쓰이지 않음)

### 한국 광고 (`ad-phrases-kr`)
- **사용**: `id`, `category`, `title`, `patterns`, `condition`(`always`|`non_functional`), `needs_evidence`, `severity`
- **참고용**: `meta`, `source` 등

### 한국 수정 제안 (`fix-suggestions-kr`)
- **사용**: `suggestions[규칙id].fix_kind`, `fix_ko`, `fix_example`
- 규칙·광고 **모든 비-PEND id**에 항목이 있어야 합니다.

### 미국 규칙표 (`us_label_rules`)
- **사용**: `id`, `title_ko`, `citation`, `requirement_ko`, `look_for`, `severity_if_missing`, `check_type`, `fix_ko`, `fix_example_en`, `note`
- **참고용**: `meta`, `source`, `source_verified`, `market` 필드 등

### 미국 광고 (`us-ad-phrases`)
- **사용**: `id`, `category`, `title_ko`, `patterns`, `condition`, `needs_evidence`, `fix_ko`, `fix_example_en`
- **참고용**: `meta`, `source`, `severity`(표시는 attention 고정)

## 3. 갱신 순서 (반드시 이 순서)

1. **데이터만** 수정(위 5파일). 원본 백업 또는 브랜치에서 작업.
2. 로컬에서 `npm run validate:rules` — 오류 0인지 확인.
3. `npm run regression:label-check` — 표시사항 전용 회귀 통과(빠름). 전체(상세페이지 포함)는 `npm run regression`.
4. `npx tsc --noEmit` 및 `npm run build`.
5. `cloud-work` 브랜치에 커밋·푸시. **main / Production 직접 푸시 금지.**

## 4. 흔한 실수

- JSON 마지막 쉼표, 따옴표 짝 안 맞음 → `validate:rules`가 파싱 오류.
- `id` 중복.
- 규칙/광고를 추가했는데 `fix-suggestions-kr`에 같은 id가 없음.
- `condition`에 `always` / `non_functional` 이외 값.
- 빈 패턴·한 글자 패턴(경고). 미국 `permanently`처럼 **너무 짧은 단독 단어**는 포장 문구 오탐 위험이 큼.

## 5. 되돌리기

잘못 올린 커밋은 개발자와 함께 `git revert <커밋해시>`로 되돌립니다. 파일만 예전 내용으로 덮어쓴 뒤 다시 검증·회귀·푸시해도 됩니다.

## 6. 결과 화면의 「점검 기준」

사용자는 결과 하단에 `점검 기준: 규칙표 v… (날짜)`를 봅니다. `meta.version`과 `meta.date`(없으면 `meta.created`, 둘 다 없으면 **미표기**)에서 옵니다. 데이터를 바꾸면 version/date도 함께 갱신하세요.

## 7. 회귀 실행 방법

- 빠른 표시사항 회귀: `npm run regression:label-check` (수 십 초~2분).
- `npm run regression`은 전체(상세페이지 시험 포함)라 매우 오래 걸리고, 알려진 NG가 섞여 있다.
- 알려진 NG·분류는 `review/502cha-report.md`를 본다.
