import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { LabelSiteShell511 } from "./LabelSiteShell";
import { LabelHeader511 } from "./LabelHeader";
import { LabelFooter511 } from "./LabelFooter";
import { LandingProofDemo511 } from "./LandingProofDemo";
import { ReviewBelt511 } from "./ReviewBelt";
import { TryItPicker511 } from "./TryItPicker";

export function LabelCheckLanding511({ user }: { user: { id: string } | null }) {
  return (
    <LabelSiteShell511 data-pagzly-landing="" data-label-check-landing="true">
      <div className="lc-w-full lc-min-h-screen" style={{ display: "flex", flexDirection: "column", background: "#F2F5F3", overflowX: "hidden" }}>
        <div style={{ background: "#0F3D36", color: "#F2F5F3" }}>
          <LabelHeader511
            user={user}
            variant="landing"
            logoutSlot={
              user ? (
                <span style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <Link href="/label-check/history">내 결과</Link>
                  <LogoutButton />
                </span>
              ) : undefined
            }
          />
          <section
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 56,
              alignItems: "center",
            }}
            className="lc-pad-hero"
          >
            <div style={{ flex: "1 1 460px", minWidth: 0, display: "flex", flexDirection: "column", gap: 30 }}>
              <p className="lc-h1a lc-mono" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#FF8A75", display: "flex", alignItems: "center", gap: 10 }}>
                <span className="lc-dot" style={{ width: 10, height: 10, borderRadius: 5, background: "#FF6B52", display: "inline-block" }} aria-hidden />
                화장품 표시사항 · 광고 문구 사전 점검
              </p>
              <h1 style={{ margin: 0, fontSize: "clamp(36px, 8vw, 76px)", lineHeight: 1.1, fontWeight: 900, letterSpacing: "-0.045em", textWrap: "balance" }}>
                <span className="lc-h1b" style={{ display: "block" }}>
                  라벨 문구,
                </span>
                <span className="lc-h1c" style={{ display: "block" }}>
                  인쇄 전에{" "}
                  <span style={{ position: "relative", display: "inline-block", color: "#FF8A75" }}>
                    빨간펜
                    <svg style={{ position: "absolute", left: "-4%", bottom: -14, width: "108%", height: 20 }} viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden>
                      <path className="lc-pen" d="M4 12 C 40 2, 70 18, 110 9 S 190 3, 230 12 S 280 6, 296 10" fill="none" stroke="#FF6B52" strokeWidth="5" strokeLinecap="round" />
                    </svg>
                  </span>
                  부터.
                </span>
              </h1>
              <p className="lc-h1d" style={{ margin: 0, fontSize: 19, lineHeight: 1.75, color: "#C6D8D0", maxWidth: "31em" }}>
                PDF나 제품 사진을 올리면 고쳐야 할 문구와 확인해야 할 문구를 바로 표시합니다. 한국 기준과 미국 기준을 따로 점검합니다.
              </p>
              <div className="lc-h1d" style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
                <Link href="/label-check" className="lc-cta lc-cta-solid">
                  무료로 점검하기
                </Link>
                <Link href="/label-check" style={{ display: "inline-flex", alignItems: "center", minHeight: 60, padding: "0 14px", fontSize: 16, fontWeight: 500, color: "#F2F5F3", textUnderlineOffset: 5 }}>
                  샘플 결과 보기
                </Link>
              </div>
              <p className="lc-h1d" style={{ margin: 0, fontSize: 14, color: "#9FBBB0" }}>
                올린 파일은 점검 후 저장하지 않습니다. 참고용 사전 점검이며 법적 판단이 아닙니다.
              </p>
            </div>
            <LandingProofDemo511 />
          </section>
        </div>

        <ReviewBelt511 />

        <section id="try" className="lc-pad-section" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div className="lc-reveal" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="lc-mono" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#B3321F" }}>
              직접 해 보기
            </p>
            <h2 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.2, fontWeight: 900, letterSpacing: "-0.035em", textWrap: "balance" }}>
              문구를 눌러 보면, 이렇게 알려 드립니다
            </h2>
          </div>
          <TryItPicker511 />
        </section>

        <section id="how" className="lc-pad-section" style={{ background: "#FFFFFF", borderTop: "1px solid #D5DDD8", borderBottom: "1px solid #D5DDD8", display: "flex", flexDirection: "column", gap: 48 }}>
          <h2 className="lc-reveal" style={{ margin: 0, fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.2, fontWeight: 900, letterSpacing: "-0.035em", textWrap: "balance" }}>
            올리고, 보고, 고쳐서 다시 확인합니다
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
            {[
              ["1단계", "PDF·사진 올리기", "글자가 살아 있는 PDF는 바로 읽고, 사진이나 이미지 PDF는 글자를 읽은 뒤 직접 확인·수정합니다. 문구만 붙여넣어도 됩니다."],
              ["2단계", "항목별로 결과 보기", "필수 표시사항, 알레르기 성분, 광고 문구를 항목별로 보여 주고 어느 문장이 문제인지 표시합니다."],
              ["3단계", "고친 뒤 다시 점검", "고칠 문구 예시를 참고해 수정하고, 같은 화면에서 다시 점검해 줄어든 항목을 확인합니다."],
            ].map(([n, t, b]) => (
              <div key={n} className="lc-reveal lc-lift" style={{ padding: 30, border: "1px solid #CBD5CF", borderRadius: 14, background: "#F8FAF9", display: "flex", flexDirection: "column", gap: 12 }}>
                <span className="lc-mono" style={{ color: "#B3321F", fontSize: 14, fontWeight: 700 }}>
                  {n}
                </span>
                <h3 style={{ margin: 0, fontSize: 24 }}>{t}</h3>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.75, color: "#3E4F49" }}>{b}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="status" className="lc-pad-section" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div className="lc-reveal" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "40em" }}>
            <h2 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.2, fontWeight: 900, letterSpacing: "-0.035em", textWrap: "balance" }}>
              점수 대신, 해야 할 일로 알려 드립니다
            </h2>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.8, color: "#3E4F49" }}>
              점검하지 못한 부분은 &quot;문제 없음&quot;으로 넘기지 않고 따로 표시합니다. 서비스가 읽지 못한 곳이 어디인지 알 수 있어야 믿고 쓸 수 있다고 생각합니다.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 }}>
            {[
              ["#D6402B", "#B3321F", "고칠 것", "기준에 맞지 않을 가능성이 높아 인쇄 전에 수정해야 하는 문구"],
              ["#B7791F", "#8A5A10", "확인할 것", "예외나 조건에 따라 달라져서 사람이 한 번 더 봐야 하는 문구"],
              ["#6B7A74", "#4B5A54", "확인 못 함", "글자를 읽지 못했거나 판단 근거가 부족해 점검하지 못한 부분"],
              ["#1F7A56", "#1F7A56", "문제 없음", "점검한 범위에서 걸리는 것이 없는 항목 (법에 맞는다는 뜻은 아닙니다)"],
            ].map(([top, c, t, b]) => (
              <div key={t} className="lc-reveal lc-lift" style={{ background: "#FFFFFF", border: "1px solid #CBD5CF", borderTop: `6px solid ${top}`, borderRadius: 12, padding: 26, display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: c }}>{t}</span>
                <span style={{ fontSize: 16, lineHeight: 1.7, color: "#3E4F49" }}>{b}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lc-reveal lc-cta-band" style={{ background: "#0F3D36", color: "#F2F5F3", borderRadius: 18, padding: "clamp(32px, 6vw, 64px)", display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 40px)", lineHeight: 1.2, fontWeight: 900, letterSpacing: "-0.035em", textWrap: "balance" }}>
              지금 가진 시안으로 한 번 해 보세요
            </h2>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.7, color: "#C6D8D0" }}>
              로그인 없이 무료로 점검할 수 있고, 회원이 되면 결과를 저장해 다시 볼 수 있습니다.
            </p>
          </div>
          <Link href="/label-check" className="lc-cta lc-cta-solid">
            점검 시작하기
          </Link>
        </section>

        <LabelFooter511 />
      </div>
    </LabelSiteShell511>
  );
}
