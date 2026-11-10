import Link from "next/link";
import { labelContactEmail } from "@/lib/label-check/contact";

export function LabelFooter511() {
  const email = labelContactEmail();
  return (
    <footer className="lc-footer">
      {email ? <span>문의 {email}</span> : <span>문의</span>}
      <span style={{ display: "flex", gap: 20 }}>
        <Link href="/terms" style={{ color: "#5B6B65" }}>
          이용약관
        </Link>
        <Link href="/privacy" style={{ color: "#5B6B65" }}>
          개인정보처리방침
        </Link>
      </span>
      <span className="lc-basis-full">
        참고용 사전 점검이며 법적 판단이 아닙니다. © 2026 Pagzly
      </span>
    </footer>
  );
}
