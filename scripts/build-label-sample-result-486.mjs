/**
 * 486 — 정적 샘플 결과 JSON 재생성 진입점.
 * `npx tsx scripts/build-label-sample-result-486.ts` 와 동일.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const r = spawnSync(
  process.execPath,
  [path.join("node_modules", "tsx", "dist", "cli.mjs"), "scripts/build-label-sample-result-486.ts"],
  { stdio: "inherit", cwd: process.cwd() },
);
process.exit(r.status ?? 1);
