#!/usr/bin/env bash
# 490 — Vercel Ignored Build Step.
# 2026-11-10: 프로덕션 배포 트리거를 위해 주석 추가(동작 변경 없음).
# 514차 배포 트리거(동작 변경 없음).
# 2026-11-11: CRON_SECRET 환경변수 추가 후 재배포 트리거(동작 변경 없음).
# 2026-11-11: LABEL_TOSS_ENABLED·LABEL_CORS_ORIGINS 환경변수 추가 후 재배포 트리거(동작 변경 없음).
# exit 0 = 빌드 건너뜀, exit 1 = 빌드 진행.
# review/** 와 *.md 만 바뀐 커밋은 건너뛰고, 그 외(코드) 변경·첫 커밋(HEAD^ 없음)은 진행.
set -e
if ! git rev-parse -q --verify HEAD^ >/dev/null 2>&1; then
  echo "vercel-ignore-docs: no HEAD^ — build"
  exit 1
fi
if git diff --quiet HEAD^ HEAD -- . \
  ':(exclude)review' \
  ':(exclude)review/**' \
  ':(exclude)*.md' \
  ':(exclude)**/*.md'
then
  echo "vercel-ignore-docs: docs/review only — skip"
  exit 0
fi
echo "vercel-ignore-docs: code changes — build"
exit 1
