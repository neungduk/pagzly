import Link from "next/link";
import { LabelMark511 } from "./LabelMark";

export type LabelHeader511Props = {
  user?: { id: string } | null;
  /** landing: 떠 있는 상단 바 */
  variant?: "landing" | "app";
  logoutSlot?: React.ReactNode;
};

export function LabelHeader511({ user, variant = "app", logoutSlot }: LabelHeader511Props) {
  if (variant === "landing") {
    return (
      <div className="lc514-top">
        <header className="lc514-bar">
          <Link href="/" className="lc-brand-mark" style={{ textDecoration: "none" }}>
            Pagzly
          </Link>
          <nav className="lc514-bar-nav" aria-label="주요">
            <a href="#how">검사 항목</a>
            <a href="#fix">수정 안내</a>
            <a href="/label-check">시작하기</a>
          </nav>
          <div className="lc514-bar-actions">
            {user ? (
              logoutSlot ?? (
                <Link href="/label-check/history" className="lc514-ghost">
                  내 결과
                </Link>
              )
            ) : (
              <Link href="/login" className="lc514-ghost">
                로그인
              </Link>
            )}
            <Link href="/label-check" className="lc514-bar-cta">
              점검하기
            </Link>
          </div>
        </header>
      </div>
    );
  }

  return (
    <header className="lc-header">
      <Link href="/" className="lc-brand-mark">
        <span>
          <LabelMark511 />
        </span>
        Pagzly
      </Link>
      <nav className="lc-nav" aria-label="주요">
        <Link href="/label-check">새 점검</Link>
        <Link href="/label-check/history">내 결과</Link>
        {user ? (
          logoutSlot ?? null
        ) : (
          <Link
            href="/login"
            className="lc514-ghost"
            style={{ color: "var(--lc-ink)" }}
          >
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}
