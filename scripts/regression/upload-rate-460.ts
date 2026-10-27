/** 회귀 — 460차 업로드 서명 발급 횟수 제한(가짜 시계, 네트워크 없음). */
import fs from "node:fs";
import { UPLOAD_URL_RULES } from "../../lib/storage/policy";
import { MSG_TOO_MANY, createUploadLimiter, uploadRateGate } from "../../lib/storage/upload-rate";

export const name = "업로드 발급 제한 — 한도 내 통과·시간당/일일 초과 429·사용자별 독립·창 지나면 복구·라우트 배치(정적)";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) f.push(m); };
  const hour = UPLOAD_URL_RULES[0].max; const day = UPLOAD_URL_RULES[1].max;
  ok(hour > 0 && day >= hour, "한도 상수가 이상함");

  let t = 0; const lim = createUploadLimiter(() => t);
  for (let i = 0; i < hour; i++) if (uploadRateGate(lim, "u1")) { f.push(`한도 내 ${i + 1}번째가 거절됨`); break; }
  const over = uploadRateGate(lim, "u1");
  ok(over?.status === 429 && over.body.error === MSG_TOO_MANY && over.body.code === "rate-hour" && over.retryAfterSec >= 1, `시간당 초과 ${JSON.stringify(over)}`);
  ok(uploadRateGate(lim, "u2") === null, "다른 사용자가 영향받음");
  t += 3_600_001; ok(uploadRateGate(lim, "u1") === null, "1시간 뒤 복구 안 됨");

  // 일일: 시간당 한도 안에서 여러 시간에 걸쳐 일일 한도 초과
  let t2 = 0; const lim2 = createUploadLimiter(() => t2); let blocked: ReturnType<typeof uploadRateGate> = null; let n = 0;
  while (!blocked && n < day + 10) { blocked = uploadRateGate(lim2, "u"); if (!blocked) { n++; if (n % hour === 0) t2 += 3_600_001; } }
  ok(n === day && blocked?.body.code === "rate-day", `일일 초과 n=${n} code=${blocked?.body.code}`);
  t2 += 86_400_001; ok(uploadRateGate(lim2, "u") === null, "하루 뒤 복구 안 됨");

  ok(MSG_TOO_MANY === "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", "기존 문구와 다름");

  // 정적: 검증(planUpload) 뒤·provider 확인 뒤·서명 발급 앞에서 제한
  const r = fs.readFileSync("app/api/storage/upload-url/route.ts", "utf8");
  const i = (s: string) => r.indexOf(s);
  ok(i("planUpload(") > 0 && i("planUpload(") < i("uploadRateGate(") && i("uploadRateGate(") < i("createUploadTarget("), "제한 위치가 검증 뒤·발급 앞이 아님");
  ok(i('storage.name === "supabase"') > 0 && i('storage.name === "supabase"') < i("uploadRateGate("), "supabase 모드(409)가 제한을 소모");
  ok(/status: limited\.status/.test(r) && /Retry-After/.test(r), "429 응답 형태");
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
