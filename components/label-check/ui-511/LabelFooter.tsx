import Link from "next/link";
import { labelContactEmail } from "@/lib/label-check/contact";

export function LabelFooter511() {
  const email = labelContactEmail();
  return (
    <footer className="lc-footer">
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
