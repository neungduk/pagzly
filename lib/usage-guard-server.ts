/**
 * 426차 R1 — 라우트용 가드 도우미(서버 전용). 순수 로직은 lib/usage-guard.ts, 여기서는 service-role RPC와 NextResponse만 붙인다.
 * 사용: 인증 직후 `const blocked = await usageGate(user.id, "photo", USAGE_EST_COST_USD.generateBackdrop); if (blocked) return blocked;`
 */
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  GUARD_MESSAGES,
  acquireGenerationLock,
  guardUsage,
  isKillSwitchOn,
  releaseGenerationLock,
  type GuardDeps,
  type UsageKind,
} from "@/lib/usage-guard";

const deps = (): GuardDeps => ({
  // service-role 클라이언트 생성이 실패해도(키 없음) 가드 안에서 잡혀 fail 모드로 처리된다
  rpc: async (fn, args) => createServiceRoleClient().rpc(fn, args),
});

const deny = (status: number, message: string, code: string, retryAfterSec?: number) =>
  NextResponse.json({ error: message, code }, { status, headers: retryAfterSec ? { "Retry-After": String(retryAfterSec) } : undefined });

/** 킬 스위치만 검사(로그인 전 라우트용, DB 호출 없음) */
export function killSwitchGate(): NextResponse | null {
  return isKillSwitchOn() ? deny(503, GUARD_MESSAGES.killSwitch, "kill-switch") : null;
}

/** 일일 한도 예약. 거절이면 응답, 통과면 null */
export async function usageGate(userId: string, kind: UsageKind, estCostUsd: number): Promise<NextResponse | null> {
  const r = await guardUsage(deps(), userId, kind, estCostUsd);
  if (r.allowed) return null;
  return deny(r.status, r.message, r.reason, r.status === 429 ? 3600 : undefined);
}

/** 동시 생성 락 획득. 거절이면 응답, 통과면 null (통과 시 호출부가 finally에서 unlockGeneration) */
export async function lockGeneration(userId: string): Promise<NextResponse | null> {
  const r = await acquireGenerationLock(deps(), userId);
  if (r.acquired) return null;
  return deny(r.status, r.message, r.reason);
}

export async function unlockGeneration(userId: string): Promise<void> {
  await releaseGenerationLock(deps(), userId);
}
