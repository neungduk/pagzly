import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { labelRuleCounts514 } from "@/lib/label-check/rules-count-514";
import { LabelSiteShell511 } from "./LabelSiteShell";
import { LabelHeader511 } from "./LabelHeader";
import { LabelFooter511 } from "./LabelFooter";
import { LandingProofDemo511 } from "./LandingProofDemo";
import { LANDING_BEFORE_AFTER_514 } from "./landing-demo-514";

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

        <section className="lc514-hero lc515-above">
          <h1>
            화장품 라벨, 인쇄 전에
            <br />
            <span className="em">틀린 문구</span>부터 잡으세요
          </h1>
          <p className="lc514-hero-sub">
            PDF나 사진을 올리면 필수 표시사항과 광고 문구를 읽고, 무엇이 왜 문제인지, 어떻게 고치면 되는지 문장
            단위로 알려 드립니다.
          </p>
          <div className="lc514-hero-btns">
            <Link href="/label-check" className="lc-cta lc-cta-solid">
              내 라벨 점검하기
            </Link>
            <a href="#demo" className="lc514-ghost" style={{ borderRadius: 999, padding: "16px 28px", fontSize: 17 }}>
              결과 예시 보기
            </a>
          </div>
          <div className="lc514-hero-hints">
            <span>로그인 없이 시작</span>
            <span>점검 후 파일 저장 안 함</span>
            <span>한국 · 미국 기준</span>
          </div>
        </section>

        <div className="lc515-above">
          <LandingProofDemo511 />
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

        <div className="lc515-fix-band">
          <section id="fix" className="lc514-fix">
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(28px, 4vw, 38px)",
                  lineHeight: 1.3,
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  textWrap: "balance",
                }}
              >
                틀렸다는 말로 끝내지 않고 고친 문장까지
              </h2>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: "var(--lc-sub)" }}>
                어느 문장이 걸렸는지 표시하고, 빠진 항목은 넣을 문구 예시를 함께 보여 드립니다. 고친 뒤 다시 올려
                확인하세요.
              </p>
              <a href="#demo" style={{ fontSize: 16, fontWeight: 700, color: "var(--lc-brand)", textDecoration: "none" }}>
                결과 화면 둘러보기 →
              </a>
            </div>
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--lc-line)",
                borderRadius: 20,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div>
                <div className="lc-mono" style={{ fontSize: 11, color: "var(--lc-mute)", marginBottom: 6 }}>
                  BEFORE
                </div>
                <div style={{ fontSize: 16, lineHeight: 1.7 }}>
                  <span className="lc514-mark-bad">{LANDING_BEFORE_AFTER_514.before}</span>
                </div>
              </div>
              <div style={{ height: 1, background: "var(--lc-line-soft)" }} />
              <div>
                <div className="lc-mono" style={{ fontSize: 11, color: "var(--lc-ok)", marginBottom: 6 }}>
                  AFTER
                </div>
                <div style={{ fontSize: 16, lineHeight: 1.7 }}>
                  <span className="lc514-mark-hl">{LANDING_BEFORE_AFTER_514.after}</span>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--lc-mute)" }}>{LANDING_BEFORE_AFTER_514.note}</div>
            </div>
          </section>
        </div>

        <section id="start" className="lc514-cta-band">
          <div className="lc514-cta-panel lc515-cta-grad">
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(28px, 4vw, 40px)",
                lineHeight: 1.3,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                textWrap: "balance",
              }}
            >
              지금 올려 보세요
            </h2>
            <p style={{ margin: 0, fontSize: 17, color: "#d4deff" }}>회원가입 없이 바로 점검할 수 있습니다.</p>
            <Link href="/label-check">내 라벨 점검하기</Link>
          </div>
        </section>

        <LabelFooter511 lawBaseline={lawBaseline} />
      </div>
    </LabelSiteShell511>
  );
}
