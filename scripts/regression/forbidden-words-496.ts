/**
 * 496 — 표시사항 화면/응답 금지어 정적 검색.
 * 면책 등 부정 문맥은 허용 목록.
 */
import fs from "node:fs";
import path from "node:path";

export const name = "표시사항 496 — 금지어 정적 검색";

const ROOTS = [
  "app/label-check",
  "components/label-check",
  "lib/label-check",
];

const FORBIDDEN = ["위반", "완벽", "보장", "합법", "승인"];

/** 허용(부정·면책·상태라벨) — 보고서 표와 동일 */
export const ALLOWED_CONTEXT_496: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /‘위반’이 아니라/, reason: "면책: 위반 단정 아님" },
  { pattern: /위반 가능/, reason: "상태 라벨 possible" },
  { pattern: /위반\s*여부/, reason: "면책·부정 문맥" },
  { pattern: /법적 판단이 아닙니다/, reason: "면책" },
  { pattern: /severity_if_missing/, reason: "규칙 필드명" },
  { pattern: /\"위반\"/, reason: "코드 문자열 매핑/검사" },
  { pattern: /'위반'/, reason: "코드 문자열 매핑/검사" },
  { pattern: /status === \("위반"/, reason: "회귀: 단정 status 금지 검사" },
  { pattern: /단정 위반/, reason: "회귀 메시지" },
  { pattern: /위반 가능 폭탄/, reason: "회귀/노트 용어" },
  { pattern: /mapSeverity[\s\S]{0,80}위반/, reason: "severity 매핑" },
  { pattern: /위반을 단정하지/, reason: "부정: 단정 금지 안내" },
  { pattern: /단정하지 않/, reason: "부정 문맥" },
];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|js|jsx|md|json)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function lineAllowed(line: string): boolean {
  return ALLOWED_CONTEXT_496.some((a) => a.pattern.test(line));
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const hits: string[] = [];

  for (const root of ROOTS) {
    const abs = path.join(process.cwd(), root);
    for (const file of walk(abs)) {
      const text = fs.readFileSync(file, "utf8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const word of FORBIDDEN) {
          if (!line.includes(word)) continue;
          if (lineAllowed(line)) continue;
          // sample-result / notes 등 데이터성
          if (/sample-result|cha-report|notes\.md|TASK_/.test(file)) continue;
          hits.push(`${path.relative(process.cwd(), file)}:${i + 1}: ${word} — ${line.trim().slice(0, 80)}`);
        }
      });
    }
  }

  // 소량 히트는 실패로(의도치 않은 단정)
  for (const h of hits) fails.push(`금지어 ${h}`);
  return fails;
}

const isMain = process.argv[1]?.includes("forbidden-words-496");
if (isMain) {
  run().then((f) => {
    console.log(f.length ? f.join("\n") : "forbidden-words OK");
    process.exit(f.length ? 1 : 0);
  });
}
