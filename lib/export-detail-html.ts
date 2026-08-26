import type { CategoryTheme } from "@/lib/category-theme";
import type { DetailSection } from "@/lib/types/generate";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionHtml(
  section: DetailSection,
  imageUrls: string[],
  theme: CategoryTheme,
): string {
  const accent = theme.accent;
  const deep = theme.deepAccent;
  const pad = "padding:56px 24px;";

  switch (section.type) {
    case "hero": {
      const src = imageUrls[section.imageIndex] ?? imageUrls[0] ?? "";
      return `<section class="hero" style="${pad}position:relative;min-height:70vh;background:${theme.baseNeutral}">
        ${src ? `<img src="${esc(src)}" alt="" style="width:100%;height:70vh;object-fit:cover"/>` : ""}
        <div style="position:absolute;inset:0;background:linear-gradient(0deg,${deep}cc,transparent);display:flex;align-items:flex-end;padding:40px 24px">
          <div><h1 style="color:#FAF8F3;font-size:2rem;margin:0">${esc(section.headline)}</h1>
          ${section.subheadline ? `<p style="color:#FAF8F3cc;margin:8px 0 0">${esc(section.subheadline)}</p>` : ""}</div>
        </div></section>`;
    }
    case "checklist":
      return `<section style="${pad}background:${section.boldBlock ? deep : theme.baseNeutral};color:${section.boldBlock ? "#FAF8F3" : "#1B1B18"}">
        <h2 style="text-align:center">${esc(section.heading)}</h2>
        <ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px;list-style:none;padding:0;margin:32px 0 0">
          ${section.items.map((item) => `<li style="text-align:center">${esc(item)}</li>`).join("")}
        </ul></section>`;
    case "highlight_box": {
      const cards = section.cards.slice(0, 4);
      const center = Math.floor((cards.length - 1) / 2);
      return `<section style="${pad}background:${theme.baseNeutral}">
        <h2 style="text-align:center">${esc(section.heading)}</h2>
        <div style="display:grid;grid-template-columns:repeat(${Math.min(3, cards.length)},1fr);gap:12px;margin-top:32px;max-width:900px;margin-left:auto;margin-right:auto">
          ${cards
            .map((card, i) => {
              const em = i === center;
              return `<div class="${em ? "pulse-card" : ""}" style="border-radius:16px;padding:28px 20px;text-align:center;background:${em ? deep : accent + "14"};color:${em ? "#FAF8F3" : "#1B1B18"}">
                <div style="font-size:10px;letter-spacing:.2em;opacity:.7">${String(i + 1).padStart(2, "0")}</div>
                <h3 style="margin:8px 0">${esc(card.title)}</h3>
                <p style="margin:0;font-size:14px;opacity:.9">${esc(card.body)}</p>
              </div>`;
            })
            .join("")}
        </div></section>`;
    }
    case "step_card":
      return `<section style="${pad}background:${theme.baseNeutral}">
        <h2 style="text-align:center">${esc(section.heading)}</h2>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:32px;max-width:900px;margin-left:auto;margin-right:auto">
          ${section.steps
            .map((step, i) => {
              const src = imageUrls[step.imageIndex] ?? "";
              return `<div><div style="position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:#eee">
                ${src ? `<img src="${esc(src)}" alt="" style="width:100%;height:100%;object-fit:cover"/>` : ""}
                <span style="position:absolute;left:10px;top:10px;background:${accent};color:#FAF8F3;font-size:10px;padding:4px 10px;border-radius:999px">STEP ${String(i + 1).padStart(2, "0")}</span>
              </div><h3 style="margin:12px 0 4px">${esc(step.title)}</h3><p style="margin:0;font-size:13px;opacity:.8">${esc(step.body)}</p></div>`;
            })
            .join("")}
        </div></section>`;
    case "stat_infographic":
      return `<section style="${pad}background:${theme.baseNeutral}">
        <h2 style="text-align:center">${esc(section.heading)}</h2>
        <div style="max-width:480px;margin:32px auto 0;display:flex;flex-direction:column;gap:20px">
          ${section.metrics
            .map((m) => {
              const pct = Math.min(100, Math.max(0, m.percent ?? 0));
              if (m.style === "number") {
                return `<div style="text-align:center"><div style="font-size:2rem;font-weight:700;color:${deep}">${esc(m.value)}</div><div style="font-size:13px;opacity:.65">${esc(m.label)}</div></div>`;
              }
              return `<div><div style="display:flex;justify-content:space-between;font-size:14px"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></div>
                <div style="height:10px;background:${accent}29;border-radius:999px;margin-top:8px;overflow:hidden">
                  <div class="fill-bar" style="height:100%;width:${pct}%;background:${accent};border-radius:999px"></div>
                </div></div>`;
            })
            .join("")}
        </div></section>`;
    case "comparison_chart":
      return `<section style="${pad}background:${theme.baseNeutral}">
        <p style="text-align:center;color:${deep};font-size:11px;letter-spacing:.2em">COMPARE</p>
        <h2 style="text-align:center">${esc(section.heading)}</h2>
        <div style="max-width:420px;margin:32px auto 0;display:flex;flex-direction:column;gap:24px">
          ${section.metrics
            .map((m) => {
              const max = Math.max(m.ourValue, m.baselineValue, 1);
              const ourP = (m.ourValue / max) * 100;
              const baseP = (m.baselineValue / max) * 100;
              const unit = section.unit ?? "%";
              return `<div><p style="font-size:14px;margin:0 0 8px">${esc(m.label)}</p>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:72px;font-size:11px;color:${deep}">${esc(section.ourLabel)}</span>
                  <div style="flex:1;height:10px;background:${accent}1f;border-radius:999px"><div class="fill-bar" style="height:100%;width:${ourP}%;background:${accent}"></div></div>
                  <span style="width:48px;text-align:right;font-size:11px">${m.ourValue}${esc(unit)}</span></div>
                <div style="display:flex;align-items:center;gap:8px"><span style="width:72px;font-size:11px;opacity:.45">${esc(section.baselineLabel)}</span>
                  <div style="flex:1;height:10px;background:#000014;border-radius:999px"><div class="fill-bar" style="height:100%;width:${baseP}%;background:#000040"></div></div>
                  <span style="width:48px;text-align:right;font-size:11px;opacity:.45">${m.baselineValue}${esc(unit)}</span></div>
              </div>`;
            })
            .join("")}
        </div>
        ${section.basisNote ? `<p style="text-align:center;font-size:11px;opacity:.4;margin-top:20px">${esc(section.basisNote)}</p>` : ""}
      </section>`;
    case "image_text": {
      const src = imageUrls[section.imageIndex] ?? "";
      return `<section style="${pad}background:${theme.baseNeutral}">
        <div style="display:flex;flex-direction:column;gap:16px;max-width:640px;margin:0 auto">
          ${src ? `<img src="${esc(src)}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px"/>` : ""}
          <h2>${esc(section.heading)}</h2>
          <p style="line-height:1.6;opacity:.8">${esc(section.body)}</p>
        </div></section>`;
    }
    case "usage_steps":
      return `<section style="${pad}background:${theme.baseNeutral}">
        <h2 style="text-align:center">${esc(section.heading)}</h2>
        <ol style="max-width:640px;margin:32px auto 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:16px">
          ${section.steps.map((s, i) => `<li><span style="color:${accent};font-size:11px">STEP ${String(i + 1).padStart(2, "0")}</span><div>${esc(s)}</div></li>`).join("")}
        </ol></section>`;
    case "custom_gif":
      return `<section style="${pad}background:${theme.baseNeutral};text-align:center">
        ${section.heading ? `<h2>${esc(section.heading)}</h2>` : ""}
        <img src="${esc(section.gifUrl)}" alt="" style="max-width:100%;border-radius:12px"/>
      </section>`;
    case "cta_price":
      return `<section style="${pad}background:${deep};color:#FAF8F3;text-align:center">
        <p style="font-size:2rem;font-weight:700;margin:0">₩${section.price.toLocaleString("ko-KR")}</p>
        ${section.targetCustomer ? `<p style="opacity:.85">${esc(section.targetCustomer)}</p>` : ""}
      </section>`;
    case "faq":
      return `<section style="${pad}background:${theme.baseNeutral}">
        <h2 style="text-align:center">${esc(section.heading)}</h2>
        <div style="max-width:640px;margin:24px auto 0">
          ${section.items.map((item) => `<details style="margin-bottom:12px;border-bottom:1px solid ${accent}33;padding-bottom:12px"><summary style="font-weight:600;cursor:pointer">${esc(item.question)}</summary><p style="opacity:.75;margin:8px 0 0">${esc(item.answer)}</p></details>`).join("")}
        </div></section>`;
    default: {
      const heading =
        "heading" in section && typeof section.heading === "string" ? section.heading : "";
      const body = "body" in section && typeof section.body === "string" ? section.body : "";
      return `<section style="${pad}background:${theme.baseNeutral}">
        ${heading ? `<h2 style="text-align:center">${esc(heading)}</h2>` : ""}
        ${body ? `<p style="max-width:640px;margin:16px auto 0;line-height:1.6;opacity:.8">${esc(body)}</p>` : ""}
      </section>`;
    }
  }
}

