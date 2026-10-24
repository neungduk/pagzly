/**
 * 회귀 — 449차 3 껍데기 생략. ① isBlankShell: 글·사진·아이콘이 없는 섹션·본문 없는 주의/스토리·사진 번호가 사진 수를 넘고 본문 없는 이미지-글 행은 껍데기, 히어로·갤러리·구매 접점·AI 고지·임팩트는 아님,
 * ② dropTitleOnlyItems: 제목만 남은 v4 항목은 둘 이상 남을 때만 생략, ③ 합성 21종 원본에는 껍데기가 없다(정상 입력 불변), ④ 퍼징 fz035(숫자 게이트가 지운 한 줄 행)가 export·라이브 표시에서 사라진다.
 */
import { dropTitleOnlyItems, isBlankShell } from "../../lib/display-sections";
import type { DetailSection } from "../../lib/types/generate";
import { corpus, exportArgsOf, readSession } from "../design-corpus";
import { fuzzCases } from "../fuzz-sessions";
import { applyDisplayRules } from "../../lib/display-sections";

export const name = "껍데기 생략 — 빈 섹션·제목만 행·제목만 항목 생략, 정상 입력 불변, 퍼징 fz035 해소";

const S = (o: unknown) => o as DetailSection;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) fails.push(m); };
  ok(isBlankShell(S({ type: "caution", heading: "A/S", body: "   " })), "본문 빈 주의사항은 껍데기");
  ok(!isBlankShell(S({ type: "caution", heading: "A/S", body: "내용" })), "본문 있는 주의사항은 아님");
  ok(isBlankShell(S({ type: "image_text", heading: "제목", body: "", imageIndex: 1, layout: "compact" }), 1), "사진이 모자란 본문 없는 행은 껍데기");
  ok(!isBlankShell(S({ type: "image_text", heading: "제목", body: "", imageIndex: 0, layout: "compact" }), 1), "사진이 있는 행은 아님");
  ok(!isBlankShell(S({ type: "hero", headline: "", subheadline: "" })), "히어로는 아님");
  ok(!isBlankShell(S({ type: "gallery", heading: "" })), "갤러리는 아님");
  ok(!isBlankShell(S({ type: "ai_disclosure", heading: "", body: "" })), "AI 고지는 아님(고지 불변)");
  ok(!isBlankShell(S({ type: "impact", kind: "v4" })), "임팩트는 자기 판정");
  ok(!isBlankShell(S({ type: "checklist" })), "필드가 없는 입력에서 예외 없이 껍데기 아님");

  const blk = (items: Array<{ title: string; body?: string }>) => S({ type: "impact", kind: "v4", v4: { family: "benefits", variant: "bento", no: 1, items } });
  const a = dropTitleOnlyItems(blk([{ title: "가", body: "나" }, { title: "다" }, { title: "라", body: "마" }])) as unknown as { v4: { items: unknown[] } };
  ok(a.v4.items.length === 2, "제목만 항목 생략");
  const b = blk([{ title: "가", body: "나" }, { title: "다" }]);
  ok(dropTitleOnlyItems(b) === b, "하나만 남으면 그대로");
  const sp = S({ type: "impact", kind: "v4", v4: { family: "spec", variant: "x", no: 1, items: [{ title: "a", body: "b" }, { title: "c" }, { title: "d", body: "e" }] } });
  ok(dropTitleOnlyItems(sp) === sp, "스펙 표는 건드리지 않음");

  for (const [id, f] of corpus().filter(([i]) => i.startsWith("fx-"))) {
    const a2 = exportArgsOf(readSession(f));
    const n = ((a2.sections ?? []) as DetailSection[]).filter((s, i) => i > 0 && isBlankShell(s, a2.imageUrls.length)).length;
    ok(n === 0, `${id}: 원본에 껍데기 ${n}개`);
  }
  const c = fuzzCases(200).find((x) => x.id.startsWith("fz035"))!;
  const a3 = exportArgsOf(c.session);
  const d = applyDisplayRules(a3.sections, a3.imageUrls, { category: a3.category, claimFacts: a3.claimFacts, brandName: a3.brandName } as never);
  ok(!JSON.stringify(d.sections).includes("미스트 안개"), "fz035의 제목만 행이 표시 계획에서 사라지지 않음");
  return fails;
}
