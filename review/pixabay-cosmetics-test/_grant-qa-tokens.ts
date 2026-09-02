/** QA 1회용 — 테스트 계정에 토큰 지급 (커밋하지 않음) */
import fs from "fs";
import path from "path";
import { createServiceRoleClient } from "../../lib/supabase/service-role";

const QA_USER_ID = "2f01ed61-ed80-465d-9c1a-712bbf01a658";
const ROOT = path.join(import.meta.dirname, "..", "..");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  const client = createServiceRoleClient();
  const { data, error } = await client.rpc("grant_credits", {
    p_user_id: QA_USER_ID,
    p_amount: 500,
    p_reason: "admin_adjustment",
    p_reference_id: "qa_topup_52cha",
  });
  if (error) throw error;
  console.log(`Granted 500 tokens. New balance: ${data}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
