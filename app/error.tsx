"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LabelSiteShell511, LabelHeader511, LabelFooter511 } from "@/components/label-check/ui-511";

/**
 * 425차 — 화면 오류 안내(기본 Next 오류 화면 대신). 오류 내용은 사용자에게 보이지 않고 콘솔에만 남긴다.
 * 생성·저장 중 오류는 각 화면의 토스트가 먼저 처리하며, 이 화면은 예상 못 한 렌더 오류의 마지막 방어선이다.
 */
export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app/error]", error.digest ?? "", error.message);
  }, [error]);
  return (
    <LabelSiteShell511>
      <LabelHeader511 />
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>문제가 생겼어요</h1>
          <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.7, color: "#5B6B65", maxWidth: "28em" }}>
            잠시 후 다시 시도해 주세요. 작업 중이던 상세페이지는 작업 내역에서 다시 열 수 있습니다. 계속 반복되면 고객센터로 알려 주세요.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <button type="button" onClick={reset} className="lc-cta lc-cta-solid">
            다시 시도
          </button>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 60,
              padding: "0 28px",
              borderRadius: 12,
              border: "2px solid #0F3D36",
              fontWeight: 800,
              color: "#0F3D36",
              textDecoration: "none",
            }}
          >
            처음으로
          </Link>
        </div>
      </main>
      <LabelFooter511 />
    </LabelSiteShell511>
  );
}
