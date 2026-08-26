"use client";

const TOP = [
  "UPLOAD",
  "COLOR EXTRACT",
  "AI COPY",
  "LAYOUT",
  "DOWNLOAD",
  "SMARTSTORE",
  "COUPANG",
  "2 MIN",
  "NO DESIGNER",
  "SELL FASTER",
] as const;

const BOTTOM = [
  "PAGZLY",
  "DETAIL PAGE",
  "AUTO GEN",
  "INK BLACK",
  "HIGH CONVERT",
  "ONE PHOTO",
  "READY",
] as const;

function MarqueeRow({
  phrases,
  reverse,
  className,
}: {
  phrases: readonly string[];
  reverse?: boolean;
  className?: string;
}) {
  const row = [...phrases, ...phrases, ...phrases];
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <div
        className={`flex w-max gap-8 whitespace-nowrap will-change-transform sm:gap-12 ${
          reverse ? "pagzly-landing-marquee-rev" : "pagzly-landing-marquee-fast"
        }`}
      >
        {row.map((phrase, i) => (
          <span
            key={`${phrase}-${i}`}
            className="inline-flex items-center gap-8 font-heading text-3xl font-bold tracking-[-0.04em] sm:gap-12 sm:text-5xl"
          >
            <span>{phrase}</span>
            <span className="inline-block h-2.5 w-2.5 shrink-0 bg-registration-red sm:h-3 sm:w-3" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** 이중 역방향 ink 마키 — 더 크고 빠르게 */
export default function LandingMarquee() {
  return (
    <div className="relative overflow-hidden border-y-2 border-ink bg-ink py-5 text-paper" aria-hidden="true">
      <MarqueeRow phrases={TOP} />
      <div className="my-3 h-px w-full bg-paper/15" />
      <MarqueeRow phrases={BOTTOM} reverse className="text-paper/35" />
    </div>
  );
}
