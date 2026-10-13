# Pagzly 자동 반복 (Claude 플래너 + Cursor 실행기)

컴퓨터를 켜 두고 스크립트 하나를 실행하면, 아래 한 바퀴가 자동으로 돈다.

1. **Claude**(`claude -p`)가 직전 보고서를 읽고 다음 브리프(`cursor_brief_NNNcha.md`)를 쓴다
2. **Cursor**(`agent -p --force`)가 브리프대로 작업하고, 작업 브랜치에 커밋하고, 보고서(`review/NNNcha-report.md`)를 쓴다
3. **스크립트**가 점검한다: 금지 파일, 보호 파일, 기능 플래그, tsc, eslint, build, 패리티, 점수표
4. 모두 통과하고 격차가 줄었으면 다음 바퀴, 아니면 멈춘다

## 안전장치 한눈에 보기

| 위험 | 막는 방법 |
|---|---|
| main에 잘못된 코드가 배포됨 | 작업은 `auto/loop-...` 브랜치에서만 하고 **push하지 않는다**(`pushBranch: false`). main 병합과 푸시는 사용자가 아침에 직접 한다 |
| 유료 API 비용 | **유료 검증은 반복 밖에서, 사용자가 허락할 때만 한다.** 반복은 `REPLICATE_API_TOKEN`이 `.env.local` 등에서 켜져 있거나 환경변수로 잡혀 있으면 **시작 자체를 거부**한다. 그 외에도 실행기 프로세스에서 키를 지우고, 프롬프트로 금지하고, 유료·인물 검출 플래그가 false인지 매 라운드 확인한다 (Replicate의 월 사용 한도 기능은 중단되어 쓸 수 없다) |
| 무한 반복 | 라운드 상한(`maxRounds` 3), 시간 상한(`maxHours` 6), 라운드별 시간 제한, 연속 2라운드 개선 없으면 멈춤 |
| 금지 파일 커밋 | 커밋에 `.env*`, `review/`, `cursor_brief_*`, `loop/` 등이 있으면 멈춤 |
| 사진합성 코드 변경 | 보호 파일 3개가 바뀌면 멈춤 |
| 품질 후퇴 | tsc, eslint, build, 패리티, 하이드레이션 중 하나라도 깨지면 멈춤 |
| 사람이 정할 일을 에이전트가 정함 | 유료 승인, 인물 검출 켜기, `illustration_banner`는 "사람 결정 대기"로 보고서에만 남김 |

한계: 실행기가 `.env.local` 파일을 직접 읽는 것까지는 막지 못한다. 그래서 유료 비용의 **마지막 방어선은 공급사 계정의 사용 한도**다.

## 처음 한 번만 준비

1. **Cursor CLI 설치**: PowerShell에서 `irm 'https://cursor.com/install?win32=true' | iex` 실행 후 새 창에서 `agent --version` 확인. 로그인(`agent login`) 하거나 `CURSOR_API_KEY` 환경변수를 설정한다
2. **Claude Code CLI 설치**: 설치 후 `claude --version` 확인, `claude`를 한 번 실행해 로그인한다. 플래너가 쓰는 옵션(`--allowedTools`, `--max-turns`)이 현재 버전에서 맞는지 `claude --help`로 확인한다
3. **Replicate 키 끄기**: 반복을 돌리기 전에 `.env.local`에서 `REPLICATE_API_TOKEN=...` 줄 맨 앞에 `#`를 붙인다 (환경변수로 설정했다면 해제한다). 켜져 있으면 반복이 시작되지 않는다. 반복이 끝난 뒤, 유료 검증을 직접 허락할 때만 `#`를 지운다
4. **Windows 절전 끄기** (전원 연결 상태에서): 관리자 PowerShell에서
   ```
   powercfg /change standby-timeout-ac 0
   powercfg /change monitor-timeout-ac 0
   ```
   화면 잠금은 켜 둬도 된다. 로그아웃이나 종료, 인터넷 끊김은 반복을 멈추게 한다
5. `review/loop-gaps.md`가 없으면 `loop/gaps-seed.md`를 복사해서 만든다 (설정 브리프가 처리함)

## 실행

저장소 루트(`C:\Users\GIF\Desktop\pagelab\pagelab`)에서:

