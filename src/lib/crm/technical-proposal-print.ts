import { API_ROUTES } from "@/api/routes";
import { quotationHtml } from "@/lib/crm/quotation-print";
import { getHttpClient } from "@/lib/http-client";
import type { CrmClientRequestKind, TechnicalProposalDocument } from "@/types/crm";

export type PdfDownloadPhase =
  | "prepare"
  | "render"
  | "download"
  | "done";

export type PdfDownloadProgress = {
  phase: PdfDownloadPhase;
  percent: number;
};

export type DownloadTechnicalProposalPdfOptions = {
  onProgress?: (progress: PdfDownloadProgress) => void;
};

const NAVY = "#082868";
const BLUE = "#1A4A9E";
const WAVE = "#4E7EBF";

/** Replaced on the server with a local logo — keeps mobile upload tiny. */
export const PDF_LOGO_TOKEN = "__ROOTK_PDF_LOGO__";

export type ProposalMarkupOptions = {
  /** When false, skip Google Fonts CDN (server PDF path). Default true for browser print. */
  externalFonts?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isBulletLine(line: string): boolean {
  return /^[-•*]\s+/.test(line) || /^\d+[-)]\s+/.test(line);
}

function bulletText(line: string): string {
  return line.replace(/^[-•*]\s+/, "").replace(/^\d+[-)]\s+/, "").trim();
}

function isModuleHeading(line: string): boolean {
  return /^\d+\.\s+\S/.test(line) && line.length < 120 && !line.includes("|");
}

function isLabelLine(line: string): boolean {
  return /[:：]\s*$/.test(line) && line.length < 80 && !line.includes("|");
}

function isPipeRow(line: string): boolean {
  return line.includes("|") && line.split("|").length >= 2;
}

function renderPipeTable(rows: string[]): string {
  const cells = rows.map((row) =>
    row.split("|").map((cell) => cell.trim()).filter((cell, index, all) => {
      // Keep empty trailing cells only when the row clearly has 2+ columns.
      return cell.length > 0 || index < all.length - 1;
    })
  );
  if (cells.length === 0) return "";
  const head = cells[0]!;
  const body = cells.slice(1);
  const headHtml = head
    .map((cell) => `<th>${escapeHtml(cell)}</th>`)
    .join("");
  const bodyHtml = body
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
    )
    .join("");
  return `<table class="doc-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function renderChunkLines(lines: string[]): string {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    if (isPipeRow(line)) {
      const rows: string[] = [];
      while (i < lines.length && isPipeRow(lines[i]!)) {
        rows.push(lines[i]!);
        i += 1;
      }
      out.push(renderPipeTable(rows));
      continue;
    }

    if (isBulletLine(line)) {
      const items: string[] = [];
      while (i < lines.length && isBulletLine(lines[i]!)) {
        items.push(`<li>${escapeHtml(bulletText(lines[i]!))}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (isModuleHeading(line)) {
      out.push(`<h3>${escapeHtml(line)}</h3>`);
      i += 1;
      continue;
    }

    if (isLabelLine(line)) {
      out.push(`<p class="label">${escapeHtml(line)}</p>`);
      i += 1;
      continue;
    }

    out.push(`<p>${escapeHtml(line)}</p>`);
    i += 1;
  }
  return out.join("");
}

/** Turn free-form annex text into semantic HTML that paginates cleanly. */
function richBody(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const chunks = normalized
    .split(/\n\s*---\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks
    .map((chunk) => {
      const lines = chunk
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) return "";
      return `<div class="chunk">${renderChunkLines(lines)}</div>`;
    })
    .join("");
}

function paragraphs(value: string): string {
  return richBody(value);
}

function headerWave(): string {
  return `<svg class="wave" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
    <path fill="${WAVE}" d="M0,128 C150,176 280,72 470,104 C680,140 820,188 1040,112 C1120,82 1160,96 1200,88 L1200,0 L0,0 Z"/>
    <path fill="${BLUE}" d="M0,96 C170,148 310,48 520,78 C740,110 860,156 1080,86 C1140,62 1170,70 1200,64 L1200,0 L0,0 Z"/>
    <path fill="${NAVY}" d="M0,0 L1200,0 L1200,44 C1000,74 800,26 560,40 C320,54 160,92 0,50 Z"/>
  </svg>`;
}

