/**
 * 483 — 테스트용 텍스트 PDF 3종(가상 브랜드).
 * 표준 콘텐츠 스트림(ASCII 요약) + UTF-8 본문을 PDF 주석 마커로 동봉.
 * 추출기는 pdf-parse 후 마커 본문을 병합한다(한글 폰트 임베드 없이 안정 추출).
 */
import fs from "node:fs";
import path from "node:path";

const BEGIN = "%LABELCHECK_TEXT_BEGIN%";
const END = "%LABELCHECK_TEXT_END%";

function buildSimplePdf(lines) {
  const asciiPreview = lines
    .map((l, i) => `BT /F1 10 Tf 40 ${720 - i * 14} Td (${l.replace(/[^\x20-\x7E]/g, "?").slice(0, 80)}) Tj ET`)
    .join("\n");
  const streamBody = Buffer.from(asciiPreview + "\n", "utf8");

  const objs = [];
  const enc = (n, body) => {
    objs[n] = Buffer.concat([
      Buffer.from(`${n} 0 obj\n`, "utf8"),
      body,
      Buffer.from("\nendobj\n", "utf8"),
    ]);
  };

  enc(1, Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "utf8"));
  enc(2, Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "utf8"));
  enc(
    3,
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      "utf8",
    ),
  );
  enc(
    4,
    Buffer.concat([
      Buffer.from(`<< /Length ${streamBody.length} >>\nstream\n`, "utf8"),
      streamBody,
      Buffer.from("endstream", "utf8"),
    ]),
  );
  enc(5, Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "utf8"));

  const parts = [Buffer.from("%PDF-1.4\n", "utf8")];
  const offsets = [0];
  for (let n = 1; n <= 5; n++) {
    offsets[n] = parts.reduce((a, b) => a + b.length, 0);
    parts.push(objs[n]);
  }
  const xrefStart = parts.reduce((a, b) => a + b.length, 0);
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let n = 1; n <= 5; n++) {
    xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  parts.push(Buffer.from(xref, "utf8"));

  const payload =
    `\n${BEGIN}\n` + lines.join("\n") + `\n${END}\n`;
  parts.push(Buffer.from(payload, "utf8"));
  return Buffer.concat(parts);
}

const outDir = path.join("review", "data", "samples");
fs.mkdirSync(outDir, { recursive: true });

const samples = {
  "sample_A_moari_toner.pdf": [
    "제품명: 모아리 수분 토너 (가상)",
    "책임판매업자: (주)모아리랩 / 주소: 서울특별시 강남구 테헤란로 1",
    "내용량: 150 mL",
    "제조국: 대한민국",
    "제조번호: LOT-A-2026-001",
    "전성분: 정제수, 글리세린, 나이아신아마이드, 향료, 리모넨, 리날룰",
    "주의사항: 이상 반응 시 사용을 중지하세요.",
    "광고 문구: 피부 재생과 잡티 완전 제거를 도와줍니다.",
  ],
  "sample_B_rovan_sun.pdf": [
    "제품명: 로반 선 에센스 (가상)",
    "책임판매업자: 로반코스메틱 / 주소: 부산광역시 해운대구 센텀중앙로 10",
    "내용량: 50 mL",
    "사용기한: 2027.12.31",
    "제조국: 대한민국",
    "전성분: 정제수, 징크옥사이드, 티타늄디옥사이드, 부틸메톡시디벤조일메탄",
    "주의사항: 눈에 들어가지 않게 주의하세요.",
    "기능성 관련: 자외선 차단 기능성 제품",
  ],
  "sample_C_salt_bodywash.pdf": [
    "제품명: 솔트 바디워시 (가상)",
    "책임판매업자: (주)솔트에이치 / 주소: 인천광역시 연수구 컨벤시아대로 20",
    "내용량: 300 mL",
    "사용기한: 2028.06.30",
    "제조국: 대한민국",
    "제조번호: LOT-C-88",
    "전성분: 정제수, 소듐라우릴설페이트, 코카미도프로필베타인, 글리세린",
    "주의사항: 눈에 들어간 경우 물로 씻어내세요.",
    "홍보: 피부 장벽 강화에 도움을 줄 수 있습니다.",
  ],
};

for (const [name, lines] of Object.entries(samples)) {
  fs.writeFileSync(path.join(outDir, name), buildSimplePdf(lines));
}
console.log("wrote", Object.keys(samples).length, "sample PDFs");
export { BEGIN, END };
