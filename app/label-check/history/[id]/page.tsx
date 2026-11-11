"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import "@/components/label-check/ui-507/label-check-507.css";
import "@/components/label-check/ui-517/label-check-517.css";
import { ResultView517 } from "@/components/label-check/ui-517";
import { LabelFooter511 } from "@/components/label-check/ui-511";
import LogoutButton from "@/components/LogoutButton";
import {
  ERR_LOGIN_EXPIRED_495,
  NOTICE_HISTORY_NO_REANALYZE_495,
} from "@/lib/label-check/member-constants";
import type { LabelCheckResult } from "@/lib/label-check/types";
import { DISCLAIMER_483 } from "@/lib/label-check/types";

type SavedFinding = { label: string; status: string; line: string };

type RunDetail = {
  id: string;
  market: string;
  product_name: string | null;
  summary: LabelCheckResult["summary"];
  findings: SavedFinding[];
  created_at: string;
};

export default function LabelCheckHistoryDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const router = useRouter();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/label-check/runs/${id}`);
        const json = (await res.json()) as { run?: RunDetail; error?: string };
        if (cancelled) return;
        if (res.status === 401) {
          setError(ERR_LOGIN_EXPIRED_495);
          router.replace(`/login?next=${encodeURIComponent(`/label-check/history/${id}`)}`);
          return;
        }
        if (!res.ok || !json.run) {
          setError(json.error || "결과를 찾을 수 없습니다.");
          return;
        }
        setRun(json.run);
      } catch {
        if (!cancelled) setError("네트워크 오류로 결과를 불러오지 못했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const result: LabelCheckResult | null = useMemo(() => {
    if (!run) return null;
    return {
      disclaimer: DISCLAIMER_483,
      readable: true,
      charCount: 0,
      skipJudgment: false,
      summary: {
        possible: run.summary?.possible ?? 0,
        attention: run.summary?.attention ?? 0,
        unknown: run.summary?.unknown ?? 0,
        pass: run.summary?.pass ?? 0,
        manual: run.summary?.manual ?? 0,
      },
      findings: (run.findings || []).map((f) => ({
        category: "",
        label: f.label,
        status: f.status as LabelCheckResult["findings"][0]["status"],
        found: "",
        suggest: f.line || "",
        checkType: "code" as const,
      })),
      manualItems: [],
      market: run.market === "US" ? "US" : "KR",
    };
  }, [run]);

  const checkedOn = run?.created_at
    ? new Date(run.created_at).toLocaleDateString("ko-KR")
    : "—";

  return (
    <div className="lc517">
      <div className="lc517-wash" aria-hidden>
        <i className="a" />
        <i className="b" />
      </div>
      <header className="lc517-header">
        <Link href="/" className="lc517-brand">
          Pagzly
        </Link>
        <nav className="lc517-nav" aria-label="주요">
          <Link href="/label-check/history">내 결과</Link>
          <LogoutButton />
        </nav>
      </header>
      <main className="lc517-wrap">
        <header className="lc507-print-hide" style={{ padding: "10px 0 18px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.3,
              fontWeight: 900,
              letterSpacing: "-0.03em",
            }}
          >
            저장된 요약
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6A6D74" }}>
            {NOTICE_HISTORY_NO_REANALYZE_495}
          </p>
        </header>

        {error ? (
          <p
            role="alert"
            style={{
              padding: 16,
              borderRadius: 16,
              background: "#fff",
              border: "1px solid #D6402B",
            }}
          >
            {error}
          </p>
        ) : null}

        {result ? (
          <ResultView517
            result={result}
            productName={run?.product_name}
            checkedOn={checkedOn}
            hideEvidence
            isMember
            showBottomBar={false}
          />
        ) : !error ? (
          <p style={{ fontSize: 13, color: "#6A6D74" }}>불러오는 중…</p>
        ) : null}
      </main>
      <LabelFooter511 />
    </div>
  );
}
