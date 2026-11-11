import { useCallback, useMemo, useState } from "react";
import { labelApiUrl } from "@/lib/label-check/api-base-520";
import { pdfjsBase521 } from "@/lib/label-check/client-extract-pdf";

type StepStatus = "idle" | "ok" | "fail";
type StepState = { status: StepStatus; detail: string };

type FileDiag = {
  name: string;
  size: number;
  type: string;
  ext: string;
  magicOk: boolean;
  magicKind: string;
  readMs: number;
};

const IDLE: StepState = { status: "idle", detail: "실행 안 함" };

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function magicKind(bytes: Uint8Array): string {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "PDF";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "JPEG";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "PNG";
  }
  // HEIC/HEIF ftyp....heic/heif
  if (bytes.length >= 8) {
    const s = String.fromCharCode(...bytes.slice(4, 8));
    if (s === "ftyp") return "HEIC/HEIF(추정)";
  }
  return "unknown";
}

async function readHead8(file: File): Promise<{ ok: boolean; kind: string; ms: number }> {
  const t0 = performance.now();
  try {
    const buf = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buf);
    return { ok: true, kind: magicKind(bytes), ms: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, kind: "read_fail", ms: Math.round(performance.now() - t0) };
  }
}

function statusClass(s: StepStatus): string {
  if (s === "ok") return "status-ok";
  if (s === "fail") return "status-bad";
  return "status-skip";
}

function statusLabel(s: StepStatus): string {
  if (s === "ok") return "성공";
  if (s === "fail") return "실패";
  return "실행 안 함";
}

