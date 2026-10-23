/**
 * 회귀 — 441차 1-2 이전 정보 섹션 v4: 전부 안내 문구인 스펙 블록은 압축 안내 카드 한 장(입력 문구 원문, 반복 카드 없음),
 * 일부만 안내 문구면 카드/표 그대로, 주의 박스는 v4에서 15px·500·얇은 띠, 표 줄무늬. 호출 0.
 */
import { impactHtml } from "../../lib/impact-templates";
import type { ImpactSection } from "../../lib/types/generate";

export const name = "정보 섹션 v4 — 배송 안내 압축 카드·부분 안내 유지·주의 박스 가벼움·표 줄무늬";

const pal = { face: "#F4F1EA", accent: "#3D97C6", deep: "#1C4A66", ink: "#1B1B18", warm: "#F7F3EE", paper: "#FAF8F3" } as unknown as Parameters<typeof impactHtml>[1];
const spec = (variant: string, rows: Array<[string, string]>): ImpactSection =>
  ({ type: "impact", slot: "impact", kind: "v4", text: "배송 안내", v4: { family: "spec", variant, no: 1, face: "bgA", items: rows.map(([title, body]) => ({ title, body })) } }) as unknown as ImpactSection;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const allPending = impactHtml(spec("grid", [["배송비", "판매자 정책을 확인해주세요"], ["배송기간", "판매자 정책을 확인해주세요"], ["교환", "판매자 정책을 확인해주세요"]]), pal, "a");
  if (!/data-pz-icon="info"/.test(allPending)) fails.push("전부 안내 문구인데 압축 카드(info 아이콘) 없음");
  if ((allPending.match(/판매자 정책을 확인해주세요/g) ?? []).length !== 1) fails.push("같은 안내 문구가 한 번만 나오지 않음");
  if (!/배송비 · 배송기간 · 교환/.test(allPending.replace(/<[^>]+>/g, ""))) fails.push("라벨 묶음 줄 없음");
  const mixed = impactHtml(spec("grid", [["배송비", "3,000원"], ["배송기간", "판매자 정책을 확인해주세요"]]), pal, "a");
  if (/data-pz-icon="info"/.test(mixed)) fails.push("일부만 안내 문구인데 압축 카드로 바꿈");
  const line = impactHtml(spec("line", [["소재", "면 100%"], ["색상", "화이트"], ["핏", "세미오버"]]), pal, "a");
  if (!/padding:14px 10px;border-bottom:1px solid [^"]*;background:rgba/.test(line)) fails.push("표 줄무늬 면 없음");
  const note = impactHtml({ type: "impact", slot: "impact", kind: "note", text: "이런 점은 참고하세요", labels: ["딱 맞는 핏을 원하시면 한 사이즈 다운을 고려해 보세요"] } as unknown as ImpactSection, pal, "a");
  if (!/font-size:15px;font-weight:500/.test(note) || !/border-left:3px solid/.test(note)) fails.push("주의 박스 v4 가벼운 글·얇은 띠 아님");
  return fails;
}
