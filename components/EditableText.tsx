"use client";

import type { CSSProperties } from "react";

type EditableTextProps = {
  value: string;
  enabled?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  multiline?: boolean;
  as?: "h2" | "h3" | "p" | "span";
  /** 강조 색면 블록(패턴 C) 등에서 텍스트 색 반전용 */
  style?: CSSProperties;
};

export default function EditableText({
  value,
  enabled,
  onChange,
  className = "",
  multiline = false,
  as = "p",
  style,
}: EditableTextProps) {
  if (!enabled) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    );
  }

  const editClass = `${className} w-full rounded-sm bg-white/25 px-1 outline outline-1 outline-dashed outline-white/70`;

  if (multiline) {
    return (
      <textarea
        className={`${editClass} resize-y`}
        value={value}
        rows={3}
        style={style}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  return (
    <input
      type="text"
      className={editClass}
      value={value}
      style={style}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
