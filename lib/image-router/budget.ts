import { DEFAULT_PAGE_GENERATION_BUDGET } from "@/lib/image-router/pricing/config";

type BudgetScopeKey = string;

const usageByScope = new Map<BudgetScopeKey, number>();

export function buildBudgetScopeKey(params: {
  userId?: string;
  pageId?: string | null;
  draftToken?: string | null;
}): BudgetScopeKey {
  const user = params.userId ?? "anonymous";
  const page = params.pageId ?? params.draftToken ?? "session";
  return `${user}:${page}`;
}

export function getBudgetUsage(scopeKey: BudgetScopeKey): number {
  return usageByScope.get(scopeKey) ?? 0;
}

export function consumeBudget(scopeKey: BudgetScopeKey, limit: number): boolean {
  const current = getBudgetUsage(scopeKey);
  if (current >= limit) return false;
  usageByScope.set(scopeKey, current + 1);
  return true;
}

export function resetBudget(scopeKey: BudgetScopeKey): void {
  usageByScope.delete(scopeKey);
}

/** 테스트·E2E용 */
export function resetAllBudgets(): void {
  usageByScope.clear();
}

export function resolveBudgetLimit(explicit?: number): number {
  if (explicit != null && explicit > 0) return explicit;
  const env = Number(process.env.IMAGE_GENERATION_BUDGET);
  if (Number.isFinite(env) && env > 0) return Math.round(env);
  return DEFAULT_PAGE_GENERATION_BUDGET;
}
