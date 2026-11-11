"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { LabelCheckInput, LabelMarket } from "@/lib/label-check/types";
import { DISCLAIMER_PRINT_485 } from "@/lib/label-check/types";
import { PRODUCT_TYPE_OPTIONS_504 } from "@/lib/label-check/product-type-options-504";
import { CTA_LABEL_507, PROGRESS_READ_507, PROGRESS_RULES_507 } from "@/lib/label-check/ui-status-507";
import { CTA_OCR_508 } from "@/lib/label-check/ocr/constants";
import type { UploadCard507Props } from "@/components/label-check/ui-507/UploadCard";

const CHIP_LIMIT = 6;

type ProductChip = { id: string; label: string; kind: "toggle" | "rinse_off" | "rinse_on" | "functional" };

function formatSize(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)}MB`;
  return `${(n / 1024).toFixed(1)}KB`;
}

export type CheckStart517Props = UploadCard507Props & {
  /**
   * 518 — 읽은 글자 확인(OcrReview517). 있으면 무대(왼쪽 큰 패널)에 이 내용을 보여 주고,
   * 오른쪽 설정 패널의 점검 버튼은 숨겨 버튼이 둘로 보이지 않게 한다.
   */
  reviewSlot?: ReactNode;
  /** 522 — 토스 등 터치 UI. 참일 때만 드롭존 문구 3개 변경. 기본(미전달)은 웹과 동일 */
  touch?: boolean;
  /** 522 — 있으면 파일 input accept를 이 값으로(미전달 시 기존 계산) */
  accept?: string;
  /** 523 — 초기 탭. 미전달 시 file(웹과 동일) */
  initialTab?: "file" | "text";
  /**
   * 523 — 참이면 준비 전(파일·문구 없음) 하단 고정 CTA 막대를 그리지 않음.
   * 미전달/거짓은 웹과 동일(회색 막대 항상 표시).
   */
  deferMobileCta?: boolean;
};

/** 517 — 점검 시작 화면(UploadCard507 대체 연결). props·전송 값은 기존과 동일. */
export function CheckStart517(props: CheckStart517Props) {
  const reviewing = Boolean(props.reviewSlot);
  const {
    market,
    onMarket,
    file,
    onFile,
    pasteText,
    onPasteText,
    textScope,
    onTextScope,
    input,
    onInputPatch,
    busy,
    progress,
    onSubmit,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"file" | "text">(props.initialTab ?? "file");
  useEffect(() => {
    if (props.initialTab) setTab(props.initialTab);
  }, [props.initialTab]);
  const [drag, setDrag] = useState(false);
  const [more, setMore] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewFailed, setPdfPreviewFailed] = useState(false);

  const pick = useCallback(() => inputRef.current?.click(), []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPdfPreviewFailed(false);
      return;
    }
    const isImg = /^image\//i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (isImg) {
      const url = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    // PDF 1페이지 미리보기: pdfjs 동적 시도(불가 시 아이콘 카드)
    let cancelled = false;
    (async () => {
      try {
        const { extractLabelPdfInBrowser } = await import("@/lib/label-check/client-extract-pdf");
        // 추출만으로는 캔버스 미리보기가 없을 수 있음 → 문서 카드 대체
        void extractLabelPdfInBrowser;
        if (!cancelled) setPdfPreviewFailed(true);
      } catch {
        if (!cancelled) setPdfPreviewFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files?.[0] ?? null;
      if (f) {
        onFile(f);
        setTab("file");
      }
    },
    [onFile],
  );

  const onKeyDrop = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    },
    [pick],
  );

  const canSubmit = Boolean(file) || Boolean(pasteText.trim());
  const ctaLabel = busy
    ? progress?.includes("글자") || progress?.includes("읽는")
      ? PROGRESS_READ_507
      : PROGRESS_RULES_507
    : canSubmit
      ? CTA_LABEL_507
      : "파일을 올리면 시작할 수 있어요";

  const chips: ProductChip[] = useMemo(() => {
    if (market === "KR") {
      const base: ProductChip[] = [
        { id: "rinse_on", label: "안 씻어내는 제품", kind: "rinse_on" },
        { id: "rinse_off", label: "씻어내는 제품", kind: "rinse_off" },
        { id: "functional", label: "기능성화장품", kind: "functional" },
        ...PRODUCT_TYPE_OPTIONS_504.filter((o) =>
          ["color_makeup", "set_product", "export_only", "aerosol", "scrub", "pack", "shampoo", "vulva", "softener", "deodorant", "spray_sunscreen", "soap"].includes(
            o.id,
          ),
        ).map((o) => ({ id: o.id, label: o.label, kind: "toggle" as const })),
      ];
      return base;
    }
    return [
      { id: "imported", label: "수입품", kind: "toggle" },
      { id: "professionalUse", label: "전문가용", kind: "toggle" },
      { id: "hazardous", label: "에어로졸/위험 제품", kind: "toggle" },
      { id: "otcDrugLike", label: "OTC 의약품 성격", kind: "toggle" },
    ];
  }, [market]);

  const visibleChips = more ? chips : chips.slice(0, CHIP_LIMIT);

  const chipPressed = (c: ProductChip): boolean => {
    if (c.kind === "rinse_off") return Boolean(input.rinseOff);
    if (c.kind === "rinse_on") return !input.rinseOff;
    if (c.kind === "functional") return Boolean(input.functional);
    if (market === "US") {
      if (c.id === "imported") return Boolean(input.imported);
      if (c.id === "professionalUse") return Boolean(input.professionalUse);
      if (c.id === "hazardous") return Boolean(input.hazardous);
      if (c.id === "otcDrugLike") return Boolean(input.otcDrugLike);
    }
    return (input.productTypes || []).includes(c.id);
  };

  const toggleChip = (c: ProductChip) => {
    if (c.kind === "rinse_off") {
      onInputPatch({ rinseOff: true });
      return;
    }
    if (c.kind === "rinse_on") {
      onInputPatch({ rinseOff: false });
      return;
    }
    if (c.kind === "functional") {
      onInputPatch({ functional: !input.functional });
      return;
    }
    if (market === "US") {
      if (c.id === "imported") onInputPatch({ imported: !input.imported });
      else if (c.id === "professionalUse") onInputPatch({ professionalUse: !input.professionalUse });
      else if (c.id === "hazardous") onInputPatch({ hazardous: !input.hazardous });
      else if (c.id === "otcDrugLike") onInputPatch({ otcDrugLike: !input.otcDrugLike });
      return;
    }
    const prev = input.productTypes || [];
    const on = prev.includes(c.id);
    onInputPatch({
      productTypes: on ? prev.filter((x) => x !== c.id) : [...prev, c.id],
    });
  };

  const settingsPanel = (
    <div className="lc517-panel">
      <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}>점검 설정</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4A4D54" }}>판매 국가</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            className="lc517-market"
            aria-pressed={market === "KR"}
            onClick={() => onMarket("KR")}
          >
            한국에서 판매
          </button>
          <button
            type="button"
            className="lc517-market"
            aria-pressed={market === "US"}
            onClick={() => onMarket("US")}
          >
            미국에서 판매
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4A4D54" }}>해당하는 제품 (선택)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {visibleChips.map((c) => (
            <button
              key={c.id}
              type="button"
              className="lc517-chip-opt"
              aria-pressed={chipPressed(c)}
              onClick={() => toggleChip(c)}
            >
              {c.label}
            </button>
          ))}
          {chips.length > CHIP_LIMIT ? (
            <button
              type="button"
              className="lc517-chip-opt"
              onClick={() => setMore((v) => !v)}
            >
              {more ? "접기" : "더 보기"}
            </button>
          ) : null}
        </div>
        <span style={{ fontSize: 12.5, color: "#8A8D94", lineHeight: 1.6 }}>
          고르면 해당하지 않는 항목을 빼서 결과가 더 짧아져요.
        </span>
      </div>
      {props.showProductName ? (
        <label style={{ fontSize: 13, fontWeight: 700, color: "#4A4D54", display: "flex", flexDirection: "column", gap: 6 }}>
          제품명(선택)
          <input
            value={props.productName || ""}
            onChange={(e) => props.onProductName?.(e.target.value)}
            maxLength={80}
            style={{
              minHeight: 44,
              borderRadius: 12,
              border: "1px solid #D5DAE6",
              padding: "0 12px",
              fontSize: 14,
            }}
          />
        </label>
      ) : null}
      {!reviewing && props.ocrAvailable && props.onStartOcr && file ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {props.ocrTransferNotice ? (
            <p style={{ margin: 0, fontSize: 13, color: "#6A6D74" }}>{props.ocrTransferNotice}</p>
          ) : null}
          <button
            type="button"
            className="lc517-chip-opt"
            style={{ width: "100%", minHeight: 44 }}
            disabled={busy}
            onClick={props.onStartOcr}
          >
            {CTA_OCR_508}
          </button>
        </div>
      ) : null}
      {props.ocrHint ? <p style={{ margin: 0, fontSize: 13, color: "#6A6D74" }}>{props.ocrHint}</p> : null}
      {reviewing ? (
        <p className="lc517-legal" style={{ margin: 0, fontSize: 13, color: "#6a6d74", lineHeight: 1.6 }}>
          왼쪽에서 읽은 글자를 확인한 뒤 &quot;이 글자로 점검&quot;을 눌러 주세요.
        </p>
      ) : (
        <button
          type="button"
          className={`lc517-go${canSubmit && !busy ? " ready" : ""}`}
          disabled={busy || !canSubmit}
          aria-disabled={busy || !canSubmit}
          onClick={onSubmit}
        >
          {ctaLabel}
        </button>
      )}
      <span className="lc517-legal" style={{ fontSize: 12.5, color: "#8A8D94", textAlign: "center" }}>
        {DISCLAIMER_PRINT_485}
      </span>
    </div>
  );

  return (
    <div className="lc517-grid">
      <section className="lc517-stage-card" {...(props.touch ? { "data-tab": tab } : null)}>
        {reviewing ? props.reviewSlot : null}
        {reviewing ? null : (
        <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid #EDEFF5",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="lc517-seg" role="tablist" aria-label="입력 방식">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "file"}
              onClick={() => setTab("file")}
            >
              파일 올리기
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "text"}
              onClick={() => setTab("text")}
            >
              문구 붙여넣기
            </button>
          </div>
          <span
            className={props.touch ? "lc517-mono lc517-size-hint" : "lc517-mono"}
            style={{ fontSize: 12, color: "#8A8D94" }}
          >
            PDF 100MB · 사진 10MB
          </span>
        </div>

        {tab === "file" && !file ? (
          <div
            className={`lc517-drop${drag ? " drag" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={
              props.touch ? "라벨 사진이나 PDF를 골라 주세요" : "라벨 PDF나 사진을 여기에 놓으세요"
            }
            onClick={pick}
            onKeyDown={onKeyDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
          >
            <div className="lc517-doc" aria-hidden>
              <div style={{ height: 8, width: "60%", background: "#111214", borderRadius: 3, marginBottom: 8 }} />
              <div style={{ height: 5, width: "90%", background: "#E3E6EE", borderRadius: 3, marginBottom: 5 }} />
              <div style={{ height: 5, width: "80%", background: "#E3E6EE", borderRadius: 3, marginBottom: 5 }} />
              <div style={{ height: 5, width: "86%", background: "#FFD9D2", borderRadius: 3, marginBottom: 12 }} />
              <div style={{ height: 5, width: "92%", background: "#E3E6EE", borderRadius: 3, marginBottom: 5 }} />
              <div style={{ height: 5, width: "70%", background: "#E3E6EE", borderRadius: 3, marginBottom: 5 }} />
              <div style={{ height: 5, width: "78%", background: "#FFF1CC", borderRadius: 3, marginBottom: 5 }} />
              <div style={{ height: 5, width: "88%", background: "#E3E6EE", borderRadius: 3 }} />
              <div className="lc517-scan" />
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {props.touch ? "라벨 사진이나 PDF를 골라 주세요" : "라벨 PDF나 사진을 여기에 놓으세요"}
            </div>
            <div style={{ fontSize: 14, color: "#6A6D74", lineHeight: 1.7 }}>
              {props.touch ? "여기를 눌러 파일을 골라요" : "눌러서 파일 고르기"}
              {props.touch ? null : (
                <>
                  <br />
                  파일은 점검 후 저장하지 않습니다
                </>
              )}
            </div>
            <span className="lc517-mono" style={{ fontSize: 11, color: "#8A8D94" }}>
              JPG · PNG · WEBP · PDF
            </span>
          </div>
        ) : null}

        {tab === "file" && file ? (
          <div className="lc517-preview">
            <div className="lc517-preview-card">
              <div className="lc517-scan" aria-hidden />
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" />
              ) : (
                <div style={{ padding: "20px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>PDF 문서</div>
                  <div style={{ fontSize: 13, color: "#6A6D74", lineHeight: 1.6 }}>
                    {pdfPreviewFailed
                      ? "미리보기 대신 파일 정보로 준비됐어요"
                      : "미리보기를 준비하는 중…"}
                  </div>
                </div>
              )}
            </div>
            <div
              className="lc517-pop"
              style={{
                position: "absolute",
                left: 24,
                top: 22,
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#fff",
                border: "1px solid #E3E6EE",
                borderRadius: 12,
                padding: "9px 14px",
                boxShadow: "0 10px 24px rgba(40,60,140,.12)",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 4, background: "#1F7A56" }} aria-hidden />
              <span className="lc517-mono" style={{ fontSize: 12 }}>
                {file.name} · {formatSize(file.size)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onFile(null)}
              style={{
                position: "absolute",
                right: 22,
                top: 22,
                minHeight: 36,
                padding: "0 14px",
                borderRadius: 999,
                border: "1.5px solid #D5DAE6",
                background: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              다시 고르기
            </button>
            <div
              className="lc517-pop"
              style={{
                position: "absolute",
                left: "50%",
                bottom: 22,
                transform: "translateX(-50%)",
                fontSize: 13.5,
                fontWeight: 700,
                background: "#fff",
                borderRadius: 999,
                padding: "10px 18px",
                boxShadow: "0 10px 24px rgba(40,60,140,.12)",
                whiteSpace: "nowrap",
              }}
            >
              {props.touch
                ? "준비 완료 · 아래 점검하기를 눌러요"
                : "준비 완료 · 오른쪽에서 점검하기를 누르세요"}
            </div>
          </div>
        ) : null}

        {tab === "text" ? (
          <div style={{ margin: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <textarea
              ref={props.pasteTextareaRef as RefObject<HTMLTextAreaElement>}
              rows={16}
              placeholder="상세페이지나 라벨의 문구를 붙여 넣으세요"
              value={pasteText}
              onChange={(e) => onPasteText(e.target.value)}
              disabled={Boolean(file)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                minHeight: 360,
                border: "1px solid #D5DAE6",
                borderRadius: 14,
                padding: 18,
                fontSize: 15,
                lineHeight: 1.8,
                resize: "vertical",
                background: "#FAFBFE",
              }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="lc517-chip-opt"
                aria-pressed={textScope === "ad_only"}
                onClick={() => onTextScope("ad_only")}
              >
                광고 문구만
              </button>
              <button
                type="button"
                className="lc517-chip-opt"
                aria-pressed={textScope === "full"}
                onClick={() => onTextScope("full")}
              >
                라벨 전체 문구
              </button>
              <span className="lc517-mono" style={{ marginLeft: "auto", fontSize: 13, color: "#6A6D74" }}>
                {pasteText.length}자
              </span>
            </div>
            {props.bothInputsHint ? (
              <p style={{ margin: 0, fontSize: 13, color: "#6A6D74" }}>
                PDF와 문구가 모두 있으면 PDF를 먼저 점검합니다.
              </p>
            ) : null}
          </div>
        ) : null}
        </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={
            props.accept ||
            (props.acceptImages
              ? "application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              : "application/pdf,.pdf")
          }
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            onFile(e.target.files?.[0] ?? null);
            setTab("file");
          }}
        />
      </section>

      <aside
        className="lc517-aside"
        role={props.touch ? "dialog" : undefined}
        aria-modal={props.touch ? true : undefined}
        aria-label={props.touch ? "점검 설정" : undefined}
      >
        {props.touch ? <div className="lc517-sheet-handle" aria-hidden /> : null}
        {settingsPanel}
      </aside>

      {reviewing || (props.deferMobileCta && !canSubmit) ? null : (
        <div className={`lc517-mobile-bar${props.deferMobileCta ? " lc517-mobile-bar--ready" : ""}`}>
          <button
            type="button"
            className={`lc517-go${canSubmit && !busy ? " ready" : ""}`}
            disabled={busy || !canSubmit}
            aria-disabled={busy || !canSubmit}
            onClick={onSubmit}
          >
            {ctaLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export type { LabelMarket, LabelCheckInput };