```
# 1) 계획만 보기 (아무것도 호출하지 않음)
powershell -ExecutionPolicy Bypass -File loop\run-loop.ps1 -DryRun

# 2) 실제로 1바퀴만
powershell -ExecutionPolicy Bypass -File loop\run-loop.ps1 -MaxRounds 1

# 3) 이상 없으면 설정한 횟수만큼 (기본 3바퀴)
powershell -ExecutionPolicy Bypass -File loop\run-loop.ps1
```

처음에는 반드시 1번 → 2번 순서로 해 보고, 2번의 결과(커밋, 보고서)를 눈으로 확인한 뒤 3번으로 간다. 지금 대기 중인 브리프(`cursor_brief_394cha.md`)가 첫 라운드로 쓰인다.

## 멈추기와 결과 보기

- **즉시 멈춤**: 빈 파일 `loop\STOP`을 만든다 (현재 라운드가 끝난 뒤 멈춘다). 급하면 PowerShell 창에서 Ctrl+C
- **왜 멈췄는지**: `loop\STOPPED.txt`, `review\loop-summary.md`
- **무슨 일이 있었는지**: `review\loop-logs\` (라운드별 로그), `review\NNNcha-report.md` (라운드별 보고서)
- **다시 시작**: 멈춘 원인을 해결하고 `loop\STOP`을 지운 뒤 다시 실행한다 (`STOPPED.txt`는 자동으로 지워진다)

## 결과 가져오기 (사람이 하는 일)

1. `git log main..HEAD`로 커밋을 확인하고, 보고서와 캡처(`review/...-audit/`)를 눈으로 본다
2. 마음에 들면 main에 병합하고 푸시한다 (이때 Vercel이 배포한다)
3. 마음에 안 들면 `git checkout main`으로 돌아가고 브랜치를 그냥 버리면 된다
4. 라운드 하나만 되돌리고 싶으면 각 라운드 시작 지점이 태그로 남아 있다: `git reset --hard loop-pre-NNN` (사용자가 직접, 작업 브랜치에서만)

## 검증 도구 (설치 후 보정된 부분)

- `check-eslint.mjs`: 저장소에 예전 lint 오류가 많아서 `eslint .`를 쓰면 매 라운드가 멈춘다. 이 도구는 라운드에서 바뀐 파일만 골라 **기준 브랜치(main) 때보다 오류가 늘었는지**만 본다
- `check-parity.mjs`: 패리티 스크립트는 차이가 있어도 종료 코드 0으로 끝난다. 이 도구가 개발 서버를 확인(없으면 띄움)하고, 출력의 `diff=` 값을 세서 0이 아니면 실패로 바꾼다. `illustration_banner`는 건드리지 않는 대상이라 제외한다
- 시작 점검은 `config.json`의 `ignoreDirtyPatterns`(예: `review/`, 백로그 파일)에 해당하는 추적 파일 변경을 무시한다. 그 외 추적 파일이 바뀌어 있으면 멈춘다
- 하이드레이션 7경로를 직접 재는 스크립트는 아직 없어서, 지금은 보고서의 `hydration:` 값을 믿는다

## 이 폴더의 파일

| 파일 | 역할 |
|---|---|
| `run-loop.ps1` | 반복의 몸통. 브랜치 준비, 플래너·실행기 호출, 점검, 멈춤 판단 |
| `invoke-agent.ps1` | `claude`와 `agent`를 짧은 영어 프롬프트로 부르는 도우미 |
| `config.json` | 횟수·시간 상한, 검증 명령, 금지/보호 파일, 플래그 목록 |
| `common-rules.md` | 두 에이전트가 따르는 공통 규칙 (디자이너 수준 원칙 포함) |
| `scorecard.md` | LOOP-SCORE 형식과 멈춤 조건 |
| `prompts/planner.md`, `prompts/executor.md` | 각 에이전트에게 주는 지시 |
| `gaps-seed.md` | 격차 목록의 초기값 |

규칙을 바꾸고 싶으면 이 폴더의 파일을 사용자가 직접(또는 Claude와 상의해서) 고친다. 반복 중인 에이전트는 이 폴더를 고칠 수 없다.
