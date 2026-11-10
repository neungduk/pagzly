// 임시 진단용(516 준비): 법제처 Open API 구조 확인. "화장품"이 들어간 질의만 허용. 확인 후 삭제.
export const dynamic = "force-dynamic";

const H = { Referer: "https://pagzly.com/", Origin: "https://pagzly.com" };

async function call(path: string, params: Record<string, string>, head = 700) {
  const oc = process.env.LAW_OC || "pagzly";
  const qs = new URLSearchParams({ OC: oc, type: "JSON", ...params });
  try {
    const res = await fetch(`https://www.law.go.kr/DRF/${path}?${qs}`, { headers: H, cache: "no-store" });
    const text = await res.text();
    return { path, params, status: res.status, len: text.length, head: text.slice(0, head) };
  } catch (e) {
    return { path, params, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const mode = u.searchParams.get("m") || "list";
  if (mode === "list") {
    const out = [];
    for (const [target, query] of [
      ["law", "화장품법 시행령"],
      ["law", "화장품법 시행규칙"],
      ["admrul", "화장품"],
      ["admrul", "표시ㆍ광고"],
      ["eflaw", "화장품법"],
    ]) {
      out.push(await call("lawSearch.do", { target, query, display: "5" }, 900));
    }
    return Response.json(out);
  }
  const id = u.searchParams.get("id") || "";
  const target = u.searchParams.get("target") || "law";
  if (!/^\d{3,10}$/.test(id) || !["law", "admrul"].includes(target)) return Response.json({ error: "bad" }, { status: 400 });
  const key: Record<string, string> = target === "admrul" ? { ID: id } : { MST: id };
  return Response.json(await call("lawService.do", { target, ...key }, 1500));
}
