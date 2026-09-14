import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const dir = path.join(ROOT, "review", "169cha-export-captures");
const ids = ["cosmetics-noreview", "fashion", "food", "living", "electronics"];

let failed = false;
for (const id of ids) {
  const html = fs.readFileSync(path.join(dir, `${id}.html`), "utf8");
  // style="..." 안에 인코딩되지 않은 xmlns=" 가 있으면 속성 깨짐
  const brokenStyles = [...html.matchAll(/\sstyle="([^"]*)"/gi)].filter((m) =>
    /xmlns=/i.test(m[1] ?? ""),
  );
  // body 텍스트로 새어 나온 전형적인 깨짐 패턴 (닫히지 않은 style 뒤)
  const textLeak = /linear-gradient\([^)]+\)\s*;?\s*background-repeat/.test(
    html.replace(/style="[^"]*"/gi, ""),
  );
  const encodedOk = html.includes("%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22");
  const ok = brokenStyles.length === 0 && !textLeak;
  console.log(
    JSON.stringify({
      id,
      ok,
      brokenStyles: brokenStyles.length,
      textLeak,
      encodedPatternPresent: encodedOk,
    }),
  );
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log("[170] export HTML style escape OK");
