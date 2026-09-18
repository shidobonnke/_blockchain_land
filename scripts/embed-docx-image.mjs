import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const docx = resolve(root, "lab_activity_2/Lab_Activity_2_ATM_Use_Case_Modelling.docx");
const image = resolve(root, "lab_activity_2/ATM_Use_Case_Diagram.png");
const work = await mkdtemp(join(tmpdir(), "atm-docx-"));
await exec("unzip", ["-q", docx, "-d", work]);
await mkdir(join(work, "word/media"), { recursive: true });
await cp(image, join(work, "word/media/image1.png"));

const relationshipsPath = join(work, "word/_rels/document.xml.rels");
let relationships = await readFile(relationshipsPath, "utf8");
relationships = relationships.replace(
  "</Relationships>",
  '<Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>'
);
await writeFile(relationshipsPath, relationships);

const typesPath = join(work, "[Content_Types].xml");
let types = await readFile(typesPath, "utf8");
types = types.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>');
await writeFile(typesPath, types);

const documentPath = join(work, "word/document.xml");
let document = await readFile(documentPath, "utf8");
const heading = "ATM Use Case Diagram";
const headingAt = document.indexOf(heading);
if (headingAt < 0) throw new Error("Diagram heading was not found in the Word document");
const paragraphEnd = document.indexOf("</w:p>", headingAt) + 6;
const drawing = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="5943600" cy="4061460"/><wp:docPr id="100" name="ATM Use Case Diagram"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="ATM_Use_Case_Diagram.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImage1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="5943600" cy="4061460"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
document = `${document.slice(0, paragraphEnd)}${drawing}${document.slice(paragraphEnd)}`;
await writeFile(documentPath, document);
await exec("zip", ["-qr", docx, "."], { cwd: work });
console.log(docx);
