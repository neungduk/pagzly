# run-loop.ps1
# Pagzly auto loop: Claude (planner, "claude -p") writes the next brief,
# Cursor (executor, "agent -p") does the work, this script verifies and decides whether to go on.
#
# ASCII only on purpose: Windows PowerShell 5 reads BOM-less files as ANSI.
# Korean instructions live in loop\prompts\*.md and loop\common-rules.md (read by the agents, not by this script).
#
# Usage (from the repo root, PowerShell 5):
#   powershell -ExecutionPolicy Bypass -File loop\run-loop.ps1 -DryRun     # show the plan, call nothing
#   powershell -ExecutionPolicy Bypass -File loop\run-loop.ps1 -MaxRounds 1 # one real round
#   powershell -ExecutionPolicy Bypass -File loop\run-loop.ps1              # config.maxRounds rounds
# Stop at any time: create an empty file named loop\STOP

param(
  [int]$MaxRounds = 0,
  [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$cfg = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'config.json') | ConvertFrom-Json
if ($MaxRounds -le 0) { $MaxRounds = [int]$cfg.maxRounds }

$logDir = Join-Path $root 'review\loop-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$mainLog = Join-Path $logDir 'loop.log'
$cha = [string][char]0xCC28          # the Korean counter character used in "N-cha" commit messages
$startTime = Get-Date
$summary = New-Object System.Collections.ArrayList
$script:stopReason = ''
$script:failReason = ''

function Write-Log([string]$msg) {
  $line = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $msg
  Write-Host $line
  Add-Content -Path $mainLog -Value $line -Encoding UTF8
}

function Write-Summary {
  $path = Join-Path $root 'review\loop-summary.md'
  $lines = @()
  $lines += '# Loop summary'
  $lines += ''
  $lines += ('Started: ' + $startTime.ToString('yyyy-MM-dd HH:mm'))
  $lines += ('Ended: ' + (Get-Date).ToString('yyyy-MM-dd HH:mm'))
  $lines += ('Stop reason: ' + $script:stopReason)
  $lines += ''
  $lines += '## Rounds'
  foreach ($s in $summary) { $lines += ('- ' + $s) }
  $lines += ''
  $lines += '## Commits on this branch (not on the base branch)'
  $commits = @(& git -c core.quotepath=false log --oneline ($cfg.baseBranch + '..HEAD'))
  foreach ($c in $commits) { $lines += ('- ' + $c) }
  $lines += ''
  $lines += 'Review the branch, then merge or push it yourself. Nothing is pushed unless pushBranch is true.'
  Set-Content -Path $path -Value $lines -Encoding UTF8
}

function Stop-Loop([string]$reason, [int]$code) {
  $script:stopReason = $reason
  Write-Log ('STOP: ' + $reason)
  if (-not $DryRun) {
    Set-Content -Path (Join-Path $root 'loop\STOPPED.txt') -Value $reason -Encoding UTF8
    Write-Summary
  }
  exit $code
}

function Get-MaxN([string]$dir, [string]$regex) {
  $max = 0
  $files = @(Get-ChildItem -Path $dir -File -ErrorAction SilentlyContinue)
  foreach ($f in $files) {
    $m = [regex]::Match($f.Name, $regex)
    if ($m.Success) {
      $n = [int]$m.Groups[1].Value
      if ($n -gt $max) { $max = $n }
    }
  }
  return $max
}

function Get-ScoreValue([string]$text, [string]$key) {
  $m = [regex]::Match($text, '(?m)^\s*' + $key + '\s*:\s*(\d+)')
  if ($m.Success) { return [int]$m.Groups[1].Value }
  return -1
}

# Runs a program with a timeout, output to files. Returns the exit code, or -999 on timeout.
function Invoke-Timed([string]$file, [string]$argString, [int]$timeoutMin, [string]$outLog) {
  $p = Start-Process -FilePath $file -ArgumentList $argString -NoNewWindow -PassThru `
        -RedirectStandardOutput $outLog -RedirectStandardError ($outLog + '.err')
  $null = $p.Handle
  if (-not $p.WaitForExit($timeoutMin * 60 * 1000)) {
    & taskkill /PID $p.Id /T /F | Out-Null
    return -999
  }
  $p.WaitForExit()
  return $p.ExitCode
}

# Tracked files with uncommitted changes, minus the paths the loop is told to leave alone (config.ignoreDirtyPatterns).
function Get-RelevantDirty {
  $lines = @(& git -c core.quotepath=false status --porcelain --untracked-files=no)
  $result = @()
  foreach ($l in $lines) {
    $p = ([string]$l)
    if ($p.Length -lt 4) { continue }
    $p = $p.Substring(3).Trim('"').Replace('\', '/')
    $idx = $p.IndexOf(' -> ')
    if ($idx -ge 0) { $p = $p.Substring($idx + 4) }
    $ignore = $false
    foreach ($pat in $cfg.ignoreDirtyPatterns) { if ($p -match $pat) { $ignore = $true } }
    if (-not $ignore) { $result += $p }
  }
  return $result
}

# Checks one finished round. Returns $true when everything is fine; otherwise sets $script:failReason.
function Test-Round([int]$round, [string]$tag) {
  $changed = @(& git diff --name-only ($tag + '..HEAD'))
  if ($changed.Count -eq 0) { $script:failReason = 'no commits or changes in this round'; return $false }

  foreach ($f in $changed) {
    $norm = ([string]$f).Replace('\', '/')
    foreach ($pat in $cfg.forbiddenPathPatterns) {
      if ($norm -match $pat) { $script:failReason = ('forbidden file in commits: ' + $norm); return $false }
    }
    foreach ($pf in $cfg.protectedFiles) {
      if ($norm -eq $pf) { $script:failReason = ('protected file changed: ' + $norm); return $false }
    }
  }

  $dirty = @(Get-RelevantDirty)
  if ($dirty.Count -gt 0) { $script:failReason = ('uncommitted tracked changes remain: ' + ($dirty -join ', ')); return $false }

  $subjects = @(& git -c core.quotepath=false log --format=%s ($tag + '..HEAD'))
  $needle = [string]$round + $cha
  $found = $false
  foreach ($s in $subjects) { if (([string]$s).Contains($needle)) { $found = $true } }
  if (-not $found) { $script:failReason = 'no commit message contains the round marker'; return $false }

  foreach ($m in $cfg.mustStayFalse) {
    $path = Join-Path $root $m.file
    if (Test-Path $path) {
      $txt = Get-Content -Raw -Encoding UTF8 $path
      if (-not ($txt -match $m.pattern)) { $script:failReason = ('flag no longer false: ' + $m.file); return $false }
    } else {
      Write-Log ('note: mustStayFalse file not found, skipped: ' + $m.file)
    }
  }

  foreach ($v in $cfg.verify) {
    Write-Log ('verify: ' + $v.name)
    $vlog = Join-Path $logDir ('round-' + $round + '-verify-' + $v.name + '.log')
    $code = Invoke-Timed 'cmd.exe' ('/c ' + $v.cmd) ([int]$cfg.verifyTimeoutMinutes) $vlog
    if ($code -ne 0) { $script:failReason = ('verify failed: ' + $v.name + ' (exit ' + $code + ', see ' + $vlog + ')'); return $false }
  }
  return $true
}

# ---------- preflight ----------
$cur = ([string](& git rev-parse --abbrev-ref HEAD)).Trim()
$dirtyStart = @(Get-RelevantDirty)
if ($dirtyStart.Count -gt 0) {
  Write-Log ('uncommitted tracked changes: ' + ($dirtyStart -join ', '))
  Stop-Loop 'tracked files have uncommitted changes (listed above); commit or stash them first' 2
}

# Paid verification is never part of the loop. Refuse to start while a paid API key is active anywhere it could be picked up.
# Only checks that a non-empty value exists; the value itself is never read into a log or printed.
foreach ($name in $cfg.blockIfEnvKeyActive) {
  if (Test-Path ('Env:' + $name)) {
    Stop-Loop ('environment variable ' + $name + ' is set. Paid keys must be off while the loop runs (see loop\README.md)') 2
  }
  foreach ($ef in @('.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local')) {
    $efp = Join-Path $root $ef
    if (Test-Path $efp) {
      $pattern = '^\s*(export\s+)?' + $name + '\s*=\s*("[^"]+"|''[^'']+''|[^\s"''#]+)'
      if (Select-String -Path $efp -Pattern $pattern -Quiet) {
        Stop-Loop ($name + ' is active in ' + $ef + '. Comment it out (put # in front of the line) while the loop runs, then restore it afterwards') 2
      }
    }
  }
}

if ($cur -eq $cfg.baseBranch) {
  $branch = $cfg.branchPrefix + '-' + (Get-Date -Format 'yyyyMMdd-HHmm')
  Write-Log ('creating work branch ' + $branch)
  if (-not $DryRun) { & git checkout -b $branch | Out-Null }
} elseif ($cur.StartsWith($cfg.branchPrefix)) {
  $branch = $cur
  Write-Log ('continuing on work branch ' + $branch)
} else {
  Stop-Loop ('unexpected branch ' + $cur + ' (start from ' + $cfg.baseBranch + ' or an ' + $cfg.branchPrefix + ' branch)') 2
}

Remove-Item (Join-Path $root 'loop\STOPPED.txt') -ErrorAction SilentlyContinue

# ---------- main loop ----------
$noProgress = 0

for ($i = 1; $i -le $MaxRounds; $i++) {
  if (Test-Path (Join-Path $root $cfg.stopFile)) { Stop-Loop 'STOP file found' 0 }
  if (((Get-Date) - $startTime).TotalHours -ge [double]$cfg.maxHours) { Stop-Loop 'time budget reached' 0 }
  if (Test-Path (Join-Path $root 'loop\DONE.txt')) { Stop-Loop 'DONE file present (see loop\DONE.txt)' 0 }

  $lastReport = Get-MaxN 'review' '^(\d+)cha-report\.md$'
  $lastBrief = Get-MaxN '.' '^cursor_brief_(\d+)cha\.md$'

  if ($lastBrief -gt $lastReport) {
    $round = $lastBrief
    $brief = 'cursor_brief_' + $round + 'cha.md'
    Write-Log ('round ' + $round + ': using existing brief ' + $brief)
    if (Test-Path (Join-Path $logDir ('round-' + $round + '-exec.log'))) {
      Stop-Loop ('round ' + $round + ' was attempted before but has no report; check review\loop-logs\round-' + $round + '-exec.log') 3
    }
  } else {
    $round = $lastReport + 1
    $brief = 'cursor_brief_' + $round + 'cha.md'
    $latest = 'review/' + $lastReport + 'cha-report.md'
    Write-Log ('round ' + $round + ': asking the planner for ' + $brief)
    if ($DryRun) {
      Write-Log ('[dry run] would run: claude planner with latest report ' + $latest)
    } else {
      $plog = Join-Path $logDir ('round-' + $round + '-planner.log')
      $pargs = '-NoProfile -ExecutionPolicy Bypass -File loop\invoke-agent.ps1 -Kind planner -Round ' + $round + ' -Latest ' + $latest
      $pcode = Invoke-Timed 'powershell.exe' $pargs ([int]$cfg.plannerTimeoutMinutes) $plog
      if (Test-Path (Join-Path $root 'loop\DONE.txt')) { Stop-Loop 'planner says nothing free is left (see loop\DONE.txt)' 0 }
      if ($pcode -ne 0) { Stop-Loop ('planner failed (exit ' + $pcode + ', see ' + $plog + ')') 3 }
      if (-not (Test-Path (Join-Path $root $brief))) { Stop-Loop ('planner did not write ' + $brief) 3 }
    }
  }

  $tag = 'loop-pre-' + $round
  if ($DryRun) {
    Write-Log ('[dry run] would tag ' + $tag + ', run the Cursor agent on ' + $brief + ', then verify')
    $summary.Add('round ' + $round + ': dry run only') | Out-Null
    break
  }

  & git tag -f $tag | Out-Null
  Write-Log ('round ' + $round + ': running the Cursor agent (timeout ' + $cfg.roundTimeoutMinutes + ' min)')
  $elog = Join-Path $logDir ('round-' + $round + '-exec.log')
  $eargs = '-NoProfile -ExecutionPolicy Bypass -File loop\invoke-agent.ps1 -Kind executor -Round ' + $round + ' -Brief ' + $brief + ' -Branch ' + $branch
  $ecode = Invoke-Timed 'powershell.exe' $eargs ([int]$cfg.roundTimeoutMinutes) $elog
  if ($ecode -ne 0) { Stop-Loop ('executor failed or timed out (exit ' + $ecode + ', see ' + $elog + ')') 3 }

  $reportPath = Join-Path $root ('review\' + $round + 'cha-report.md')
  if (-not (Test-Path $reportPath)) { Stop-Loop ('executor finished without review\' + $round + 'cha-report.md') 3 }

  $rep = Get-Content -Raw -Encoding UTF8 $reportPath
  $parity = Get-ScoreValue $rep 'parity_diff'
  $hydr = Get-ScoreValue $rep 'hydration'
  $paid = Get-ScoreValue $rep 'paid_calls'
  $closed = Get-ScoreValue $rep 'gaps_closed_this_round'
  $open = Get-ScoreValue $rep 'gaps_open'
  if ($parity -lt 0 -or $hydr -lt 0 -or $paid -lt 0 -or $closed -lt 0 -or $open -lt 0) {
    Stop-Loop ('report is missing the LOOP-SCORE block or a field in it (round ' + $round + ')') 3
  }
  if ($parity -ne 0) { Stop-Loop ('parity_diff is ' + $parity + ' (must be 0)') 3 }
  if ($hydr -ne 0) { Stop-Loop ('hydration is ' + $hydr + ' (must be 0)') 3 }
  if ($paid -ne 0) { Stop-Loop ('paid_calls is ' + $paid + ' (must be 0)') 3 }

  if (-not (Test-Round $round $tag)) { Stop-Loop ('round ' + $round + ': ' + $script:failReason + '  (rollback point: git tag ' + $tag + ')') 3 }

  $head = ([string](& git rev-parse --short HEAD)).Trim()
  $summary.Add('round ' + $round + ': OK, head ' + $head + ', gaps closed ' + $closed + ', gaps open ' + $open) | Out-Null
  Write-Log ('round ' + $round + ' OK. closed=' + $closed + ' open=' + $open)

  if ($cfg.pushBranch) {
    Write-Log 'pushing the work branch (no force)'
    & git push -u origin $branch | Out-Null
  }

  if ($closed -eq 0) { $noProgress++ } else { $noProgress = 0 }
  if ($noProgress -ge [int]$cfg.noProgressRounds) { Stop-Loop ('no gap was closed for ' + $noProgress + ' rounds in a row') 0 }
}

Stop-Loop 'finished the requested number of rounds' 0
