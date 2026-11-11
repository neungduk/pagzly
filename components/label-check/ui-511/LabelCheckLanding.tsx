import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { labelRuleCounts514 } from "@/lib/label-check/rules-count-514";
import { LabelSiteShell511 } from "./LabelSiteShell";
import { LabelHeader511 } from "./LabelHeader";
import { LabelFooter511 } from "./LabelFooter";
import { FixShowcase519, Finale519 } from "../ui-519/LandingBottom519";
import { LandingBelt515, LandingStage519 } from "@/components/label-check/ui-519";

export function LabelCheckLanding511({
  user,
  lawBaseline = null,
}: {
  user: { id: string } | null;
  /** 516 — 법령 확인 기준일(푸터 위). 없으면 숨김 */
  lawBaseline?: string | null;
}) {
  const counts = labelRuleCounts514();

  return (
    <LabelSiteShell511 data-pagzly-landing="" data-label-check-landing="true">
      <div className="lc-w-full lc-min-h-screen lc515-landing">
        <div className="lc515-wash" aria-hidden>
          <i className="a" />
          <i className="b" />
          <i className="c" />
        </div>

        <LabelHeader511
          user={user}
          variant="landing"
          logoutSlot={
            user ? (
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Link href="/label-check/history" className="lc514-ghost">
                  내 결과
                </Link>
                <LogoutButton />
              </span>
            ) : undefined
          }
        />

        <div className="lc515-above">
          <LandingStage519 />
          <LandingBelt515 />
        </div>

        <section id="how" className="lc514-stats">
          <div className="lc514-stats-inner">
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(28px, 5vw, 40px)",
                lineHeight: 1.3,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                maxWidth: 640,
                textWrap: "balance",
              }}
            >
              놓치기 쉬운 것만 <span style={{ color: "var(--lc-brand-soft)" }}>정해진 기준</span>으로 확인합니다
            </h2>
            <div className="lc514-stats-grid">
              <div className="lc514-stat">
                <div className="lc514-stat-n">{counts.kr}</div>
                <div className="lc514-stat-l">
                  한국 화장품법 기준
                  <br />
                  표시·광고 항목
                </div>
              </div>
              <div className="lc514-stat">
                <div className="lc514-stat-n">{counts.us}</div>
                <div className="lc514-stat-l">
                  미국 FDA 기준
                  <br />
                  라벨 항목
                </div>
              </div>
              <div className="lc514-stat">
                <div className="lc514-stat-n">3</div>
                <div className="lc514-stat-l">
                  입력 방식
                  <br />
                  PDF · 사진 · 문구
                </div>
              </div>
              <div className="lc514-stat">
                <div className="lc514-stat-n">0</div>
                <div className="lc514-stat-l">
                  점검 후 보관하는
                  <br />
                  원본 파일
                </div>
              </div>
            </div>
          </div>
        </section>

        <FixShowcase519 />

        <Finale519 />

        <LabelFooter511 lawBaseline={lawBaseline} />
      </div>
    </LabelSiteShell511>
  );
}
