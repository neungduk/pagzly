"use client";

import Link from "next/link";
import {
  useCallback,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  /** 있으면 next/link Link로 렌더 (클라이언트 내부에서만 결정) */
  href?: string;
  style?: CSSProperties;
};

/**
 * 마우스 위치를 따라가는 registration-red 스포트라이트.
 * prefers-reduced-motion 시 그라데이션만 비활성.
 * Link는 이 클라이언트 컴포넌트 내부에서만 선택 — 서버에서 함수 레퍼런스를 넘기지 않음.
 */
export default function SpotlightCard({
  children,
  className = "",
  href,
  style,
}: SpotlightCardProps) {
  const ref = useRef<HTMLElement>(null);

  const onMove = useCallback((e: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--spot-x", `${x}%`);
    el.style.setProperty("--spot-y", `${y}%`);
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--spot-x", "50%");
    el.style.setProperty("--spot-y", "50%");
  }, []);

  const sharedClassName = `group relative ${className}`;
  const sharedStyle = {
    "--spot-x": "50%",
    "--spot-y": "50%",
    ...style,
  } as CSSProperties;

  const spotLayer = (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:hidden"
      style={{
        background:
          "radial-gradient(420px circle at var(--spot-x) var(--spot-y), rgba(193, 39, 45, 0.07), transparent 55%)",
      }}
    />
  );

  if (href) {
    return (
      <Link
        ref={ref as RefObject<HTMLAnchorElement>}
        href={href}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={sharedClassName}
        style={sharedStyle}
      >
        {spotLayer}
        {children}
      </Link>
    );
  }

  return (
    <div
      ref={ref as RefObject<HTMLDivElement>}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={sharedClassName}
      style={sharedStyle}
    >
      {spotLayer}
      {children}
    </div>
  );
}