/** 자사몰·미리보기용 HTML (바 fill / 강조 카드 pulse CSS 포함). PNG와 별개. */
export function buildDetailPageHtml(opts: {
  productName: string;
  category: string;
  sections: DetailSection[];
  imageUrls: string[];
  theme: CategoryTheme;
  hiddenIndexes?: number[];
}): string {
  const hidden = new Set(opts.hiddenIndexes ?? []);
  const body = opts.sections
    .map((section, index) => (hidden.has(index) ? "" : sectionHtml(section, opts.imageUrls, opts.theme)))
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(opts.productName)} — 상세페이지</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#FAF8F3;color:#1B1B18}
  h1,h2,h3{font-family:Georgia,"Times New Roman",serif;font-weight:700}
  @keyframes fillBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  .fill-bar{transform-origin:left center;animation:fillBar .9s ease-out both}
  @keyframes pulseCard{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  .pulse-card{animation:pulseCard 2.4s ease-in-out infinite}
  @media (prefers-reduced-motion:reduce){.fill-bar,.pulse-card{animation:none!important}}
</style>
</head>
<body>
<header style="padding:16px 24px;border-bottom:1px solid #DAD5C9;font-size:12px;opacity:.6">${esc(opts.category)} · ${esc(opts.productName)}</header>
${body}
<footer style="padding:32px 24px;text-align:center;font-size:11px;opacity:.4">Pagzly HTML export · 웹 미리보기용 (마켓 통이미지와 별도)</footer>
</body>
</html>`;
}
