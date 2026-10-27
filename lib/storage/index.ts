import type { SupabaseClient } from "@supabase/supabase-js";
import { createR2Provider, type R2Config, type R2Deps } from "@/lib/storage/r2-provider";
import { createSupabaseProvider } from "@/lib/storage/supabase-provider";
import type { StorageProvider } from "@/lib/storage/types";

/**
 * 459차 — 이미지 저장소 선택(서버 전용). `STORAGE_PROVIDER` 미설정·`supabase` = 지금과 같은 Supabase Storage, `r2` = Cloudflare R2.
 * r2인데 필수 환경변수가 빠지면 **조용히 supabase로 떨어지지 않고** 업로드 호출 때 이름만 담은 오류를 던진다(값은 출력하지 않는다).
 */
export const R2_REQUIRED_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"] as const;

export class StorageConfigError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`이미지 저장소(R2) 설정이 없습니다: ${missing.join(", ")}`);
    this.name = "StorageConfigError";
    this.missing = missing;
  }
}

type Env = Record<string, string | undefined>;

export function resolveProviderName(env: Env = process.env): "supabase" | "r2" {
  const v = (env.STORAGE_PROVIDER ?? "").trim().toLowerCase();
  if (v === "" || v === "supabase") return "supabase";
  if (v === "r2") return "r2";
  // 알 수 없는 값은 기본으로 되돌리지 않고 설정 오류로 본다(오타로 R2를 켠 줄 알고 Supabase에 계속 쓰는 일 방지)
  throw new StorageConfigError(["STORAGE_PROVIDER(supabase|r2)"]);
}

export function readR2Config(env: Env = process.env): R2Config {
  const missing = R2_REQUIRED_ENV.filter((k) => !(env[k] ?? "").trim());
  if (missing.length) throw new StorageConfigError([...missing]);
  return {
    accountId: env.R2_ACCOUNT_ID!.trim(),
    accessKeyId: env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!.trim(),
    bucket: env.R2_BUCKET!.trim(),
    publicBaseUrl: env.R2_PUBLIC_BASE_URL!.trim(),
  };
}

/** supabase는 호출한 쪽의 서버 클라이언트(사용자 세션)를 그대로 쓴다. r2에서는 쓰지 않는다 */
export function getStorage(supabase: SupabaseClient, env: Env = process.env, r2Deps?: R2Deps): StorageProvider {
  if (resolveProviderName(env) === "r2") return createR2Provider(readR2Config(env), r2Deps);
  return createSupabaseProvider(supabase);
}
