/**
 * 449차 1-3 — 사진 스트레스 말뭉치 확장. 합성 픽스처에서 안 타던 경로를 메모리에서 만든 변형으로 탄다:
 *  +whitebg  히어로 사진 태그를 "누끼·흰 배경"으로 → 히어로 B가 흰 배경 컷아웃(multiply) 경로(whiteBg)
 *  +noimg    사진 0장 → 히어로 E(타이포) 경로
 *  +person   히어로 사진 태그를 "모델·착용"으로 → 히어로 A 경로(글자가 사진 위)
 */
import fs from "node:fs";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { corpus, exportArgsOf, exportHtmlOf } from "./design-corpus";

export const VARIANT_IDS = ["fx-skincare-serum+whitebg", "fx-skincare-serum+noimg", "fx-tech-keyboard+person", "fx-food-snack+person"];

export function htmlFor(id: string): string {
  const [base, v] = id.split("+");
  const file = corpus({ only: [base!] })[0]![1];
  if (!v) return exportHtmlOf(file);
  const s = JSON.parse(fs.readFileSync(file, "utf8"));
  if (v !== "noimg" && !s.visionImageRoles?.length) s.visionImageRoles = [{ index: 0, role: "hero", confidence: 0.9, reason: "", tags: [] }];
  if (v === "whitebg") s.visionImageRoles[0].tags = ["단독", "누끼", "흰 배경"];
  else if (v === "person") s.visionImageRoles[0].tags = ["모델", "착용", "전신"];
  else if (v === "noimg") { s.imageUrls = []; if (s.generated) s.generated.imageUrls = []; s.imageOrigins = []; s.imageRoles = []; s.visionImageRoles = []; }
  return buildDetailPageHtml(exportArgsOf(s));
}
