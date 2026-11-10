import Link from "next/link";
import { LabelMark511 } from "./LabelMark";

export type LabelHeader511Props = {
  user?: { id: string } | null;
  /** landing: 앵커 링크 포함 */
  variant?: "landing" | "app";
  logoutSlot?: React.ReactNode;
};

export function LabelHeader511({ user, variant = "app", logoutSlot }: LabelHeader511Props) {
  return (
    <header className="lc-header">
      <Link href="/" className="lc-brand-mark">
        <span>
          <LabelMark511 />
        </span>
        Pagzly
      </Link>
      <nav className="lc-nav" aria-label="주요">
        {variant === "landing" ? (
          <>
            <a href="#try">직접 해 보기</a>
            <a href="#how">이렇게 점검해요</a>
          </>
        ) : (
          <>
            <Link href="/label-check">새 점검</Link>
            <Link href="/label-check/history">내 결과</Link>
          </>
        )}
        {user ? (
          logoutSlot ?? null
        ) : (
          <Link
            href="/login"
            style={{
              color: "#F2F5F3",
              border: "1px solid #5E8379",
              borderRadius: 8,
              padding: "9px 16px",
            }}
          >
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}
