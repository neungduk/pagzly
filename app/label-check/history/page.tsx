"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ERR_LOGIN_EXPIRED_495 } from "@/lib/label-check/member-constants";

type RunRow = {
  id: string;
  market: string;
  product_name: string | null;
  summary: {
    possible?: number;
    attention?: number;
    unknown?: number;
    pass?: number;
  };
  created_at: string;
};

export default function LabelCheckHistoryPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/label-check/runs");
      const json = (await res.json()) as { runs?: RunRow[]; error?: string };
      if (res.status === 401) {
        setError(ERR_LOGIN_EXPIRED_495);
        router.replace(`/login?next=${encodeURIComponent("/label-check/history")}`);
        return;
      }
      if (!res.ok) {
        setError(json.error || "목록을 불러오지 못했습니다.");
        return;
      }
      setRuns(json.runs || []);
    } catch {
      setError("네트워크 오류로 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (id: string) => {
    if (!window.confirm("이 결과를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/label-check/runs/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.replace(`/login?next=${encodeURIComponent("/label-check/history")}`);
        return;
      }
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error || "삭제에 실패했습니다.");
        return;
      }
      setRuns((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("네트워크 오류로 삭제에 실패했습니다.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F4EE] text-[#1B1B18]">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <header className="mb-6">
          <p className="text-sm font-semibold tracking-wide text-[#6B5A2E]">
            <Link href="/label-check" className="underline-offset-2 hover:underline">
              표시사항 사전 점검
            </Link>
            {" · "}내 결과
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">내 결과</h1>
          <nav className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/label-check/new" className="underline-offset-2 hover:underline">
              검수 신청
            </Link>
          </nav>
        </header>

        {error ? (
          <p className="mb-4 break-words text-sm text-[#9B1C1C]" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? <p className="text-sm text-[#555]">불러오는 중…</p> : null}

        {!loading && runs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#CDBF9A] bg-white p-4 text-sm text-[#555]">
            저장된 결과가 없습니다.{" "}
            <Link href="/label-check/new" className="underline-offset-2 hover:underline">
              검수 신청
            </Link>
            에서 첫 결과를 남겨 보세요.
          </p>
        ) : null}

        <ul className="space-y-2">
          {runs.map((r) => {
            const s = r.summary || {};
            const date = r.created_at ? new Date(r.created_at).toLocaleString("ko-KR") : "—";
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5DCC8] bg-white px-3 py-3 text-sm"
              >
                <Link href={`/label-check/history/${r.id}`} className="min-w-0 flex-1 break-words hover:underline">
                  <span className="font-semibold">{r.product_name || "제품명 미입력"}</span>
                  <span className="mt-1 block text-xs text-[#666]">
                    {date} · {r.market === "US" ? "미국" : "한국"} · 위반가능 {s.possible ?? 0} / 확인필요{" "}
                    {s.attention ?? 0} / 확인불가 {s.unknown ?? 0} / 통과 {s.pass ?? 0}
                  </span>
                </Link>
                <button
                  type="button"
                  disabled={deleting === r.id}
                  onClick={() => void onDelete(r.id)}
                  className="rounded-full border border-[#9B1C1C] px-3 py-1 text-xs font-semibold text-[#9B1C1C] disabled:opacity-40"
                >
                  {deleting === r.id ? "삭제 중…" : "삭제"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
