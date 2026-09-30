/**
 * 상세페이지 PNG 캡처.
 * - 원격 이미지를 data URL로 인라인 (CORS → 하얀/빈 이미지 방지)
 * - scroll-reveal opacity:0 강제 해제
 * - 가로는 항상 마켓 목표 폭, 세로가 캔버스 한도를 넘으면 여러 장으로 분할 (초장문 페이지에서 빈 PNG 방지)
 * - Blob 다운로드 (긴 data URL 0바이트 방지)
 */

import { toSvg } from "html-to-image";

/** 한 장(캔버스)의 세로 상한 — Chrome 실사용 한도보다 여유 */
export const MAX_CANVAS_EDGE = 14000;
const CAPTURE_BACKGROUND = "#FAF8F3";
/** data URL 디코드는 수백 ms면 끝난다. 넘기면 그 이미지는 현재 상태로 캡처하고 진행 */
const IMAGE_DECODE_TIMEOUT_MS = 15_000;

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
  // 화면 밖 loading="lazy" 이미지는 src를 바꿔도 로드되지 않아 decode()가 영원히 끝나지 않는다(280차 재현)
  imgs.forEach((img) => {
    if (img.loading !== "lazy") return;
    img.loading = "eager";
    restores.push(() => {
      img.loading = "lazy";
    });
  });
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
    imgs.map((img) =>
      Promise.race([
        img.decode?.().catch(() => undefined) ??
          new Promise<void>((resolve) => {
            if (img.complete) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          }),
        new Promise<void>((resolve) => setTimeout(resolve, IMAGE_DECODE_TIMEOUT_MS)),
      ]),
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("캡처 이미지를 불러오지 못했습니다."));
    img.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size >= 1000) resolve(blob);
      else reject(new Error("캡처 결과가 비어 있습니다. 잠시 후 다시 시도해 주세요."));
    }, "image/png");
  });
}

/** 세로 구간(CSS px). 각 구간은 targetWidth 배율로 출력 시 maxPartHeightPx 이하 */
export function planCaptureParts(
  cssHeight: number,
  scale: number,
  maxPartHeightPx: number,
): { y: number; h: number }[] {
  const partCss = Math.max(1, Math.floor(maxPartHeightPx / scale));
  const parts: { y: number; h: number }[] = [];
  for (let y = 0; y < cssHeight; y += partCss) {
    parts.push({ y, h: Math.min(partCss, cssHeight - y) });
  }
  return parts;
}

/**
 * 마켓 권장 가로(targetWidthPx)를 항상 지킨 PNG 목록.
 * 세로가 maxPartHeightPx를 넘으면 가로를 줄이지 않고 여러 장으로 나눈다.
 * DOM 클론·이미지/폰트 임베드는 SVG 한 번으로 끝내고, 구간별로 캔버스에 잘라 그린다.
 */
export async function captureDetailToPngBlobs(
  root: HTMLElement,
  targetWidthPx: number,
  maxPartHeightPx: number = MAX_CANVAS_EDGE,
): Promise<Blob[]> {
  const { width: elWidth, height: elHeight } = measureCaptureSize(root);
  const scale = targetWidthPx / elWidth;
  const parts = planCaptureParts(elHeight, scale, Math.min(maxPartHeightPx, MAX_CANVAS_EDGE));

  console.log(
    `[capture] css=${elWidth}x${elHeight} scale=${scale.toFixed(3)} targetW=${targetWidthPx} parts=${parts.length} ` +
      `out=${parts.map((p) => `${targetWidthPx}x${Math.round(p.h * scale)}`).join(",")}`,
  );

  const svg = await toSvg(root, {
    cacheBust: false,
    backgroundColor: CAPTURE_BACKGROUND,
    width: elWidth,
    height: elHeight,
  });
  const img = await loadImage(svg);

  const blobs: Blob[] = [];
  for (const part of parts) {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidthPx;
    canvas.height = Math.max(1, Math.round(part.h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas를 사용할 수 없습니다.");
    ctx.fillStyle = CAPTURE_BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, part.y, elWidth, part.h, 0, 0, canvas.width, canvas.height);
    blobs.push(await canvasToPngBlob(canvas));
    canvas.width = 0;
    canvas.height = 0;
  }
  return blobs;
}
