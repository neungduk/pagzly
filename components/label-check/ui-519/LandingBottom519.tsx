import Link from "next/link";
import {
  LANDING_FIX_PAIRS_519,
  LANDING_FIX_STAMP_519,
  LANDING_FINALE_STEPS_519,
} from "../ui-511/landing-demo-514";

/** 519 — 하단 '고친 문장' 쪽지: 빨간 줄이 그어지고 고쳐 쓴 문장이 파란 형광펜으로 써진다(CSS만). */
export function FixShowcase519() {
  return (
    <div className="lc519-fix-band">
      <section id="fix" className="lc519-fix">
        <div className="lc519-fix-copy">
          <p className="lc519-kicker lc-mono">BEFORE → AFTER</p>
          <h2 className="lc519-fix-title">
            틀렸다는 말로 끝내지 않고
            <br />
            <span className="lc519-fix-em">고친 문장</span>까지
          </h2>
          <p className="lc519-fix-lead">
            어느 문장이 걸렸는지 표시하고, 빠진 항목은 넣을 문구 예시를 함께 보여 드립니다. 고친 뒤 다시 올려
            확인하세요.
          </p>
          <a href="#demo" className="lc519-fix-link">
            결과 화면 둘러보기 <span aria-hidden>→</span>
          </a>
        </div>

        <div className="lc519-notes" aria-label="고친 문장 예시">
          <div className="lc519-notes-glow" aria-hidden />
          {LANDING_FIX_PAIRS_519.map((p, i) => {
            const [pre, post] = p.before.split(p.beforeEm);
            return (
              <article key={p.before} className={`lc519-note n${i}`}>
                <div className="lc519-note-head lc-mono">
                  <span>예시 {String(i + 1).padStart(2, "0")}</span>
                  <span>/ {String(LANDING_FIX_PAIRS_519.length).padStart(2, "0")}</span>
                </div>
                <div className="lc519-note-lab lc-mono bad">BEFORE</div>
                <p className="lc519-note-before">
                  {pre}
                  <span className="lc519-strike">
                    {p.beforeEm}
                    <i aria-hidden />
                  </span>
                  {post}
                </p>
                <div className="lc519-note-arrow" aria-hidden>
                  ↓
                </div>
                <div className="lc519-note-lab lc-mono good">AFTER</div>
                <p className="lc519-note-after">
                  <span className="lc519-hl">{p.after}</span>
                </p>
                <p className="lc519-note-sub">{p.note}</p>
                <span className="lc519-stamp" aria-hidden>
                  {LANDING_FIX_STAMP_519}
                </span>
              </article>
            );
          })}
          <p className="lc519-notes-foot lc-mono">예시 문구입니다. 제품 인정 범위에 맞게 쓰세요. 법적 판단이 아닙니다.</p>
        </div>
      </section>
    </div>
  );
}

/** 519 — 마무리 CTA: 어두운 판 + 떠다니는 태그 + 3단계. */
export function Finale519() {
  return (
    <section id="start" className="lc519-fin-band">
      <div className="lc519-fin">
        <div className="lc519-fin-wash" aria-hidden>
          <i className="a" />
          <i className="b" />
          <i className="c" />
        </div>
        <span className="lc519-fin-tag t1" aria-hidden>
          <i className="d fix" />
          고칠 것
        </span>
        <span className="lc519-fin-tag t2" aria-hidden>
          <i className="d check" />
          확인할 것
        </span>
        <span className="lc519-fin-tag t3" aria-hidden>
          <i className="d ok" />
          문제 없음
        </span>

        <div className="lc519-fin-copy">
          <h2 className="lc519-fin-title">지금 올려 보세요</h2>
          <p className="lc519-fin-sub">회원가입 없이 바로 점검할 수 있습니다.</p>
          <Link href="/label-check" className="lc519-fin-cta">
            <span className="lc519-fin-ring" aria-hidden />
            내 라벨 점검하기
            <span className="lc519-fin-arrow" aria-hidden>
              →
            </span>
          </Link>
        </div>

        <ol className="lc519-steps">
          {LANDING_FINALE_STEPS_519.map((s) => (
            <li key={s.no} className="lc519-step">
              <span className="lc519-step-no lc-mono">{s.no}</span>
              <span className="lc519-step-txt">
                <b>{s.title}</b>
                <small>{s.body}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
