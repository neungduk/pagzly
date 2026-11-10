import Link from "next/link";
import { LabelSiteShell511, LabelHeader511, LabelFooter511 } from "@/components/label-check/ui-511";

/** 425차 — 없는 주소 안내(기본 Next 404 대신). 로그인 상태와 무관하게 홈으로 돌아가는 길만 준다. */
export default function NotFound() {
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
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>
            찾을 수 없는 페이지입니다
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.7, color: "#5B6B65", maxWidth: "28em" }}>
            주소가 바뀌었거나 삭제된 페이지일 수 있어요. 아래 버튼으로 처음 화면으로 돌아가 주세요.
          </p>
        </div>
        <Link href="/" className="lc-cta lc-cta-solid">
          처음으로 돌아가기
        </Link>
      </main>
      <LabelFooter511 />
    </LabelSiteShell511>
  );
}
