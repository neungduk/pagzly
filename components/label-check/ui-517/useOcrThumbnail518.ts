"use client";

import { useEffect, useState } from "react";

/** 518 — 읽은 글자 확인 화면용 썸네일. 이미지 파일일 때만 만들고, 화면을 벗어나면 해제한다(저장 없음). */
export function useOcrThumbnail518(file: File | null, active: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!active || !file) {
      setUrl(null);
      return;
    }
    const isImg = /^image\//i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!isImg) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file, active]);
  return url;
}
