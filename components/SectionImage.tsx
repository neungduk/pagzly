"use client";

import { useEffect, useState } from "react";

type SectionImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
};

export default function SectionImage({
  src,
  alt,
  className,
  fallbackSrc,
}: SectionImageProps) {
  const [current, setCurrent] = useState(src);

  useEffect(() => {
    setCurrent(src);
  }, [src]);

  const resolved = current || fallbackSrc || "";
  if (!resolved) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      className={className}
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) {
          setCurrent(fallbackSrc);
        }
      }}
    />
  );
}
