/** 511 — 시안형 로고 마크(둥근 사각형 + 체크). 라벨 화면 헤더 전용. */
export function LabelMark511({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#111214" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8.5l3.2 3.2L13 4.5" />
      </svg>
    </span>
  );
}