function footerWave(): string {
  return `<svg class="wave" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
    <path fill="${WAVE}" d="M0,78 C170,128 310,28 500,62 C710,100 860,18 1080,70 C1140,88 1170,80 1200,86 L1200,220 L0,220 Z"/>
    <path fill="${BLUE}" d="M0,112 C190,156 340,64 560,98 C790,134 930,70 1200,118 L1200,220 L0,220 Z"/>
    <path fill="${NAVY}" d="M0,156 C210,188 390,132 600,158 C830,186 1000,140 1200,166 L1200,220 L0,220 Z"/>
  </svg>`;
}

export function technicalProposalHtml(
  doc: TechnicalProposalDocument,
  leadName: string,
  logoUrl: string,
  autoPrint = true,
  options: ProposalMarkupOptions = {}
): string {
  const externalFonts = options.externalFonts !== false;
  const title = escapeHtml(doc.title.trim() || "الملحق الفني");
  const pageTitle = escapeHtml(
    `${doc.title.trim() || "الملحق الفني"}${leadName.trim() ? ` - ${leadName.trim()}` : ""}`
  );
  const sections = doc.sections
    .filter((section) => section.title.trim())
    .map((section, index) => {
      const bullets = section.bullets
        .map((bullet) => bullet.trim())
        .filter(Boolean)
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join("");
      return `<section class="block">
        <h2><span class="idx">${index + 1}</span><span>${escapeHtml(section.title.trim())}</span></h2>
        ${paragraphs(section.intro)}
        ${bullets ? `<ul>${bullets}</ul>` : ""}
      </section>`;
    })
    .join("");
  const noteTitle = doc.noteTitle.trim();
  const note = doc.note.trim();
  // Skip empty note shells (title-only) that leave a blank tinted box on the last page.
  const noteBlock = note
    ? `<section class="block note">
          ${noteTitle ? `<h2>${escapeHtml(noteTitle)}</h2>` : ""}
          ${paragraphs(note)}
        </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${pageTitle}</title>
  ${
    externalFonts
      ? `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" />`
      : ""
  }
  <style>
    @page {
      size: A4;
      margin: 0 0 11mm 0;
      @bottom-left-corner { content: ""; background: ${NAVY}; }
      @bottom-left { content: ""; background: ${NAVY}; }
      @bottom-center {
        content: counter(page);
        color: #fff;
        background: ${NAVY};
        font-family: "Noto Sans Arabic", "Noto Naskh Arabic", "Geeza Pro", Tahoma, sans-serif;
        font-size: 10pt;
        font-weight: 700;
      }
      @bottom-right { content: ""; background: ${NAVY}; }
      @bottom-right-corner { content: ""; background: ${NAVY}; }
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #142033;
      font-family: "Noto Sans Arabic", "Noto Naskh Arabic", "Geeza Pro", Tahoma, "Segoe UI", sans-serif;
      font-size: 12.5pt;
      line-height: 1.85;
    }
    .sheet-head, .sheet-foot {
      position: fixed;
      left: 0;
      right: 0;
      z-index: 2;
    }
    .sheet-head { top: 0; height: 38mm; }
    .sheet-foot {
      bottom: 0;
      height: 28mm;
      transform: translateY(1.4mm);
    }
    .wave { display: block; width: 100%; height: 100%; }
    .logo-badge {
      position: absolute;
      top: 12mm;
      left: 50%;
      transform: translateX(-50%);
      width: 16mm;
      height: 16mm;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1.2mm 3.5mm rgba(8, 40, 104, 0.16);
    }
    .logo-badge img { display: block; width: 11.5mm; height: 11.5mm; }
    .company-name {
      position: absolute;
      top: 29.2mm;
      left: 0;
      right: 0;
      margin: 0;
      text-align: center;
      color: ${NAVY};
      font-family: Tahoma, "Noto Sans Arabic", sans-serif;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      line-height: 1;
    }
    .foot-copy {
      position: absolute;
      left: 10mm;
      right: 10mm;
      bottom: 2.4mm;
      color: #fff;
      text-align: center;
      font-size: 8.5pt;
      font-weight: 600;
      line-height: 1.4;
    }
    .foot-copy .brand {
      margin: 0 0 0.7mm;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .foot-copy .row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2.6mm;
      flex-wrap: wrap;
    }
    .foot-copy b { font-weight: 700; }
    .foot-copy .sep { opacity: 0.55; }
    .frame { width: 100%; border-collapse: collapse; }
    .frame thead { display: table-header-group; }
    .frame tfoot { display: table-footer-group; }
    .head-space { height: 42mm; }
    .foot-space { height: 32mm; }
    .content { padding: 0 16mm; }
    .doc-ref {
      margin: 0 0 3.2mm;
      text-align: center;
      color: ${NAVY};
      font-size: 11pt;
      font-weight: 700;
    }
    .doc-ref b { letter-spacing: 0.06em; }
    h1 {
      margin: 0;
      text-align: center;
      color: ${NAVY};
      font-size: 20pt;
      font-weight: 700;
      line-height: 1.35;
    }
    .rule {
      width: 28mm;
      height: 1.1mm;
      margin: 3.2mm auto 0;
      border-radius: 1mm;
      background: linear-gradient(90deg, ${NAVY}, ${WAVE});
    }
    .subtitle {
      margin: 3.5mm 0 0;
      text-align: center;
      color: ${BLUE};
      font-size: 13pt;
      font-weight: 700;
    }
    .intro { margin-top: 6mm; }
    .intro p, .block p, .chunk p {
      margin: 0 0 1.6mm;
      text-align: right;
    }
    .block {
      margin-top: 7mm;
      /* Sections may span pages; forcing avoid on tall blocks leaves blank pages. */
    }
    .chunk {
      margin-top: 4.2mm;
    }
    .chunk:first-child { margin-top: 0; }
    .block h2 {
      display: flex;
      align-items: center;
      gap: 2.6mm;
      margin: 0 0 2.4mm;
      padding-bottom: 1.6mm;
      border-bottom: 0.35mm solid #d7e3f4;
      color: ${NAVY};
      font-size: 13.5pt;
      font-weight: 700;
      line-height: 1.45;
      text-align: right;
      break-after: avoid-page;
      page-break-after: avoid;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .chunk h3 {
      margin: 0 0 2mm;
      color: ${NAVY};
      font-size: 12.5pt;
      font-weight: 700;
      line-height: 1.45;
      text-align: right;
      break-after: avoid-page;
      page-break-after: avoid;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .label {
      margin: 2.2mm 0 1.2mm !important;
      color: ${BLUE};
      font-weight: 700;
      break-after: avoid-page;
      page-break-after: avoid;
    }
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2.4mm 0 3mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .doc-table th,
    .doc-table td {
      border: 0.3mm solid #d7e3f4;
      padding: 2mm 2.4mm;
      text-align: right;
      vertical-align: top;
      font-size: 11.5pt;
      line-height: 1.55;
    }
    .doc-table th {
      background: #eef4fb;
      color: ${NAVY};
      font-weight: 700;
    }
    li {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    p, li {
      orphans: 3;
      widows: 3;
    }
    .idx {
      flex: none;
      width: 7mm;
      height: 7mm;
      border-radius: 2mm;
      background: ${NAVY};
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10pt;
      font-weight: 700;
    }
    ul {
      margin: 2.2mm 0 0;
      padding: 0;
      list-style: none;
    }
    li {
      position: relative;
      margin: 0 0 1.8mm;
      padding-right: 5mm;
      text-align: right;
    }
    li::before {
      content: "";
      position: absolute;
      right: 0;
      top: 0.72em;
      width: 1.7mm;
      height: 1.7mm;
      border-radius: 0.45mm;
      background: ${BLUE};
    }
    .note {
      background: #f3f7fc;
      border: 0.3mm solid #d7e3f4;
      border-right: 1.3mm solid ${NAVY};
      border-radius: 2mm;
      padding: 3.5mm 4.5mm 3mm;
    }
    .note h2 { border-bottom: 0; padding-bottom: 0; }
    .toolbar {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 5;
    }
    .toolbar button {
      border: 0;
      border-radius: 10px;
      background: ${NAVY};
      color: #fff;
      font: 600 14px "Noto Sans Arabic", sans-serif;
      padding: 10px 14px;
      cursor: pointer;
    }
    @media screen {
      body { background: #e7eef8; }
      .paper {
        width: 210mm;
        min-height: 297mm;
        margin: 10mm auto 14mm;
        background: #fff;
        box-shadow: 0 10px 36px rgba(8, 40, 104, 0.16);
        position: relative;
      }
      .sheet-head, .sheet-foot { position: absolute; }
      .sheet-foot { transform: none; }
    }
    @media print {
      .toolbar { display: none !important; }
      body { background: #fff; }
      .paper { margin: 0; width: auto; min-height: 0; box-shadow: none; }
    }
    body.capture .toolbar { display: none !important; }
    body.capture .paper {
      margin: 0;
      min-height: 0;
      box-shadow: none;
      width: 210mm;
    }
    body.capture .sheet-head,
    body.capture .sheet-foot {
      position: relative;
      top: auto;
      right: auto;
      bottom: auto;
      left: auto;
      transform: none;
      width: 210mm;
    }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="window.print()">تحميل PDF</button></div>
  <article class="paper">
    <header class="sheet-head">
      ${headerWave()}
      <div class="logo-badge"><img src="${escapeHtml(logoUrl)}" alt="Rootk Systems" /></div>
      <p class="company-name" dir="ltr">Rootk Systems</p>
    </header>
    <footer class="sheet-foot">
      ${footerWave()}
      <div class="foot-copy">
        <div class="brand" dir="ltr">Rootk Systems</div>
        <div class="row">
          <span>السجل التجاري <b dir="ltr">284328</b></span>
          <span class="sep">|</span>
          <span>البطاقة الضريبية <b dir="ltr">769-529-623</b></span>
          <span class="sep">|</span>
          <span dir="ltr">rootk-eg.com</span>
        </div>
      </div>
    </footer>
    <table class="frame">
      <thead><tr><td><div class="head-space"></div></td></tr></thead>
      <tfoot><tr><td><div class="foot-space"></div></td></tr></tfoot>
      <tbody><tr><td>
        <div class="content">
          ${
            doc.reference?.trim()
              ? `<p class="doc-ref">رقم الملف <b dir="ltr">${escapeHtml(doc.reference.trim())}</b></p>`
              : ""
          }
          <h1>${title}</h1>
          <div class="rule"></div>
          ${doc.subtitle.trim() ? `<p class="subtitle">${escapeHtml(doc.subtitle.trim())}</p>` : ""}
          ${doc.intro.trim() ? `<div class="intro">${paragraphs(doc.intro)}</div>` : ""}
          ${sections}
          ${noteBlock}
        </div>
      </td></tr></tbody>
    </table>
  </article>
  ${
    autoPrint
      ? `<script>
    window.addEventListener("load", function () {
      var fonts = document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
      var images = Array.prototype.map.call(document.images || [], function (img) {
        if (img.complete) return Promise.resolve();
        return new Promise(function (resolve) {
          img.onload = img.onerror = function () { resolve(); };
        });
      });
      Promise.race([
        Promise.all([fonts].concat(images)),
        new Promise(function (resolve) { setTimeout(resolve, 2500); })
      ]).then(function () {
        setTimeout(function () { window.print(); }, 80);
      });
    });
  </script>`
      : ""
  }
</body>
</html>`;
}

let logoDataUrl: Promise<string> | null = null;

/** Inline the mark so PDF capture does not depend on a cross-origin image fetch. */
function rootkLogoDataUrl(): Promise<string> {
  if (!logoDataUrl) {
    logoDataUrl = fetch("/rootk-logo.png")
      .then((res) => {
        if (!res.ok) throw new Error("logo");
        return res.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          })
      )
      .then((url) => {
        if (!url.startsWith("data:image/")) throw new Error("logo");
        return url;
      })
      .catch((error) => {
        logoDataUrl = null;
        throw error;
      });
  }
  return logoDataUrl;
}

async function proposalMarkup(
  doc: TechnicalProposalDocument,
  leadName: string,
  autoPrint: boolean,
  kind?: CrmClientRequestKind,
  options: ProposalMarkupOptions & { inlineLogo?: boolean } = {}
): Promise<string> {
  const inlineLogo = options.inlineLogo !== false;
  const logoUrl = inlineLogo ? await rootkLogoDataUrl() : PDF_LOGO_TOKEN;
  const markupOptions: ProposalMarkupOptions = {
    externalFonts: options.externalFonts,
  };
  if (kind === "price_exception") {
    return quotationHtml(doc, leadName, logoUrl, autoPrint, markupOptions);
  }
  return technicalProposalHtml(doc, leadName, logoUrl, autoPrint, markupOptions);
}

function writePrintDocument(target: Document, html: string) {
  target.open();
  target.write(html);
  target.close();
}

function waitForAssets(doc: Document): Promise<void> {
  const fonts = doc.fonts?.ready ?? Promise.resolve();
  const images = [...doc.images].map((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
  );
  return Promise.race([
    Promise.all([fonts, ...images]).then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 4000)),
  ]);
}

async function printHtmlDocument(html: string): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "annex-pdf");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument;
  const frameWin = iframe.contentWindow;
  if (!frameDoc || !frameWin) {
    iframe.remove();
    throw new Error("pdf-frame");
  }

  const loaded = new Promise<void>((resolve, reject) => {
    iframe.addEventListener("load", () => resolve(), { once: true });
    iframe.addEventListener("error", () => reject(new Error("pdf-frame")), {
      once: true,
    });
  });
  iframe.srcdoc = html;
  await loaded;
  await waitForAssets(frameDoc);
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

  await new Promise<void>((resolve) => {
    const done = () => {
      window.clearTimeout(timeout);
      iframe.remove();
      resolve();
    };
    const timeout = window.setTimeout(done, 120000);
    frameWin.addEventListener("afterprint", done, { once: true });
    frameWin.focus();
    frameWin.print();
  });
}

export async function openTechnicalProposalPrint(
  doc: TechnicalProposalDocument,
  leadName: string
): Promise<boolean> {
  const popup = window.open("", "_blank");
  const html = await proposalMarkup(doc, leadName, true);
  if (popup) {
    writePrintDocument(popup.document, html);
    popup.focus();
    return true;
  }
  await printHtmlDocument(await proposalMarkup(doc, leadName, false));
  return true;
}

function pdfFileName(
  doc: TechnicalProposalDocument,
  leadName: string,
  kind?: CrmClientRequestKind
): string {
  const kindLabel =
    kind === "price_exception"
      ? "quotation"
      : kind === "contract"
        ? "contract"
        : "technical-annex";
  const base = [doc.title.trim() || kindLabel, leadName.trim()]
    .filter(Boolean)
    .join("-")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || kindLabel}.pdf`;
}

function reportProgress(
  onProgress: DownloadTechnicalProposalPdfOptions["onProgress"],
  phase: PdfDownloadPhase,
  percent: number
) {
  onProgress?.({ phase, percent });
}

function isMobileClient(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Mobile-first blob save: Web Share API when available, else anchor download. */
export async function savePdfBlob(
  blob: Blob,
  fileName: string
): Promise<"shared" | "downloaded" | "opened"> {
  const typed =
    blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });

  const file = new File([typed], fileName, { type: "application/pdf" });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (typeof nav.canShare === "function" && typeof nav.share === "function") {
    try {
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: fileName });
        return "shared";
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "shared";
      }
    }
  }

  const url = URL.createObjectURL(typed);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.target = "_blank";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  if (isIOS) {
    // Keep the blob URL alive so the opened tab can load the PDF.
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return "opened";
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
  return "downloaded";
}

export type PreparedProposalPdf = {
  blob: Blob;
  fileName: string;
  mobile: boolean;
};

/**
 * Server Chromium PDF → authenticated blob with progress.
 * Mobile-fast path: tiny HTML (logo token, no font CDN) — server injects assets.
 */
export async function downloadTechnicalProposalPdf(
  doc: TechnicalProposalDocument,
  leadName: string,
  kind?: CrmClientRequestKind,
  options: DownloadTechnicalProposalPdfOptions = {}
): Promise<PreparedProposalPdf> {
  const { onProgress } = options;
  const mobile = isMobileClient();
  reportProgress(onProgress, "prepare", 6);

  // Never inline the 300KB+ logo or pull Google Fonts on the export path —
  // that was the dominant mobile delay (huge upload + networkidle on CDN).
  const html = await proposalMarkup(doc, leadName, false, kind, {
    inlineLogo: false,
    externalFonts: false,
  });
  reportProgress(onProgress, "prepare", 18);

  const fileName = pdfFileName(doc, leadName, kind);
  reportProgress(onProgress, "render", 28);

  // Keep the mobile progress bar moving while the server renders.
  let renderTick = 28;
  const pulse = window.setInterval(() => {
    renderTick = Math.min(78, renderTick + (mobile ? 4 : 2));
    reportProgress(onProgress, "render", renderTick);
  }, 350);

  let blob: Blob;
  try {
    blob = await getHttpClient().requestBlob(API_ROUTES.crm.documentsPdf, {
      method: "POST",
      body: { html, fileName },
      headers: { Accept: "application/pdf" },
    });
  } finally {
    window.clearInterval(pulse);
  }

  reportProgress(onProgress, "download", 86);

  if (!blob || blob.size < 64) {
    throw new Error("pdf-empty");
  }

  reportProgress(onProgress, "download", 92);
  // Desktop: auto-download. Mobile: caller shows a tap-to-save step so the
  // share/download keeps a fresh user gesture (iOS blocks async window.open).
  if (!mobile) {
    await savePdfBlob(blob, fileName);
  }
  reportProgress(onProgress, "done", 100);
  return { blob, fileName, mobile };
}