export function LabPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [diag, setDiag] = useState<FileDiag | null>(null);
  const [pdfLoad, setPdfLoad] = useState<StepState>(IDLE);
  const [pdfExtract, setPdfExtract] = useState<StepState>(IDLE);
  const [pdfProbe, setPdfProbe] = useState<StepState>(IDLE);
  const [imgPrep, setImgPrep] = useState<StepState>(IDLE);
  const [server, setServer] = useState<StepState>(IDLE);
  const [copyFallback, setCopyFallback] = useState("");

  const onPick = useCallback(async (f: File | null) => {
    setFile(f);
    setPdfLoad(IDLE);
    setPdfExtract(IDLE);
    setPdfProbe(IDLE);
    setImgPrep(IDLE);
    if (!f) {
      setDiag(null);
      return;
    }
    const head = await readHead8(f);
    setDiag({
      name: f.name,
      size: f.size,
      type: f.type || "(empty)",
      ext: extOf(f.name),
      magicOk: head.ok,
      magicKind: head.kind,
      readMs: head.ms,
    });
  }, []);

  const reportText = useMemo(() => {
    const lines: string[] = ["[Pagzly toss lab 521]"];
    if (diag) {
      lines.push(
        `file.name=${diag.name}`,
        `file.size=${diag.size}`,
        `file.type=${diag.type}`,
        `ext=${diag.ext}`,
        `magic.ok=${diag.magicOk}`,
        `magic.kind=${diag.magicKind}`,
        `magic.readMs=${diag.readMs}`,
      );
    } else {
      lines.push("file=(none)");
    }
    lines.push(
      `pdfjs.base=${pdfjsBase521()}`,
      `step.pdfLoad=${statusLabel(pdfLoad.status)} ${pdfLoad.detail}`,
      `step.pdfExtract=${statusLabel(pdfExtract.status)} ${pdfExtract.detail}`,
      `step.pdfProbe=${statusLabel(pdfProbe.status)} ${pdfProbe.detail}`,
      `step.imgPrep=${statusLabel(imgPrep.status)} ${imgPrep.detail}`,
      `step.server=${statusLabel(server.status)} ${server.detail}`,
    );
    return lines.join("\n");
  }, [diag, pdfLoad, pdfExtract, pdfProbe, imgPrep, server]);

  const runPdfLoad = async () => {
    try {
      const { pdfjsBase521: base } = await import("@/lib/label-check/client-extract-pdf");
      const b = base();
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[data-lab-pdfjs]`);
        if (existing) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = `${b}/pdf.min.js`;
        s.async = true;
        s.dataset.labPdfjs = "1";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("pdfjs_script_failed"));
        document.head.appendChild(s);
      });
      setPdfLoad({ status: "ok", detail: `loaded ${b}/pdf.min.js` });
    } catch (e) {
      setPdfLoad({
        status: "fail",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const runPdfExtract = async () => {
    if (!file) {
      setPdfExtract({ status: "fail", detail: "no_file" });
      return;
    }
    try {
      const { extractLabelPdfInBrowser } = await import("@/lib/label-check/client-extract-pdf");
      const payload = await extractLabelPdfInBrowser(file);
      let chars = 0;
      for (const p of payload.pages) {
        for (const it of p.items) chars += (it.text || "").length;
      }
      setPdfExtract({
        status: "ok",
        detail: `pages=${payload.pages.length} chars=${chars}`,
      });
    } catch (e) {
      setPdfExtract({
        status: "fail",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const runPdfProbe = async () => {
    if (!file) {
      setPdfProbe({ status: "fail", detail: "no_file" });
      return;
    }
    try {
      const { probePdfRouteMeta524 } = await import("@/lib/label-check/client-pdf-route-524");
      const meta = await probePdfRouteMeta524(file);
      setPdfProbe({
        status: "ok",
        detail: `route=${meta.route} chars=${meta.charCount} pages=${meta.pageCount}`,
      });
    } catch (e) {
      setPdfProbe({
        status: "fail",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const runImgPrep = async () => {
    if (!file) {
      setImgPrep({ status: "fail", detail: "no_file" });
      return;
    }
    try {
      const { prepareOcrTilesFromFile508 } = await import("@/lib/label-check/client-ocr-prepare");
      const prepared = await prepareOcrTilesFromFile508(file);
      if (!prepared.ok) {
        setImgPrep({ status: "fail", detail: prepared.error || "prep_fail" });
        return;
      }
      const w = prepared.meta?.sourceWidth ?? prepared.meta?.targetWidth ?? 0;
      const h = prepared.meta?.sourceHeight ?? 0;
      setImgPrep({
        status: "ok",
        detail: `size=${w}x${h} tiles=${prepared.tiles.length}`,
      });
    } catch (e) {
      setImgPrep({
        status: "fail",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const runServer = async () => {
    const parts: string[] = [];
    let ok = true;
    for (const path of ["/api/label-check/ocr", "/api/law-watch/baseline"] as const) {
      const url = labelApiUrl(path);
      try {
        const res = await fetch(url, { method: "GET" });
        parts.push(`${path} status=${res.status} cors=ok`);
      } catch (e) {
        ok = false;
        const msg = e instanceof Error ? e.message : String(e);
        parts.push(`${path} cors_or_network_fail ${msg.slice(0, 80)}`);
      }
    }
    setServer({ status: ok ? "ok" : "fail", detail: parts.join(" | ") });
  };

  const copyDiag = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopyFallback("");
    } catch {
      setCopyFallback(reportText);
    }
  };

  return (
    <section className="section" data-lab="1">
      <h2>실험</h2>
      <p className="muted">파일·PDF·서버 연결만 진단합니다. 원문 내용은 표시하지 않습니다.</p>

      <div className="row">
        <label className="file-btn">
          사진
          <input
            type="file"
            accept="image/*"
            onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="file-btn">
          PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="file-btn">
          전체
          <input
            type="file"
            accept="image/*,.heic,.heif,application/pdf"
            onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {diag ? (
        <table className="diag">
          <tbody>
            <tr>
              <th>이름</th>
              <td>{diag.name}</td>
            </tr>
            <tr>
              <th>크기</th>
              <td>{diag.size}</td>
            </tr>
            <tr>
              <th>type</th>
              <td>{diag.type}</td>
            </tr>
            <tr>
              <th>확장자</th>
              <td>{diag.ext}</td>
            </tr>
            <tr>
              <th>매직</th>
              <td>
                {diag.magicOk ? "읽기 성공" : "읽기 실패"} / {diag.magicKind} ({diag.readMs}ms)
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="muted">파일을 선택하면 진단 표가 나타납니다.</p>
      )}

      <div className="row">
        <button type="button" onClick={() => void runPdfLoad()}>
          PDF 읽기 도구 불러오기
        </button>
        <button type="button" onClick={() => void runPdfExtract()} disabled={!file}>
          PDF 글자 추출
        </button>
        <button type="button" onClick={() => void runPdfProbe()} disabled={!file}>
          PDF 경로 판단(probe)
        </button>
        <button type="button" onClick={() => void runImgPrep()} disabled={!file}>
          사진 준비(축소)
        </button>
        <button type="button" onClick={() => void runServer()}>
          서버 연결 확인
        </button>
        <button type="button" className="primary" onClick={() => void copyDiag()}>
          진단 결과 복사
        </button>
      </div>

      <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
        <li className={statusClass(pdfLoad.status)}>
          PDF 도구: {statusLabel(pdfLoad.status)} — {pdfLoad.detail}
        </li>
        <li className={statusClass(pdfExtract.status)}>
          PDF 추출: {statusLabel(pdfExtract.status)} — {pdfExtract.detail}
        </li>
        <li className={statusClass(pdfProbe.status)}>
          PDF 경로: {statusLabel(pdfProbe.status)} — {pdfProbe.detail}
        </li>
        <li className={statusClass(imgPrep.status)}>
          사진 준비: {statusLabel(imgPrep.status)} — {imgPrep.detail}
        </li>
        <li className={statusClass(server.status)}>
          서버: {statusLabel(server.status)} — {server.detail}
        </li>
      </ul>

      {copyFallback ? (
        <textarea className="copy-box" readOnly value={copyFallback} onFocus={(e) => e.target.select()} />
      ) : null}
    </section>
  );
}
