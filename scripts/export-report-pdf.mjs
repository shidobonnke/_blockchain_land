import { execFile } from "node:child_process";
import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const results = resolve(root, "results");

const escapeHtml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function inline(value) {
  return escapeHtml(value).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const output = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (line.startsWith("# ")) output.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line.startsWith("## ")) output.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.startsWith("- ")) {
      const items = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(`<li>${inline(lines[index].slice(2))}</li>`);
        index++;
      }
      index--;
      output.push(`<ul>${items.join("")}</ul>`);
    } else if (line.startsWith("|")) {
      const rows = [];
      while (index < lines.length && lines[index].startsWith("|")) {
        rows.push(
          lines[index]
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim())
        );
        index++;
      }
      index--;
      const body = rows.filter((_, row) => row !== 1);
      output.push(
        `<table><thead><tr>${body[0]
          .map((cell) => `<th>${inline(cell)}</th>`)
          .join("")}</tr></thead><tbody>${body
          .slice(1)
          .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`
      );
    } else output.push(`<p>${inline(line)}</p>`);
  }
  return output.join("\n");
}

async function latestMarkdown() {
  const files = (await readdir(results))
    .filter((file) => /^guide-evaluation-30-.*\.md$/.test(file))
    .sort();
  if (!files.length) throw new Error("No guide evaluation Markdown report found");
  return resolve(results, files.at(-1));
}

const input = process.argv[2] ? resolve(root, process.argv[2]) : await latestMarkdown();
const prefix = resolve(results, basename(input, ".md"));
const htmlPath = `${prefix}.html`;
const pdfPath = `${prefix}.pdf`;
const content = markdownToHtml(await readFile(input, "utf8"));
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Anagu Build and Test Results</title><style>
@page { size: Letter; margin: 0.7in 0.65in 0.7in; }
* { box-sizing: border-box; } body { font-family: "Times New Roman", serif; color:#111; font-size:10.5pt; line-height:1.35; }
h1 { text-align:center; font-size:19pt; margin:0 0 20pt; font-weight:700; }
h2 { font-size:14pt; margin:20pt 0 8pt; break-after:avoid; border-bottom:0.5pt solid #777; padding-bottom:3pt; }
p { margin:5pt 0 9pt; } ul { margin:5pt 0 10pt 20pt; padding:0; }
table { width:100%; border-collapse:collapse; margin:7pt 0 16pt; font-size:9.2pt; break-inside:avoid; }
th, td { border:0.5pt solid #777; padding:5pt 6pt; vertical-align:top; } th { background:#e9edf2; font-weight:700; }
tbody tr:nth-child(even) { background:#f7f7f7; } td:not(:first-child), th:not(:first-child) { text-align:center; }
code { font-family:Menlo,monospace; font-size:8.5pt; } .footer { margin-top:22pt; border-top:0.5pt solid #999; padding-top:5pt; font-size:8.5pt; color:#555; }
</style></head><body>${content}<div class="footer">Anagu Land Administration Framework — reproducible 30-trial evaluation report</div></body></html>`;
await writeFile(htmlPath, html);
const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
  "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
].filter(Boolean);
let chrome;
for (const candidate of chromeCandidates) {
  if (await access(candidate).then(() => true).catch(() => false)) {
    chrome = candidate;
    break;
  }
}
if (!chrome)
  throw new Error("Google Chrome was not found. Install it or set CHROME_PATH to its executable.");
await exec(
  chrome,
  [
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`
  ],
  { maxBuffer: 1024 * 1024 }
);
console.log(JSON.stringify({ source: input, html: htmlPath, pdf: pdfPath }, null, 2));
