"use client";

type EditableTextProps = {
  value: string;
  enabled?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  multiline?: boolean;
  as?: "h2" | "h3" | "p" | "span";
};

export default function EditableText({
  value,
  enabled,
  onChange,
  className = "",
  multiline = false,
  as = "p",
}: EditableTextProps) {
  if (!enabled) {
    const Tag = as;
    return <Tag className={className}>{value}</Tag>;
  }

  const editClass = `${className} w-full rounded-sm bg-white/25 px-1 outline outline-1 outline-dashed outline-white/70`;

  if (multiline) {
    return (
      <textarea
        className={`${editClass} resize-y`}
        value={value}
        rows={3}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  return (
    <input
      type="text"
      className={editClass}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
