/** 523 — 토스 화면 인라인 SVG 아이콘 (currentColor, 24px) */
import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconChevronRight(p: P) {
  return (
    <Svg {...p}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function IconChevronDown(p: P) {
  return (
    <Svg {...p}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconCheck(p: P) {
  return (
    <Svg {...p}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  );
}

export function IconCopy(p: P) {
  return (
    <Svg {...p}>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 16V5a2 2 0 0 1 2-2h9" />
    </Svg>
  );
}

export function IconPhoto(p: P) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M3 16l5-4 4 3 3-2 6 5" />
    </Svg>
  );
}

export function IconDoc(p: P) {
  return (
    <Svg {...p}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
    </Svg>
  );
}

export function IconWarn(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 3l9 16H3L12 3z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function IconClose(p: P) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconRefresh(p: P) {
  return (
    <Svg {...p}>
      <path d="M4 12a8 8 0 0 1 14-5" />
      <path d="M20 12a8 8 0 0 1-14 5" />
      <path d="M18 4v4h-4" />
      <path d="M6 20v-4h4" />
    </Svg>
  );
}

export function IconText(p: P) {
  return (
    <Svg {...p}>
      <path d="M5 7h14" />
      <path d="M12 7v12" />
      <path d="M8 19h8" />
    </Svg>
  );
}
