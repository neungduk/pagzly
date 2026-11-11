import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = path.resolve(__dirname, "..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiBase = (env.VITE_LABEL_API_BASE || "https://pagzly.com").replace(/\/+$/, "");

  const demoOn = mode === "demo" || env.VITE_DEMO === "1";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": repoRoot,
        "next/link": path.resolve(__dirname, "src/shims/next-link.tsx"),
      },
    },
    define: {
      // labelApiUrl 기본 인자가 process.env 전체를 받음
      "process.env": JSON.stringify({
        NEXT_PUBLIC_LABEL_API_BASE: apiBase,
      }),
      "import.meta.env.VITE_DEMO": JSON.stringify(demoOn ? "1" : ""),
    },
    server: {
      host: true,
      port: 5173,
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
