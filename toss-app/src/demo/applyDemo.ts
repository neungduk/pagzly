import type { Dispatch, SetStateAction } from "react";
import type { LabelCheckResult } from "@/lib/label-check/types";
import type { DemoName } from "./fixtures";
import {
  DEMO_NAMES,
  DEMO_OCR_LINES,
  DEMO_OCR_TEXT,
  DEMO_PASTE_TEXT,
  demoCleanResult,
  demoManyResult,
  demoSampleResult,
  demoUnreadableResult,
  makeDemoLabelFile,
} from "./fixtures";

export type DemoSetters = {
  setFile: Dispatch<SetStateAction<File | null>>;
  setPasteText: Dispatch<SetStateAction<string>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setProgress: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setResult: Dispatch<SetStateAction<LabelCheckResult | null>>;
  setIsSample: Dispatch<SetStateAction<boolean>>;
  setSourceText: Dispatch<SetStateAction<string | null>>;
  setCheckedOn: Dispatch<SetStateAction<string | null>>;
  setOcrLimitMsg: Dispatch<SetStateAction<string | null>>;
  setOcrReview: Dispatch<
    SetStateAction<{
      text: string;
      corrections: string[];
      avgConfidence: number;
      readStatus?: "ok" | "partial" | "unreadable";
      lines?: Array<{ text: string; lowConfidence?: boolean }>;
      notices?: string[];
      qualityLabel?: string;
      detailPageHint?: string | null;
      blockForLowQuality?: boolean;
    } | null>
  >;
  setOcrQualityLabel: Dispatch<SetStateAction<string | null>>;
  setForceOpenFirst?: Dispatch<SetStateAction<boolean>>;
  setTextTab?: Dispatch<SetStateAction<boolean>>;
};

export function isDemoName(s: string): s is DemoName {
  return (DEMO_NAMES as readonly string[]).includes(s);
}

export async function applyDemo(name: DemoName, s: DemoSetters): Promise<void> {
  // reset
  s.setFile(null);
  s.setPasteText("");
  s.setBusy(false);
  s.setProgress(null);
  s.setError(null);
  s.setResult(null);
  s.setIsSample(false);
  s.setSourceText(null);
  s.setOcrLimitMsg(null);
  s.setOcrReview(null);
  s.setOcrQualityLabel(null);
  s.setForceOpenFirst?.(false);
  s.setTextTab?.(false);

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  switch (name) {
    case "start":
      break;
    case "picked": {
      const f = await makeDemoLabelFile();
      s.setFile(f);
      break;
    }
    case "text":
      s.setPasteText(DEMO_PASTE_TEXT);
      s.setTextTab?.(true);
      break;
    case "busy":
      s.setBusy(true);
      s.setProgress("글자를 읽는 중");
      break;
    case "ocr":
      s.setOcrReview({
        text: DEMO_OCR_TEXT,
        corrections: [],
        avgConfidence: 0.72,
        lines: DEMO_OCR_LINES,
        notices: ["일부 줄은 흐릿하게 읽혔어요"],
        qualityLabel: "보통",
        detailPageHint: null,
      });
      s.setOcrQualityLabel("보통");
      break;
    case "result":
    case "result-open": {
      const r = demoSampleResult();
      s.setResult(r);
      s.setIsSample(true);
      s.setSourceText(
        "피부 주름을 완전히 없애 주는 앰플. 비타민C 함유로 피부 재생을 돕고 칙칙함을 개선합니다.",
      );
      s.setCheckedOn(today());
      if (name === "result-open") s.setForceOpenFirst?.(true);
      break;
    }
    case "result-clean":
      s.setResult(demoCleanResult());
      s.setIsSample(true);
      s.setSourceText("수분 토너. 정제수, 글리세린.");
      s.setCheckedOn(today());
      break;
    case "result-many":
      s.setResult(demoManyResult());
      s.setIsSample(true);
      s.setSourceText("긴 예시 라벨 문구입니다. ".repeat(8));
      s.setCheckedOn(today());
      break;
    case "unreadable":
      s.setResult(demoUnreadableResult());
      s.setCheckedOn(today());
      break;
    case "error":
      s.setError("연결이 잠시 끊겼어요");
      break;
    case "limit":
      s.setOcrLimitMsg("오늘 사진 읽기는 여기까지예요. 문구를 붙여넣어 점검할 수 있어요.");
      break;
    case "heic":
      s.setError("HEIC는 이번 버전에서 지원하지 않아요. JPG·PNG·WEBP로 보내 주세요.");
      break;
    default:
      break;
  }
}
