"use client";

import { useCallback, useState } from "react";

export function CopyButton507({ text, label = "문구 복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      // 폴백: 선택
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setDone(true);
        window.setTimeout(() => setDone(false), 1500);
      } catch {
        /* ignore */
      }
    }
  }, [text]);

  return (
    <button type="button" className="lc507-copy" onClick={() => void onCopy()} aria-live="polite">
      {done ? "복사했어요" : label}
    </button>
  );
}
