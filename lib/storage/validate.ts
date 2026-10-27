import { isAllowedUploadType, isOwnPath, MAX_UPLOAD_BYTES } from "@/lib/storage/policy";

/** 459차 — 업로드·삭제 라우트의 요청 검증(순수 함수, 단위 테스트 가능). 오류 문구는 기존 것만 쓴다 */
export const MSG_LOGIN = "로그인이 필요합니다.";
export const MSG_BAD = "잘못된 요청 형식입니다.";

export type UploadPlan = { ok: true; path: string; contentType: string; size: number } | { ok: false; status: number; error: string };

export function planUpload(userId: string | null, body: unknown, newId: () => string = () => `${Date.now()}-${crypto.randomUUID()}`): UploadPlan {
  if (!userId) return { ok: false, status: 401, error: MSG_LOGIN };
  const b = body as { path?: unknown; contentType?: unknown; size?: unknown } | null;
  if (!b || typeof b.contentType !== "string" || typeof b.size !== "number") return { ok: false, status: 400, error: MSG_BAD };
  if (!isAllowedUploadType(b.contentType) || !Number.isInteger(b.size) || b.size <= 0 || b.size > MAX_UPLOAD_BYTES) return { ok: false, status: 400, error: MSG_BAD };
  let path: string;
  if (typeof b.path === "string" && b.path) {
    if (!isOwnPath(b.path, userId)) return { ok: false, status: 403, error: MSG_BAD };
    path = b.path;
  } else {
    path = `${userId}/${newId()}`;
  }
  return { ok: true, path, contentType: b.contentType, size: b.size };
}

export type RemovePlan = { ok: true; paths: string[] } | { ok: false; status: number; error: string };

export function planRemove(userId: string | null, body: unknown): RemovePlan {
  if (!userId) return { ok: false, status: 401, error: MSG_LOGIN };
  const paths = (body as { paths?: unknown } | null)?.paths;
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 20 || !paths.every((p): p is string => typeof p === "string")) return { ok: false, status: 400, error: MSG_BAD };
  if (!paths.every((p) => isOwnPath(p, userId))) return { ok: false, status: 403, error: MSG_BAD };
  return { ok: true, paths };
}
