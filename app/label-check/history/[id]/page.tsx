"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import "@/components/label-check/ui-507/label-check-507.css";
import { ResultView507 } from "@/components/label-check/ui-507";
import {
  LabelSiteShell511,
  LabelHeader511,
  LabelFooter511,
} from "@/components/label-check/ui-511";
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
    <LabelSiteShell511>
      <LabelHeader511 user={{ id: "member" }} logoutSlot={<LogoutButton />} />
      <main className="lc507 min-h-screen">
        <div className="lc507-wrap">
          <header className="lc507-print-hide">
            <p className="text-sm font-semibold" style={{ color: "#0F3D36" }}>
              <Link href="/label-check/history" className="underline-offset-2 hover:underline">
                내 결과
              </Link>
            </p>
            <h1 className="lc507-title" style={{ fontSize: 28, marginTop: 8 }}>
              저장된 요약
            </h1>
            <p className="lc507-fine mt-2">{NOTICE_HISTORY_NO_REANALYZE_495}</p>
          </header>

          {error ? (
            <p className="lc507-card" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
            <ResultView507
              result={result}
              productName={run?.product_name}
              checkedOn={checkedOn}
              hideEvidence
              isMember
              showBottomBar={false}
            />
          ) : !error ? (
            <p className="lc507-fine">불러오는 중…</p>
          ) : null}
        </div>
      </main>
      <LabelFooter511 />
    </LabelSiteShell511>
  );
}
