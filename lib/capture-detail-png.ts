/**
 * 상세페이지 PNG 캡처.
 * - 원격 이미지를 data URL로 인라인 (CORS → 하얀/빈 이미지 방지)
 * - scroll-reveal opacity:0 강제 해제
 * - 캔버스 한도 내로 pixelRatio 조정 (초장문 페이지에서 빈 PNG 방지)
 * - Blob 다운로드 (긴 data URL 0바이트 방지)
 */

import { toPng } from "html-to-image";

/** html-to-image / Chrome 실사용 한도보다 여유 */
const MAX_CANVAS_EDGE = 14000;

type RestoreFn = () => void;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

async function fetchAsDataUrl(src: string): Promise<string | null> {
  const tryFetch = async (url: string) => {
    const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (blob.size < 32) throw new Error("empty body");
    return blobToDataUrl(blob);
  };

  if (src.startsWith("data:") || src.startsWith("blob:")) return src;

  try {
    return await tryFetch(src);
  } catch {
    try {
      return await tryFetch(`/api/proxy-image?url=${encodeURIComponent(src)}`);
    } catch (err) {
      console.warn("[capture] image inline failed", src.slice(0, 120), err);
      return null;
    }
  }
}

export async function prepareCaptureRoot(root: HTMLElement): Promise<RestoreFn> {
  const restores: RestoreFn[] = [];

  root.querySelectorAll<HTMLElement>("[data-scroll-reveal]").forEach((el) => {
    const prevOpacity = el.style.opacity;
    const prevTransform = el.style.transform;
    const prevVisibility = el.style.visibility;
    el.style.opacity = "1";
    el.style.transform = "none";
    el.style.visibility = "visible";
    el.classList.add("is-ink-in");
    restores.push(() => {
      el.style.opacity = prevOpacity;
      el.style.transform = prevTransform;
      el.style.visibility = prevVisibility;
    });
  });

  // 106차 B-2 — 판매자용 AI 배지는 내보내기/캡처에 굽지 않음
  root.querySelectorAll<HTMLElement>("[data-seller-only-badge]").forEach((el) => {
    const prevDisplay = el.style.display;
    el.style.display = "none";
    restores.push(() => {
      el.style.display = prevDisplay;
    });
  });

  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const original = img.currentSrc || img.src;
      if (!original || original.startsWith("data:")) return;
      const dataUrl = await fetchAsDataUrl(original);
      if (!dataUrl) return;
      const prevSrc = img.getAttribute("src");
      const prevCross = img.getAttribute("crossorigin");
      img.removeAttribute("crossorigin");
      img.src = dataUrl;
      restores.push(() => {
        if (prevSrc != null) img.setAttribute("src", prevSrc);
        else img.removeAttribute("src");
        if (prevCross != null) img.setAttribute("crossorigin", prevCross);
        else img.removeAttribute("crossorigin");
      });
    }),
  );

  await Promise.all(
    imgs.map(
      (img) =>
        img.decode?.().catch(() => undefined) ??
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        }),
    ),
  );

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return () => {
    for (const restore of restores.reverse()) restore();
  };
}

function measureCaptureSize(root: HTMLElement): { width: number; height: number } {
  const width = Math.max(1, root.offsetWidth, root.clientWidth);
  let height = Math.max(root.scrollHeight, root.offsetHeight, root.clientHeight);
  let childSum = 0;
  for (const child of Array.from(root.children)) {
    const el = child as HTMLElement;
    childSum += Math.max(el.scrollHeight, el.offsetHeight);
  }
  height = Math.max(1, height, childSum);
  if (width < 40 || height < 40) {
    throw new Error(
      `미리보기 크기가 비정상입니다 (${width}×${height}). 화면을 넓히거나 새로고침 후 다시 시도해 주세요.`,
    );
  }
  return { width, height };
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

/**
 * 마켓 권장 가로에 최대한 맞춘 PNG Blob.
 * 세로가 너무 길면 pixelRatio를 낮춰 한 장에 들어가게 한다 (빈 PNG보다 낫다).
 */
export async function captureDetailToPngBlob(
  root: HTMLElement,
  targetWidthPx: number,
): Promise<Blob> {
  const { width: elWidth, height: elHeight } = measureCaptureSize(root);

  let pixelRatio = targetWidthPx / elWidth;
  if (elHeight * pixelRatio > MAX_CANVAS_EDGE) {
    pixelRatio = MAX_CANVAS_EDGE / elHeight;
  }
  if (elWidth * pixelRatio > MAX_CANVAS_EDGE) {
    pixelRatio = MAX_CANVAS_EDGE / elWidth;
  }
  pixelRatio = Math.max(pixelRatio, 0.25);

  const outWidth = Math.max(1, Math.round(elWidth * pixelRatio));
  const outHeight = Math.max(1, Math.round(elHeight * pixelRatio));

  console.log(
    `[capture] css=${elWidth}x${elHeight} out=${outWidth}x${outHeight} pr=${pixelRatio.toFixed(3)} targetW=${targetWidthPx}`,
  );

  const dataUrl = await toPng(root, {
    pixelRatio,
    cacheBust: false,
    skipAutoScale: true,
    backgroundColor: "#FAF8F3",
    width: elWidth,
    height: elHeight,
    canvasWidth: outWidth,
    canvasHeight: outHeight,
  });

  // data URL → Blob (긴 data URL로 <a download> 하면 0바이트 되는 브라우저 있음)
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (blob.size < 1000) {
    throw new Error("캡처 결과가 비어 있습니다. 잠시 후 다시 시도해 주세요.");
  }
  return blob;
}

export async function captureDetailToPng(
  root: HTMLElement,
  targetWidthPx: number,
): Promise<string> {
  const blob = await captureDetailToPngBlob(root, targetWidthPx);
  return blobToDataUrl(blob);
}
