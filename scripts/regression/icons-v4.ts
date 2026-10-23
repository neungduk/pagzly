/**
 * 회귀 — 440차 3 v4 아이콘 시스템: 60~80종, 경로 문법 유효(SVG path d 명령·숫자만, 24 격자 안), 매핑 결정성·폴백(근거 없으면 null),
 * 같은 아이콘 반복 피함, 이전 차수 아이콘 경로 재사용(같은 뜻 같은 그림), 듀오톤 틴트는 선 아래. 호출 0.
 */
import { V4_ICON_IDS, V4_ICON_PATHS, iconCandidatesV4, iconV4Svg, pickIconsV4 } from "../../lib/icons";
import { SUMMARY_ICON_PATHS } from "../../lib/summary-line-icons";

export const name = "v4 아이콘 — 60~80종·경로 유효·24 격자·매핑 결정성·폴백 null·반복 회피·기존 경로 재사용";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  if (V4_ICON_IDS.length < 60 || V4_ICON_IDS.length > 80) fails.push(`아이콘 수 ${V4_ICON_IDS.length}(60~80 밖)`);
  for (const id of V4_ICON_IDS) {
    const body = V4_ICON_PATHS[id];
    for (const m of body.matchAll(/<(\w+)\b([^>]*)\/>/g)) {
      const [, tag, attrs] = m;
      if (!["path", "circle", "rect"].includes(tag!)) fails.push(`${id}: 허용 밖 요소 ${tag}`);
      if (/fill="(?!none)|style=|href|url\(/.test(attrs!)) fails.push(`${id}: 채움·외부 참조`);
      const d = /\sd="([^"]*)"/.exec(attrs!)?.[1];
      if (tag === "path") {
        if (!d || !/^[Mm]/.test(d.trim()) || /[^MmLlHhVvCcSsQqTtAaZz0-9.,\s-]/.test(d)) fails.push(`${id}: path d 문법`);
        // 절대 좌표 명령(M·L·C 대문자) 숫자는 24 격자 안
        for (const seg of d?.matchAll(/([MLC])([^MmLlHhVvCcSsQqTtAaZz]*)/g) ?? []) for (const n of seg[2]!.match(/-?\d*\.?\d+/g) ?? []) if (Number(n) < 0 || Number(n) > 24) fails.push(`${id}: 좌표 ${n} 격자 밖`);
      }
      for (const [k, v] of attrs!.matchAll(/\b(cx|cy|x|y)="([^"]*)"/g)) if (Number(v) < 0 || Number(v) > 24) fails.push(`${id}: ${k}=${v} 격자 밖`);
    }
    if ((body.match(/</g) ?? []).length !== (body.match(/\/>/g) ?? []).length) fails.push(`${id}: 닫히지 않은 요소`);
  }
  for (const [id, d] of Object.entries(SUMMARY_ICON_PATHS)) if (V4_ICON_PATHS[id as keyof typeof V4_ICON_PATHS] !== d) fails.push(`기존 ${id} 경로가 바뀜`);
  // 매핑
  const eq = (label: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };
  eq("배터리", iconCandidatesV4("배터리 30시간")[0], "battery");
  eq("블루투스", iconCandidatesV4("블루투스 5.3")[0], "bluetooth");
  eq("세탁", iconCandidatesV4("손세탁 권장")[0], "wash");
  eq("보습(기존 규칙)", iconCandidatesV4("하루 종일 촉촉한 보습")[0], "droplet");
  eq("근거 없음", iconCandidatesV4("오늘의 기분"), []);
  eq("한 항목이라도 근거 없으면 null", pickIconsV4([{ title: "배터리 30시간" }, { title: "그냥 좋아요" }]), null);
  const a = pickIconsV4([{ title: "보습 크림" }, { title: "촉촉한 보습" }, { title: "블루투스" }]);
  eq("결정성", a, pickIconsV4([{ title: "보습 크림" }, { title: "촉촉한 보습" }, { title: "블루투스" }]));
  if (a && a[0] === a[1]) fails.push(`반복 회피 실패 ${a}`);
  // 441차 1-7 — 뜻 어긋남 사례
  eq("톤온톤 → 팔레트", iconCandidatesV4("톤온톤 화이트")[0], "palette");
  eq("본문 수치로 크기 아이콘 금지", pickIconsV4([{ title: "남녀 공용", body: "여성 모델 168cm는 M을" }]), null);
  eq("제목 수치는 크기 아이콘", pickIconsV4([{ title: "사이즈 S~XL" }]), ["size"]);
  const svg = iconV4Svg("battery", { color: "#1B1B18", px: 40, tint: "#EADFF2" });
  if (svg.indexOf('fill="#EADFF2"') > svg.indexOf("<rect")) fails.push("듀오톤 틴트가 선 위에 그려짐");
  if (!/stroke-width="2"/.test(svg)) fails.push("v4 선 굵기 2 아님");
  return fails;
}
