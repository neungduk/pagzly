"use client";

import type { CSSProperties, ReactNode } from "react";
import { joinNumericSuffix } from "@/lib/detail-typography";

type EditableTextProps = {
  value: string;
  enabled?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  multiline?: boolean;
  as?: "h2" | "h3" | "p" | "span";
  /** 강조 색면 블록(패턴 C) 등에서 텍스트 색 반전용 */
  style?: CSSProperties;
  /** 96차 — AI 패치 타겟 필드 경로 */
  elementPath?: string;
  onElementSelect?: (elementPath: string) => void;
  /** 편집 중이 아닐 때 value 대신 그릴 내용(같은 글자, 색만 나눈 span 등) */
  display?: ReactNode;
};

export default function EditableText({
  value,
  enabled,
  onChange,
  className = "",
  multiline = false,
  as = "p",
  style,
  elementPath,
  onElementSelect,
  display,
}: EditableTextProps) {
  function handleSelect() {
    if (elementPath && onElementSelect) onElementSelect(elementPath);
  }

  if (!enabled) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {display ?? joinNumericSuffix(value)}
      </Tag>
    );
  }

  const editClass = `${className} w-full rounded-sm bg-white/25 px-1 outline outline-1 outline-dashed outline-white/70 ${
    elementPath ? "cursor-pointer ring-offset-1 focus:ring-2 focus:ring-registration-red/40" : ""
  }`;

  if (multiline) {
    return (
      <textarea
        className={`${editClass} resize-y`}
        value={value}
        rows={3}
        style={style}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={handleSelect}
        onClick={handleSelect}
        data-element-path={elementPath}
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
      onFocus={handleSelect}
      onClick={handleSelect}
      data-element-path={elementPath}
    />
  );
}
