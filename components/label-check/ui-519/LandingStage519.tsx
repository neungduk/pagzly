import Link from "next/link";
import { labelRuleCounts514 } from "@/lib/label-check/rules-count-514";
import {
  LANDING_DEMO_EXPIRY_WARN_514,
  LANDING_DEMO_FILE_514,
  LANDING_DEMO_INGREDIENTS_514,
  LANDING_DEMO_LOT_514,
  LANDING_DEMO_NET_514,
  LANDING_DEMO_PHRASE_BAD_514,
  LANDING_DEMO_PHRASE_WARN_514,
  LANDING_DEMO_PRODUCT_514,
  LANDING_STAGE_FOOT_519,
  LANDING_STAGE_LEAD_519,
  LANDING_STAGE_LEGAL_519,
  LANDING_STAGE_OK_TAG_519,
  LANDING_STAGE_TAGS_519,
  landingDemoChipCounts514,
} from "@/components/label-check/ui-511/landing-demo-514";
import { CountUp514 } from "./CountUp514";
import "./landing-519.css";

function EmUnderline({ children }: { children: React.ReactNode }) {
  return (
    <span className="lc519-em">
      {children}
      <svg className="lc519-em-line" viewBox="0 0 220 10" preserveAspectRatio="none" aria-hidden>
        <path
          d="M2 7 C40 2, 90 9, 130 5 S190 2, 218 6"
          fill="none"
          stroke="#1D4ED8"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function StageTag({
  kind,
  label,
  delayClass,
}: {
  kind: "fix" | "check" | "ok";
  label: string;
  delayClass: string;
}) {
  return (
    <span className={`lc519-tag ${kind} ${delayClass}`} aria-hidden>
      <i className="lc519-tag-dot" />
      {label}
    </span>
  );
}

function ResultRow({
  no,
  kind,
  title,
  body,
  before,
  beforeEm,
  after,
  afterNote,
  delayClass,
}: {
  no: string;
  kind: "fix" | "check" | "ok";
  title: string;
  body?: string;
  before?: string;
  beforeEm?: string;
  after?: string;
  afterNote?: string;
  delayClass: string;
}) {
  return (
    <div className={`lc519-row ${kind} ${delayClass}`}>
      <div className="lc519-row-head">
        <span className="lc519-row-no lc-mono">{no}</span>
        <span className={`lc519-row-dot ${kind}`} aria-hidden />
        <span className="lc519-row-title">{title}</span>
      </div>
      {before ? (
        <div className="lc519-ba">
          <div className="lc519-block before">
            <div className="lc-mono lc519-ba-lab">BEFORE</div>
            <div className="lc519-ba-txt">
              {beforeEm && before.includes(beforeEm) ? (
                <>
                  {before.split(beforeEm)[0]}
                  <b>{beforeEm}</b>
                  {before.split(beforeEm)[1] || ""}
                </>
              ) : (
                before
              )}
            </div>
          </div>
          {after ? (
            <div className="lc519-block after">
              <div className="lc-mono lc519-ba-lab">AFTER</div>
              <div className="lc519-ba-txt">{after}</div>
              {afterNote ? <div className="lc519-ba-note">{afterNote}</div> : null}
            </div>
          ) : null}
        </div>
      ) : body ? (
        <p className="lc519-row-body">{body}</p>
      ) : null}
    </div>
  );
}

/** 519 — 랜딩 첫 화면(제목 줄 + 제품 무대). */
export function LandingStage519() {
  const { kr } = labelRuleCounts514();
  const chips = landingDemoChipCounts514();
  const tags = LANDING_STAGE_TAGS_519;
  const okTag = LANDING_STAGE_OK_TAG_519;
  const fix = tags[0]!;
  const checkWarn = tags[1]!;
  const checkExpiry = tags[2]!;

  return (
    <div className="lc519-stage-wrap">
      <section className="lc519-hero" aria-label="소개">
        <h1 className="lc519-title">
          인쇄 넣기 전에,
          <br />
          라벨과 광고 문구를
          <br />
          <EmUnderline>
            <CountUp514 to={kr} className="lc519-count" />개 기준
          </EmUnderline>
          으로 먼저 훑어 드립니다
        </h1>
        <div className="lc519-hero-side">
          <p className="lc519-lead">{LANDING_STAGE_LEAD_519}</p>
          <div className="lc519-actions">
            <Link href="/label-check" className="lc519-cta">
              내 라벨 점검해 보기
              <span className="lc519-cta-arrow" aria-hidden>
                →
              </span>
            </Link>
            <a href="#demo" className="lc519-ghost">
              결과 예시 보기
            </a>
          </div>
          <p className="lc519-hints lc-mono">
            <span>로그인 없이 시작</span>
            <span aria-hidden>·</span>
            <span>점검 후 파일 저장 안 함</span>
            <span aria-hidden>·</span>
            <span>한국 · 미국 기준</span>
          </p>
          <p className="lc519-legal">{LANDING_STAGE_LEGAL_519}</p>
        </div>
      </section>

      <section id="demo" className="lc519-board" aria-label="점검 결과 예시">
        <div className="lc519-board-wash" aria-hidden>
          <i className="a" />
          <i className="b" />
          <i className="c" />
        </div>

        <div className="lc519-board-inner">
          <div className="lc519-label-col">
            <div className="lc514-label-card lc519-label-paper">
              <div className="lc-scan514 lc519-scan" aria-hidden />
              <div
                className="lc-mono"
                style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--lc-mute)", marginBottom: 14 }}
              >
                {LANDING_DEMO_FILE_514}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 4 }}>
                {LANDING_DEMO_PRODUCT_514}
              </div>
              <div style={{ fontSize: 13, color: "var(--lc-mute)", marginBottom: 16 }}>{LANDING_DEMO_NET_514}</div>
              <p className="lc519-label-phrase" style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.85 }}>
                <span className="lc519-anchor">
                  <span className="lc515-mk bad lc519-mk">{LANDING_DEMO_PHRASE_BAD_514}</span>
                  <StageTag kind="fix" label={fix.label} delayClass="lc519-d1" />
                </span>{" "}
                앰플. 비타민C 함유로{" "}
                <span className="lc519-anchor">
                  <span className="lc515-mk warn lc519-mk">{LANDING_DEMO_PHRASE_WARN_514}</span>
                  <StageTag kind="check" label={checkWarn.label} delayClass="lc519-d2" />
                </span>
                을 돕고 칙성함을 개선합니다.
              </p>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--lc-sub)" }}>전성분</div>
              <p className="lc-mono lc519-anchor lc519-ing" style={{ margin: "0 0 14px", fontSize: 11.5, lineHeight: 1.7, color: "var(--lc-sub)" }}>
                <span className="lc515-mk ok lc519-mk">{LANDING_DEMO_INGREDIENTS_514}</span>
                <StageTag kind="ok" label={okTag.label} delayClass="lc519-d4" />
              </p>
              <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--lc-mute)", flexWrap: "wrap" }}>
                <span className="lc519-anchor">
                  사용기한{" "}
                  <span
                    className="lc515-mk bad2 lc519-mk"
                    style={{ borderBottom: "2px solid #B7791F", borderRadius: 3, padding: "0 2px" }}
                  >
                    {LANDING_DEMO_EXPIRY_WARN_514}
                  </span>
                  <StageTag kind="check" label={checkExpiry.label} delayClass="lc519-d3" />
                </span>
                <span>제조번호 {LANDING_DEMO_LOT_514}</span>
              </div>
            </div>
          </div>

          <div className="lc519-result-col">
            <div className="lc517-land-hero lc519-result-card">
              <div className="lc519-result-top">
                <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.02em" }}>점검 결과</span>
                <span className="lc-mono" style={{ fontSize: 12, color: "#9A9DA4" }}>
                  고칠 것 {chips.fix} · 확인할 것 {chips.check}
                </span>
              </div>
              <ResultRow
                no="01"
                kind="fix"
                title={`${fix.rowTitle}이에요`}
                before={fix.before}
                beforeEm={fix.beforeEm}
                after={fix.after}
                afterNote={fix.afterNote}
                delayClass="lc519-rd1"
              />
              <ResultRow
                no="02"
                kind="check"
                title={checkExpiry.rowTitle}
                body={checkExpiry.rowBody}
                delayClass="lc519-rd2"
              />
              <ResultRow
                no="03"
                kind="check"
                title={checkWarn.rowTitle}
                body={checkWarn.rowBody}
                delayClass="lc519-rd3"
              />
            </div>
          </div>
        </div>
      </section>

      <p className="lc519-board-foot lc-mono">{LANDING_STAGE_FOOT_519}</p>
    </div>
  );
}
