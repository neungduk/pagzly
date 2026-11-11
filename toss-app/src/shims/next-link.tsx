import type { AnchorHTMLAttributes, ReactNode } from "react";

/** Vite에서 next/link 대체 — <a>만 렌더 */
export default function Link({
  href,
  children,
  ...rest
}: {
  href: string;
  children?: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
