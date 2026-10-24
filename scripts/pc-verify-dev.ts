/**
 * 449차 4 — pc-verify의 라이브 하네스 단계: 개발 서버(`next dev -p 3188`, PC의 환경값을 그대로 이어받음 — 값은 읽지도 출력하지도 않는다)를 띄우고
 * ① PNG 다운로드 경로 대조(png-compare) ② 라이브 퍼징(fuzz-live)을 돌린 뒤 서버를 끈다. 하나라도 실패면 종료 코드 1.
 *   npx tsx scripts/pc-verify-dev.ts [--out=review/pc-verify-날짜/dev] [--fuzz-n=40] [--port=3188]
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const OUT = arg("out", "review/pc-verify/dev");
const PORT = arg("port", "3188");
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const logFd = fs.openSync(path.join(OUT, "next-dev.log"), "w");
  const server = spawn(NPX, ["next", "dev", "-p", PORT], { stdio: ["ignore", logFd, logFd], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, shell: process.platform === "win32" });
  let ready = false;
  for (let i = 0; i < 90 && !ready; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    try { const r = await fetch(`http://localhost:${PORT}/dev/detail-preview?capture=session`); ready = r.status < 500; } catch { /* 아직 */ }
  }
  let code = 0;
  try {
    if (!ready) { console.error("개발 서버가 90초 안에 뜨지 않음(next-dev.log 확인)"); code = 1; }
    else {
      const run = (args: string[]) => spawnSync(NPX, ["tsx", ...args], { stdio: "inherit", env: process.env, shell: process.platform === "win32" }).status ?? 1;
      const server_ = `--server=http://localhost:${PORT}`;
      if (run(["scripts/png-compare.ts", server_, `--out=${path.join(OUT, "png")}`]) !== 0) code = 1;
      if (run(["scripts/fuzz-live.ts", server_, `--n=${arg("fuzz-n", "40")}`, `--out=${path.join(OUT, "fuzz-live.md")}`]) !== 0) code = 1;
    }
  } finally {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"]);
    else server.kill("SIGTERM");
  }
  process.exit(code);
}
void main();
