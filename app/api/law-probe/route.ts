// 임시 진단용(516 준비): 법제처 Open API 인증 확인. 고정 질의만 호출하고 결과 앞부분만 반환한다.
// 확인이 끝나면 삭제한다.
export const dynamic = "force-dynamic";

async function probe(label: string, headers: Record<string, string>) {
  const oc = process.env.LAW_OC || "pagzly";
  const url = `https://www.law.go.kr/DRF/lawSearch.do?OC=${encodeURIComponent(oc)}&target=law&type=JSON&query=${encodeURIComponent("화장품법")}&display=3`;
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    const text = await res.text();
    return { label, status: res.status, head: text.slice(0, 400) };
  } catch (e) {
    return { label, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const results = [
    await probe("plain", {}),
    await probe("referer", { Referer: "https://pagzly.com/", Origin: "https://pagzly.com" }),
  ];
  return Response.json({ results });
}
