import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// PDF.js 공개 경로 — Vite public/ 기준 상대 경로
(window as Window & { __PAGZLY_PDFJS_BASE__?: string }).__PAGZLY_PDFJS_BASE__ =
  "./label-check-pdfjs";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
