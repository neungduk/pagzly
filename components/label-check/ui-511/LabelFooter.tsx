"use client";

import Link from "next/link";
import { labelContactEmail } from "@/lib/label-check/contact";
import { useLawBaseline516 } from "@/components/label-check/LawBaselineClient516";

export function LabelFooter511({
  lawBaseline,
}: {
  /** 516 — 서버에서 넘기면 그대로. 생략 시 API 조회 */
  lawBaseline?: string | null;
} = {}) {
  const email = labelContactEmail();
  const baseline = useLawBaseline516(lawBaseline);
  return (
    <footer className="lc-footer">
      {baseline ? (
        <p
          className="lc516-law-baseline"
          style={{
            margin: "0 0 8px",
            fontSize: 12,
            lineHeight: 1.4,
            color: "#5B6B65",
          }}
        >
          {baseline}
        </p>
      ) : null}
      <span>
        참고용 사전 점검이며 법적 판단이 아닙니다
        {" · "}
        <Link href="/terms" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
          이용약관
        </Link>
        {" · "}
        <Link href="/privacy" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
          개인정보처리방침
        </Link>
        {email ? (
          <>
            {" · "}
            <a href={`mailto:${email}`} style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {email}
            </a>
          </>
        ) : null}
      </span>
    </footer>
  );
}
