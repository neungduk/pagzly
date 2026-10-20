/**
 * 회귀 — 419차 3-5 비전 감지 호출 캐시. 모킹된 호출 카운터로 "같은 바이트·같은 옵션은 한 번만"을 센다(Anthropic 호출 0).
 * 418차 로그의 사진 1장당 상품 영역 감지 패턴(처음 크롭·시도0 = 같은 옵션, 시도1·시도2 = 같은 strict)을 그대로 흉내 낸다.
 */
import fs from "node:fs";
import path from "node:path";
import { clearVisionCache, visionCacheStats, visionKey, withVisionCache } from "../../lib/vision-cache";

export const name = "비전 감지 캐시 — 같은 바이트·옵션은 1회(418차 패턴 40→20회), 실패·키 없음은 저장 안 함, 동시 호출 공유";

type R = { box: string | null; cost: number };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  clearVisionCache();
  let calls = 0;
  const api = (box: string | null, cost = 0.002) => async (): Promise<R> => { calls += 1; return { box, cost }; };
  const bufs = Array.from({ length: 10 }, (_, i) => Buffer.from(`image-${i}`));

  // 418차 패턴: 사진마다 상품 영역 감지 [normal, normal, strict, strict]
  let billed = 0;
  for (const b of bufs) {
    for (const strict of [false, false, true, true]) {
      const r = await withVisionCache(visionKey("region", b, `p|image/jpeg|${strict ? "strict" : "normal"}`), api("0.35,0.25"));
      billed += r.cost;
    }
  }
  if (calls !== 20) fails.push(`418차 패턴 호출 수 ${calls} ≠ 20(40회였던 것)`);
  if (Math.abs(billed - 20 * 0.002) > 1e-9) fails.push(`비용 합산 ${billed} — 캐시 히트는 0이어야 함`);
  if (visionCacheStats.hits !== 20) fails.push(`히트 ${visionCacheStats.hits} ≠ 20`);

  // 히트는 같은 결과(box)를 돌려주고 비용만 0
  const again = await withVisionCache(visionKey("region", bufs[0]!, "p|image/jpeg|normal"), api("다른값"));
  if (again.box !== "0.35,0.25" || again.cost !== 0) fails.push("히트가 첫 결과·비용 0이 아님");

  // 다른 바이트·다른 옵션·다른 종류는 따로
  clearVisionCache();
  calls = 0;
  await withVisionCache(visionKey("region", bufs[0]!, "normal"), api("a"));
  await withVisionCache(visionKey("region", bufs[1]!, "normal"), api("b"));
  await withVisionCache(visionKey("region", bufs[0]!, "strict"), api("c"));
  await withVisionCache(visionKey("hand", bufs[0]!), api("d"));
  if (calls !== 4) fails.push(`키가 구분되지 않음: ${calls} ≠ 4`);

  // 실제 응답이 없던 결과(cost 0: 키 없음·TEST_MODE·실패)는 저장하지 않는다 → 다음 호출이 다시 시도
  clearVisionCache();
  calls = 0;
  const k = visionKey("region", bufs[2]!, "normal");
  await withVisionCache(k, api(null, 0));
  await withVisionCache(k, api("ok"));
  if (calls !== 2) fails.push("cost 0 결과가 캐시됨");
  const third = await withVisionCache(k, api("x"));
  if (calls !== 2 || third.box !== "ok") fails.push("성공 결과가 캐시되지 않음");
  // 예외도 저장하지 않는다
  const kt = visionKey("region", bufs[3]!, "normal");
  try { await withVisionCache(kt, async () => { calls += 1; throw new Error("boom"); }); } catch { /* 기대 */ }
  const afterThrow = await withVisionCache(kt, api("ok2"));
  if (afterThrow.box !== "ok2") fails.push("예외 뒤 재시도가 막힘");

  // 동시에 같은 호출이 오면 한 번만 보내고 결과를 공유(비용은 첫 호출에만)
  clearVisionCache();
  calls = 0;
  const kc = visionKey("hand", bufs[4]!);
  const slow = async (): Promise<R> => { calls += 1; await new Promise((r) => setTimeout(r, 15)); return { box: "s", cost: 0.001 }; };
  const [r1, r2] = await Promise.all([withVisionCache(kc, slow), withVisionCache(kc, slow)]);
  if (calls !== 1 || r1.cost !== 0.001 || r2.cost !== 0) fails.push(`동시 호출 공유 실패: calls=${calls} 비용 ${r1.cost}/${r2.cost}`);

  // 키는 바이트가 같을 때만 같다
  if (visionKey("region", Buffer.from("a"), "x") !== visionKey("region", Buffer.from("a"), "x")) fails.push("같은 바이트의 키가 다름");
  if (visionKey("region", Buffer.from("a"), "x") === visionKey("region", Buffer.from("b"), "x")) fails.push("다른 바이트의 키가 같음");

  // 연결: vision-utils의 3개 감지 함수가 캐시를 거치고, strict·상품명이 키에 들어간다
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "lib", "vision-utils.ts"), "utf8");
  for (const fn of ["detectTextRegions", "detectProductRegion", "detectCutoutHasHandOrPerson"]) {
    if (!new RegExp(`export async function ${fn}\\([\\s\\S]*?withVisionCache\\(`).test(src)) fails.push(`${fn}가 캐시를 거치지 않음`);
  }
  if (!/options\?\.strict \? "strict" : "normal"/.test(src)) fails.push("strict가 키에 없음 — 서로 다른 옵션이 섞임");
  clearVisionCache();
  return fails;
}
