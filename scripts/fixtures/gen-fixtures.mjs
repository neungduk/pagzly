/** scripts/fixtures — 테스트용 PNG/PDF/DOCX 생성 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";

const dir = path.dirname(fileURLToPath(import.meta.url));

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNVk6QAAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJAD9W1nQAAAABJRU5ErkJggg==",
  "base64",
);
fs.writeFileSync(path.join(dir, "reference-mood.png"), png);

const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 90>>stream
BT /F1 12 Tf 72 720 Td (Calm clean beauty tone.) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000428 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
505
%%EOF`;
fs.writeFileSync(path.join(dir, "cosmetics-planning.pdf"), pdf);

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Brand tone: calm clean beauty. Emphasis: 87% hydration, fragrance-free, fast absorption.</w:t></w:r></w:p>
  </w:body>
</w:document>`;

const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

async function writeDocx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels")?.file(".rels", rels);
  zip.folder("word")?.file("document.xml", documentXml);
  zip.folder("word")?.folder("_rels")?.file("document.xml.rels", docRels);
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(path.join(dir, "cosmetics-planning.docx"), buf);
}

await writeDocx();
console.log("fixtures ready");
