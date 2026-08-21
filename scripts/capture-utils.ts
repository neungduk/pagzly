import type { Page } from "playwright";

/** GSAP ScrollTrigger가 opacity:0으로 숨긴 섹션을 캡처 전에 전부 표시 */
export async function freezeDetailScrollReveal(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll("[data-scroll-reveal]").forEach((node) => {
      const el = node as HTMLElement;
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  });
}
