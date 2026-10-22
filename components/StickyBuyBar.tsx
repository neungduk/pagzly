"use client";

/**
 * 433차 1-5 — 고정 구매 바(라이브 결과 화면 전용). 스크롤하면 하단에 가격 + 구매 버튼을 고정한다(높이 56px ≤ 64px).
 * 구매 카드(`[data-pz-buy]`)가 화면에 들어오면 숨기고, 구매 카드가 DOM에 없으면(미리보기 접힘) 그리지 않는다. 가격이 없으면 호출부가 그리지 않는다.
 * export HTML에는 넣지 않는다(마켓 등록 이미지·외부 플랫폼에서는 의미 없음) — 패리티 예외, 문서: review/433cha-report.md.
 * 앱에 구매 링크 입력이 없어 버튼은 구매 카드로 스크롤한다(href를 주면 그 주소로 연다).
 */
import { useEffect, useState } from "react";

export const STICKY_BUY_BAR_HEIGHT_PX = 56;

export default function StickyBuyBar({ rootRef, price, name, href }: { rootRef: React.RefObject<HTMLElement | null>; price: string; name?: string; href?: string }) {
  const [state, setState] = useState<{ show: boolean; left: number; width: number }>({ show: false, left: 0, width: 0 });
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const buy = root.querySelector<HTMLElement>("[data-pz-buy]");
      const r = root.getBoundingClientRect();
      const vh = window.innerHeight;
      let buyVisible = true;
      if (buy) {
        const b = buy.getBoundingClientRect();
        buyVisible = b.top < vh && b.bottom > 0;
      }
      // 히어로를 지나 본문에 들어왔고(위쪽 400px 이상 스크롤), 상세 영역이 아직 화면에 있으며, 구매 카드가 보이지 않을 때만
      const inside = r.top < -400 && r.bottom > STICKY_BUY_BAR_HEIGHT_PX;
      setState((s) => {
        const next = { show: !!buy && inside && !buyVisible, left: Math.round(r.left), width: Math.round(r.width) };
        return s.show === next.show && s.left === next.left && s.width === next.width ? s : next;
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef]);
  if (!state.show) return null;
  const go = () => rootRef.current?.querySelector("[data-pz-buy]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  return (
    <div
      data-pz-sticky-buy
      style={{ position: "fixed", bottom: 0, left: state.left, width: state.width, height: STICKY_BUY_BAR_HEIGHT_PX, boxSizing: "border-box", zIndex: 30, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", background: "#FFFFFF", borderTop: "1px solid rgba(27,27,24,0.1)", boxShadow: "0 -4px 16px rgba(27,27,24,0.06)" }}
    >
      <div style={{ flex: "1 1 0%", minWidth: 0 }}>
        {name ? <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, lineHeight: 1.3, color: "rgba(27,27,24,0.65)" }}>{name}</p> : null}
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.3, color: "#1B1B18", fontVariantNumeric: "tabular-nums" }}>{price}</p>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" style={btn}>구매하기</a>
      ) : (
        <button type="button" onClick={go} style={btn}>구매하기</button>
      )}
    </div>
  );
}

const btn: React.CSSProperties = { flex: "none", height: 40, padding: "0 22px", border: 0, borderRadius: 8, background: "#1B1B18", color: "#FAF8F3", fontSize: 14, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" };
