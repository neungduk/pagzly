/**
 * 419차 3-5 — 비전(Haiku) 감지 호출 캐시. 같은 이미지 바이트 + 같은 옵션의 감지는 한 번만 부른다(두 번째부터 비용 0).
 * 418차 로그: 사진 1장마다 상품 영역 감지가 "처음 크롭(pad 0.04)"·"시도 0(같은 옵션)"·"시도 1(strict)"·"시도 2(같은 strict)"로
 * 같은 바이트·같은 옵션에 4번 나갔다(옵션 조합은 2종뿐). 결과·품질은 그대로이고 호출 수만 줄어든다.
 *  - 실제로 API가 응답한 결과(cost > 0)만 저장한다. 키 없음·TEST_MODE·실패(cost 0)는 저장하지 않아 다음 호출이 다시 시도한다.
 *  - 진행 중인 같은 호출은 한 번만 보내고 기다린 쪽은 결과를 공유한다(비용은 첫 호출에만).
 *  - 서버 프로세스 메모리 안(요청 간 공유, 최대 256건) — DB·스키마 변경 없음.
 */
import { createHash } from "node:crypto";

const MAX_ENTRIES = 256;
const cache = new Map<string, Promise<unknown>>();
export const visionCacheStats = { hits: 0, misses: 0 };

export function visionKey(kind: string, buffer: Buffer, extra = ""): string {
  return `${kind}:${createHash("sha1").update(buffer).digest("hex")}:${extra}`;
}

export async function withVisionCache<T extends { cost: number }>(key: string, run: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as Promise<T> | undefined;
  if (hit) {
    visionCacheStats.hits += 1;
    const v = await hit;
    return { ...v, cost: 0 };
  }
  visionCacheStats.misses += 1;
  const p = run();
  cache.set(key, p);
  try {
    const v = await p;
    if (!(v.cost > 0)) cache.delete(key);
    while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
    return v;
  } catch (e) {
    cache.delete(key);
    throw e;
  }
}

export function clearVisionCache() {
  cache.clear();
  visionCacheStats.hits = 0;
  visionCacheStats.misses = 0;
}
