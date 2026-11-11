import type { HTMLAttributes } from "react";
import "./label-site-511.css";
import "../ui-517/label-check-517.css";

export function LabelSiteShell511({
  children,
  className,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`lc-site${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </div>
  );
}
