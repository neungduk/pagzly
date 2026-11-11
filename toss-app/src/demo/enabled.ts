/** 출시 번들(ait:build)에서는 false. DEV 또는 VITE_DEMO=1 미리보기만 true */
export function demoEnabled(): boolean {
  return Boolean(import.meta.env.DEV) || import.meta.env.VITE_DEMO === "1";
}

export function readDemoName(): string | null {
  if (typeof window === "undefined") return null;
  if (!demoEnabled()) return null;
  const q = new URLSearchParams(window.location.search).get("demo");
  return q && q.trim() ? q.trim() : null;
}
