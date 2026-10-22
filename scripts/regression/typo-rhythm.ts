/**
 * 회귀 — 438차 1-5 제목 줄 끝 고아: 마지막 1~2자 어절을 앞 어절과 줄바꿈 없는 묶음으로(문구 불변), 본문·작은 글·태그 섞인 글은 그대로, 끄면 불변. 호출 0.
 */
import { bindTail, polishTitles } from "../../lib/typo-rhythm";

export const name = "타이포 리듬 — 제목 끝 짧은 어절 묶기·문구 불변·본문 제외·off 불변";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  eq("1자 끝 어절 묶기", bindTail("초코 견과 단백질 바"), `초코 견과 <span style="white-space:nowrap">단백질 바</span>`);
  eq("2자 끝 어절 묶기", bindTail("15cm 거리, 촉촉함 한 겹"), `15cm 거리, 촉촉함 <span style="white-space:nowrap">한 겹</span>`);
  eq("끝 어절이 3자 이상이면 그대로", bindTail("와이드 데님 청바지"), "와이드 데님 청바지");
  eq("두 어절뿐이면 그대로", bindTail("단백질 바"), "단백질 바");
  eq("묶음이 너무 길면 그대로", bindTail("가 아주아주아주아주아주긴단어 바"), "가 아주아주아주아주아주긴단어 바");
  const strip = (h: string) => h.replace(/<[^>]+>/g, "");
  const title = `<h1 style="font-size:40px">초코 견과 단백질 바</h1>`;
  eq("문구 불변", strip(polishTitles(title, true)), "초코 견과 단백질 바");
  if (!polishTitles(title, true).includes("nowrap")) fails.push("h1 제목에 적용 안 됨");
  const body = `<p style="margin:0;font-size:15px;font-weight:500;line-height:1.6">본문 문장 끝 바</p>`;
  eq("본문은 그대로", polishTitles(body, true), body);
  const bold = `<p style="margin:0;font-size:24px;font-weight:800;line-height:1.3">이런 분께 잘 맞아 요</p>`;
  if (!polishTitles(bold, true).includes("nowrap")) fails.push("굵은 제목 p에 적용 안 됨");
  const marked = `<p style="margin:0;font-size:26px;font-weight:800">수분을 <span>들고</span> 다니는 이 유</p>`;
  eq("태그 섞인 글은 그대로", polishTitles(marked, true), marked);
  eq("off는 불변", polishTitles(title, false), title);
  return fails;
}
