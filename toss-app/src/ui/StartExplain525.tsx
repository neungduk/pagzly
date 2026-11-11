/** 525 — 시작 화면 설명 구역(PC 랜딩과 같은 뜻, 토스 전용 작은 부품) */
import { DISCLAIMER_PRINT_485, SAMPLE_BANNER_486 } from "@/lib/label-check/types";
import { LANDING_FIX_PAIRS_519 } from "@/components/label-check/ui-511/landing-demo-514";
import { labelContactEmail } from "@/lib/label-check/contact";
import { useState } from "react";
import { RULE_COUNTS_525 } from "./rule-counts-525";
import { IconCheck, IconDoc, IconPhoto, IconText } from "./icons";

const STEPS = [
  {
    icon: IconPhoto,
    title: "파일이나 사진을 올려요",
    body: "PDF·사진·문구 중 하나로 시작해요.",
  },
  {
    icon: IconDoc,
    title: "표시·알레르기·광고 문구를 확인해요",
    body: "필수 표시사항·알레르기 성분·주의가 필요한 광고 문구를 읽어요.",
  },
  {
    icon: IconText,
    title: "고칠 곳과 이유를 보여 줘요",
    body: "카드로 근거와 고쳐 쓴 문구 예시를 함께 봐요.",
  },
] as const;

const PROOF = [
  "파일은 점검 후 저장하지 않아요",
  "참고용 사전 점검이며 법적 판단이 아니에요",
  "읽은 글자는 확인하고 고칠 수 있어요",
] as const;

const FIX_MINI = LANDING_FIX_PAIRS_519.slice(0, 2);

export function StartExplain525() {
  const [copied, setCopied] = useState(false);
  const contactEmail = labelContactEmail();
  const counts = RULE_COUNTS_525;

  return (
    <div className="toss-explain">
      <section className="toss-explain-card" aria-labelledby="toss-how-title">
        <h2 id="toss-how-title" className="toss-explain-h">
          이렇게 점검해요
        </h2>
        <ol className="toss-explain-steps">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="toss-explain-step">
                <span className="toss-explain-step-ico" aria-hidden>
                  <Icon size={22} />
                </span>
                <span className="toss-explain-step-body">
                  <b>
                    <span className="toss-explain-step-no">{i + 1}</span>
                    {s.title}
                  </b>
                  <small>{s.body}</small>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="toss-explain-stats" aria-label="점검 범위 숫자">
        <div className="toss-explain-stat">
          <div className="toss-explain-stat-n">{counts.kr}</div>
          <div className="toss-explain-stat-l">
            한국 기준
            <br />
            표시·광고 항목
          </div>
        </div>
        <div className="toss-explain-stat">
          <div className="toss-explain-stat-n">{counts.us}</div>
          <div className="toss-explain-stat-l">
            미국 기준
            <br />
            라벨 항목
          </div>
        </div>
        <div className="toss-explain-stat">
          <div className="toss-explain-stat-n">3</div>
          <div className="toss-explain-stat-l">
            입력 방식
            <br />
            PDF·사진·문구
          </div>
        </div>
        <div className="toss-explain-stat">
          <div className="toss-explain-stat-n">0</div>
          <div className="toss-explain-stat-l">
            점검 후 보관
            <br />
            원본 파일
          </div>
        </div>
      </section>

      <section className="toss-explain-card" aria-labelledby="toss-fix-title">
        <h2 id="toss-fix-title" className="toss-explain-h">
          이런 걸 찾아 줘요
        </h2>
        <p className="toss-explain-virtual">{SAMPLE_BANNER_486}</p>
        <div className="toss-explain-fixes">
          {FIX_MINI.map((p) => {
            const [pre, post] = p.before.split(p.beforeEm);
            return (
              <article key={p.before} className="toss-explain-fix">
                <p className="toss-explain-before">
                  {pre}
                  <span className="toss-explain-strike">{p.beforeEm}</span>
                  {post}
                </p>
                <p className="toss-explain-after">{p.after}</p>
                <p className="toss-explain-note">{p.note}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="toss-explain-card" aria-label="믿을 근거">
        <ul className="toss-explain-proof">
          {PROOF.map((line) => (
            <li key={line}>
              <IconCheck size={18} style={{ color: "#1D4ED8", flex: "none" }} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="toss-foot-note">
        {DISCLAIMER_PRINT_485}
        {contactEmail ? (
          <>
            {" · "}
            <button
              type="button"
              className="toss-foot-mail"
              onClick={() => {
                void navigator.clipboard.writeText(contactEmail).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? "복사했어요" : `문의 ${contactEmail}`}
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}
