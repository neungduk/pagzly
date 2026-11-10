"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ERR_LOGIN_EXPIRED_495 } from "@/lib/label-check/member-constants";
import {
  LabelSiteShell511,
  LabelHeader511,
  LabelFooter511,
} from "@/components/label-check/ui-511";
import LogoutButton from "@/components/LogoutButton";

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
    <LabelSiteShell511>
      <LabelHeader511 user={{ id: "member" }} logoutSlot={<LogoutButton />} />
      <main className="lc-wrap" style={{ paddingTop: 40, paddingBottom: 72, flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 900, letterSpacing: "-0.035em" }}>
          내 결과
        </h1>
        <p style={{ margin: "8px 0 24px", color: "#5B6B65", fontSize: 15 }}>
          저장한 점검 요약을 다시 볼 수 있습니다.
        </p>

        {error ? (
          <p style={{ marginBottom: 16, color: "#B3321F", fontSize: 14 }} role="alert">
            {error}
          </p>
        ) : null}

        {loading ? <p style={{ fontSize: 14, color: "#5B6B65" }}>불러오는 중…</p> : null}

        {!loading && runs.length === 0 ? (
          <p
            style={{
              border: "1px dashed #CBD5CF",
              borderRadius: 12,
              background: "#FFFFFF",
              padding: 20,
              fontSize: 15,
              color: "#3E4F49",
            }}
          >
            저장된 결과가 없습니다.{" "}
            <Link href="/label-check/new" style={{ fontWeight: 700, textDecoration: "underline" }}>
              새 점검
            </Link>
            에서 첫 결과를 남겨 보세요.
          </p>
        ) : null}

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {runs.map((r) => {
            const s = r.summary || {};
            const date = r.created_at ? new Date(r.created_at).toLocaleString("ko-KR") : "—";
            return (
              <li
                key={r.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  border: "1px solid #CBD5CF",
                  borderRadius: 12,
                  background: "#FFFFFF",
                  padding: "14px 16px",
                  fontSize: 15,
                }}
              >
                <Link href={`/label-check/history/${r.id}`} style={{ minWidth: 0, flex: 1, textDecoration: "none" }}>
                  <span style={{ fontWeight: 800 }}>{r.product_name || "제품명 미입력"}</span>
                  <span style={{ display: "block", marginTop: 4, fontSize: 13, color: "#5B6B65" }}>
                    {date} · {r.market === "US" ? "미국" : "한국"} · 고칠 것 {s.possible ?? 0} / 확인할 것{" "}
                    {s.attention ?? 0} / 확인 못 함 {s.unknown ?? 0} / 문제 없음 {s.pass ?? 0}
                  </span>
                </Link>
                <button
                  type="button"
                  disabled={deleting === r.id}
                  onClick={() => void onDelete(r.id)}
                  style={{
                    minHeight: 44,
                    borderRadius: 8,
                    border: "1px solid #D6402B",
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#B3321F",
                    background: "#FFFFFF",
                    cursor: "pointer",
                    opacity: deleting === r.id ? 0.4 : 1,
                  }}
                >
                  {deleting === r.id ? "삭제 중…" : "삭제"}
                </button>
              </li>
            );
          })}
        </ul>
      </main>
      <LabelFooter511 />
    </LabelSiteShell511>
  );
}
