/**
 * QA 테스트 계정 토큰 충전 (service_role 전용)
 *   npx tsx scripts/grant-qa-credits.ts [amount] [reference_id]
 *   기본: 100000 qa_topup
 */
import fs from "fs";
import path from "path";
import { createServiceRoleClient } from "../lib/supabase/service-role";

const QA_USER_ID = "2f01ed61-ed80-465d-9c1a-712bbf01a658";
const ROOT = path.join(__dirname, "..");

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
  const amount = Number(process.argv[2] ?? 100_000);
  const referenceId = process.argv[3] ?? "qa_topup";
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount must be positive");
  }

  const client = createServiceRoleClient();

  const { data: beforeRow } = await client
    .from("user_credits")
    .select("balance")
    .eq("user_id", QA_USER_ID)
    .maybeSingle();
  const before = beforeRow?.balance ?? 0;
  console.log(`[grant-qa] before balance: ${before}`);

  const { data, error } = await client.rpc("grant_credits", {
    p_user_id: QA_USER_ID,
    p_amount: amount,
    p_reason: "admin_adjustment",
    p_reference_id: referenceId,
  });
  if (error) throw error;

  console.log(`[grant-qa] granted ${amount} tokens (ref=${referenceId})`);
  console.log(`[grant-qa] new balance: ${data}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
