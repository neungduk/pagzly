"use client";

const PHRASES = [
  "UPLOAD",
  "COLOR EXTRACT",
  "AI COPY",
  "LAYOUT",
  "DOWNLOAD",
  "SMARTSTORE",
  "COUPANG",
  "2 MIN",
] as const;

/** 랜딩 ink 마키 — 브랜드 블랙 밴드 위 흰 타이포 무한 스크롤 */
export default function LandingMarquee() {
  const row = [...PHRASES, ...PHRASES, ...PHRASES];
  return (
    <div
      className="relative overflow-hidden border-y border-ink bg-ink py-4 text-paper"
      aria-hidden="true"
    >
      <div className="pagzly-landing-marquee flex w-max gap-10 whitespace-nowrap will-change-transform">
        {row.map((phrase, i) => (
          <span
            key={`${phrase}-${i}`}
            className="inline-flex items-center gap-10 font-heading text-2xl font-bold tracking-[-0.03em] sm:text-3xl"
          >
            <span className="text-paper">{phrase}</span>
            <span className="h-2 w-2 rounded-full bg-registration-red" />
          </span>
        ))}
      </div>
    </div>
  );
}
