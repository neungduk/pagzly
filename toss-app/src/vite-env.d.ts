/// <reference types="vite/client" />

interface Window {
  __PAGZLY_PDFJS_BASE__?: string;
}

interface ImportMetaEnv {
  readonly VITE_LABEL_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
