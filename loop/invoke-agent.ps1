# invoke-agent.ps1 - called by run-loop.ps1. ASCII only (PowerShell 5).
# Keeps the command-line prompt short and ASCII so Korean text never goes through the Windows command line;
# the real (Korean) instructions are in loop\prompts\*.md which the agent reads itself.
param(
  [string]$Kind,
  [int]$Round,
  [string]$Brief = '',
  [string]$Branch = '',
  [string]$Latest = ''
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$cfg = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'config.json') | ConvertFrom-Json

if ($Kind -eq 'executor') {
  # Take paid-API tokens out of this process environment. Not a hard wall (files like .env.local can still be read),
  # so also set a spending limit on the provider account.
  foreach ($n in $cfg.stripEnvVars) {
    if (Test-Path ('Env:' + $n)) { Remove-Item ('Env:' + $n) }
  }
  $prompt = 'Read loop/prompts/executor.md and follow it exactly. Round number: ' + $Round + '. Brief file: ' + $Brief + '. Work only on git branch: ' + $Branch + '. Never push.'
  & $cfg.agentCommand -p $prompt --force --output-format text
}
elseif ($Kind -eq 'planner') {
  $prompt = 'Read loop/prompts/planner.md and follow it exactly. Next round number: ' + $Round + '. Latest report file: ' + $Latest + '.'
  & $cfg.plannerCommand -p $prompt --allowedTools 'Read,Write,Glob,Grep' --max-turns 40
}
else {
  Write-Host ('unknown kind: ' + $Kind)
  exit 9
}
exit $LASTEXITCODE
