/**
 * 회귀 — 412차 프롬프트 반복 방지 한 줄. 406차 규칙 5줄은 그대로고 한 줄만 더해졌는지, 규칙 블록 길이가 늘어난 폭이 작은지. 유료 호출 0.
 * 효과(실제 모델 출력의 반복 감소)는 생성이 필요해 413차 유료 검증 채점 6번에서 확인한다.
 */
import fs from "node:fs";
import path from "node:path";

export const name = "프롬프트: 입력 사실 규칙 5줄 유지 + 반복 방지 한 줄(412) + 415차 사실 규칙 6줄 추가";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "app", "api", "generate", "route.ts"), "utf8");
  const start = src.indexOf("## 입력 사실 그대로 쓰기 (필수)");
  const end = src.indexOf("## 소재·스펙·성분 사실 제약 (필수)");
  if (start < 0 || end < start) return ["규칙 블록 위치를 못 찾음"];
  const block = src.slice(start, end);
  const lines = block.split("\n").filter((l) => l.startsWith("- "));
  if (lines.length !== 12) fails.push(`규칙 줄 수가 12가 아님(${lines.length})`); // 406차 5줄 + 412차 1줄 + 415차 6줄
  for (const k of ["모든** 사이즈", "판매자 확인 필요", "오프화이트", "일반화·단정", "글자 그대로 반복"]) {
    if (!block.includes(k)) fails.push(`기존 규칙 문구가 사라짐: ${k}`);
  }
  if (!block.includes("같은 핵심 표현") || !block.includes("착용감·관리·상황")) fails.push("반복 방지 한 줄이 없음");
  for (const k of ["입력에 없는 숫자(시간·횟수·개수)", "부속의 개수", "성능은 입력에 있을 때만", "계절·용도 표기를 그대로", "✓/–로만 표시", "같은 모티프 단어"]) {
    if (!block.includes(k)) fails.push(`415차 규칙이 없음: ${k}`);
  }
  if (block.length > 2400) fails.push(`규칙 블록이 너무 김(${block.length}자, 상한 2400)`);
  return fails;
}
