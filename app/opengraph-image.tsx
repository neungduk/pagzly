import { ImageResponse } from "next/og";

// 426차 W11: 기본 공유 이미지. 기본 폰트에 한글이 없어 라틴 문구만 쓴다(한글 디자인 이미지는 사람이 opengraph-image.png로 교체 가능)
export const alt = "Pagzly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 96px",
          background: "#14110f",
          color: "#f6f1e7",
        }}
      >
        <div style={{ fontSize: 148, fontWeight: 700, letterSpacing: -4, display: "flex" }}>Pagzly</div>
        <div style={{ marginTop: 20, fontSize: 40, color: "#cfc7b6", display: "flex" }}>AI product detail pages, from a single photo</div>
        <div style={{ marginTop: 56, width: 160, height: 8, background: "#d6322b", display: "flex" }} />
      </div>
    ),
    { ...size },
  );
}
