import { quotationHtml } from "@/lib/crm/quotation-print";
import type { CrmClientRequestKind, TechnicalProposalDocument } from "@/types/crm";

const NAVY = "#082868";
const BLUE = "#1A4A9E";
const WAVE = "#4E7EBF";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(value: string): string {
  const blocks = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
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
  autoPrint = true
): string {
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
  const noteBlock =
    noteTitle || note
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
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" />
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
        font-family: Tahoma, "Noto Sans Arabic", sans-serif;
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
      font-family: "Noto Sans Arabic", "Geeza Pro", Tahoma, sans-serif;
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
    .intro p, .block p {
      margin: 0 0 1.6mm;
      text-align: right;
    }
    .block {
      margin-top: 7mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
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
  kind?: CrmClientRequestKind
): Promise<string> {
  const logoUrl = await rootkLogoDataUrl();
  if (kind === "price_exception") {
    return quotationHtml(doc, leadName, logoUrl, autoPrint);
  }
  return technicalProposalHtml(doc, leadName, logoUrl, autoPrint);
}

function writePrintDocument(target: Document, html: string) {
  target.open();
  target.write(html);
  target.close();
}

function printInFrame(html: string): boolean {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "annex-pdf");
  iframe.style.cssText =
    "position:fixed;left:0;top:0;width:210mm;height:297mm;border:0;background:#fff;z-index:2147483646;";
  document.body.appendChild(iframe);
  const frameDoc = iframe.contentDocument;
  const frameWin = iframe.contentWindow;
  if (!frameDoc || !frameWin) {
    iframe.remove();
    return false;
  }
  const remove = () => iframe.remove();
  frameWin.addEventListener("afterprint", remove, { once: true });
  window.setTimeout(remove, 120000);
  writePrintDocument(frameDoc, html);
  frameWin.focus();
  frameWin.print();
  return true;
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
  return printInFrame(await proposalMarkup(doc, leadName, false));
}

const PAGE_W = 210;
const PAGE_H = 297;
const BAND_MM = 11;
const HEADER_GAP_MM = 4;
const FOOTER_GAP_MM = 4;

function pdfFileName(doc: TechnicalProposalDocument, leadName: string): string {
  const clean = (value: string) =>
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "-");
  const title = clean(doc.title) || "الملحق-الفني";
  const reference = clean(doc.reference ?? "");
  const client = clean(leadName);
  return [title, reference, client].filter(Boolean).join("-") + ".pdf";
}

function waitForAssets(doc: Document): Promise<void> {
  const fonts = doc.fonts?.ready ?? Promise.resolve();
  const images = [...doc.images].map(
    (img) =>
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

function mountProposal(html: string): Promise<{ doc: Document; cleanup: () => void }> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:0;top:0;width:210mm;height:2000mm;border:0;opacity:0;pointer-events:none;z-index:-1;";
  const ready = new Promise<void>((resolve, reject) => {
    iframe.addEventListener("load", () => resolve(), { once: true });
    iframe.addEventListener("error", () => reject(new Error("pdf-frame")), { once: true });
  });
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
  return ready.then(() => {
    const doc = iframe.contentDocument;
    if (!doc?.querySelector(".content")) {
      iframe.remove();
      return Promise.reject(new Error("pdf-frame"));
    }
    return waitForAssets(doc).then(
      () =>
        new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            resolve({ doc, cleanup: () => iframe.remove() });
          });
        })
    );
  });
}

function paintMode(frame: Document, mode: "head" | "foot" | "content") {
  frame.body.classList.add("capture");
  const head = frame.querySelector(".sheet-head");
  const foot = frame.querySelector(".sheet-foot");
  const table = frame.querySelector(".frame");
  if (head instanceof frame.defaultView!.HTMLElement) {
    head.style.display = mode === "head" ? "block" : "none";
  }
  if (foot instanceof frame.defaultView!.HTMLElement) {
    foot.style.display = mode === "foot" ? "block" : "none";
  }
  if (table instanceof frame.defaultView!.HTMLElement) {
    table.style.display = mode === "content" ? "table" : "none";
  }
  frame.querySelectorAll(".head-space, .foot-space").forEach((node) => {
    if (node instanceof frame.defaultView!.HTMLElement) node.style.display = "none";
  });
  frame.defaultView?.scrollTo(0, 0);
}

function looksBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width < 2 || canvas.height < 2) return true;
  const sample = ctx.getImageData(
    0,
    0,
    canvas.width,
    Math.min(canvas.height, 90)
  ).data;
  let ink = 0;
  for (let i = 0; i < sample.length; i += 16) {
    if (sample[i] < 248 || sample[i + 1] < 248 || sample[i + 2] < 248) ink += 1;
  }
  return ink < 8;
}

type CanvasShot = (
  element: Element,
  foreignObject: boolean
) => Promise<HTMLCanvasElement>;

/** html2canvas drops the badge image inside the print frame. Paint it on the header shot. */
async function stampLogo(
  canvas: HTMLCanvasElement,
  head: Element
): Promise<void> {
  const img = head.querySelector(".logo-badge img");
  if (!(img instanceof HTMLImageElement)) return;
  if (typeof img.decode === "function") {
    await img.decode().catch(() => undefined);
  }
  if (!img.naturalWidth) return;
  const host = head.getBoundingClientRect();
  const box = img.getBoundingClientRect();
  if (host.width < 1 || box.width < 1) return;
  const scale = canvas.width / host.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(
    img,
    (box.left - host.left) * scale,
    (box.top - host.top) * scale,
    box.width * scale,
    box.height * scale
  );
}

async function capturePiece(
  shot: CanvasShot,
  element: Element
): Promise<HTMLCanvasElement> {
  try {
    const foreign = await shot(element, true);
    if (!looksBlank(foreign)) return foreign;
  } catch {
    // The foreign-object path fails when a stylesheet is cross-origin.
  }
  return shot(element, false);
}

function snapCut(canvas: HTMLCanvasElement, fromY: number, idealEnd: number): number {
  const end = Math.min(canvas.height, Math.round(idealEnd));
  if (end >= canvas.height - 1) return canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return end;
  const lookback = Math.min(48, end - fromY);
  if (lookback <= 0) return end;
  const start = end - lookback;
  const image = ctx.getImageData(0, start, canvas.width, lookback);
  const step = 10;
  for (let row = lookback - 1; row >= 0; row -= 1) {
    let white = 0;
    let samples = 0;
    for (let x = 0; x < canvas.width; x += step) {
      const i = (row * canvas.width + x) * 4;
      const alpha = image.data[i + 3];
      if (
        alpha < 12 ||
        (image.data[i] > 248 && image.data[i + 1] > 248 && image.data[i + 2] > 248)
      ) {
        white += 1;
      }
      samples += 1;
    }
    if (samples > 0 && white / samples > 0.985) return start + row;
  }
  return end;
}

function keepBlocksTogether(
  blocks: Array<{ top: number; bottom: number }>,
  scale: number,
  fromY: number,
  cut: number,
  windowPx: number
): number {
  for (const block of blocks) {
    const top = block.top * scale;
    const bottom = block.bottom * scale;
    const inside = cut > top + 1 && cut < bottom - 1;
    const fits = bottom - top <= windowPx;
    if (inside && fits && top > fromY + 8) return Math.round(top);
  }
  return cut;
}

function hasInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width < 2 || canvas.height < 2) return false;
  const step = 16;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let ink = 0;
  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i] < 246 || data[i + 1] < 246 || data[i + 2] < 246) {
      ink += 1;
      if (ink > 24) return true;
    }
  }
  return false;
}

function sliceCanvas(
  source: HTMLCanvasElement,
  y: number,
  height: number
): HTMLCanvasElement {
  const slice = document.createElement("canvas");
  slice.width = source.width;
  slice.height = Math.max(1, Math.round(height));
  const ctx = slice.getContext("2d");
  if (!ctx) return slice;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, slice.width, slice.height);
  ctx.drawImage(source, 0, y, source.width, height, 0, 0, source.width, height);
  return slice;
}

export async function downloadTechnicalProposalPdf(
  doc: TechnicalProposalDocument,
  leadName: string,
  kind?: CrmClientRequestKind
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const { doc: frame, cleanup } = await mountProposal(
    await proposalMarkup(doc, leadName, false, kind)
  );
  try {
    frame.querySelectorAll(".toolbar").forEach((node) => {
      if (node instanceof frame.defaultView!.HTMLElement) node.style.display = "none";
    });
    frame.querySelectorAll('link[rel="stylesheet"]').forEach((node) => node.remove());
    const head = frame.querySelector(".sheet-head");
    const foot = frame.querySelector(".sheet-foot");
    const content = frame.querySelector(".content");
    if (!head || !foot || !content) throw new Error("pdf-layout");
    const shot: CanvasShot = (element, foreignObject) =>
      html2canvas(element as HTMLElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        foreignObjectRendering: foreignObject,
        logging: false,
      });
    paintMode(frame, "head");
    const headCanvas = await capturePiece(shot, head);
    await stampLogo(headCanvas, head);
    paintMode(frame, "foot");
    const footCanvas = await capturePiece(shot, foot);
    paintMode(frame, "content");
    const contentCanvas = await capturePiece(shot, content);
    if (looksBlank(contentCanvas) && content.textContent?.trim()) {
      throw new Error("pdf-blank");
    }
    const pxPerMm = headCanvas.width / PAGE_W;
    const headerMm = headCanvas.height / pxPerMm;
    const footerMm = footCanvas.height / pxPerMm;
    const windowMm = PAGE_H - BAND_MM - footerMm - FOOTER_GAP_MM - headerMm - HEADER_GAP_MM;
    const windowPx = Math.max(40, windowMm * pxPerMm);
    const contentTop = content.getBoundingClientRect().top;
    const blocks = [...content.querySelectorAll(".block")].map((node) => {
      const box = node.getBoundingClientRect();
      return { top: box.top - contentTop, bottom: box.bottom - contentTop };
    });
    const contentHeight = content instanceof HTMLElement ? content.offsetHeight : content.getBoundingClientRect().height;
    const blockScale = contentHeight > 0 ? contentCanvas.height / contentHeight : 2;
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    let y = 0;
    let page = 0;
    while (y < contentCanvas.height - 1 && page < 40) {
      const ideal = Math.min(contentCanvas.height, y + windowPx);
      let cut = snapCut(contentCanvas, y, ideal);
      cut = keepBlocksTogether(blocks, blockScale, y, cut, windowPx);
      if (cut <= y + 8) cut = ideal;
      const slice = sliceCanvas(contentCanvas, y, cut - y);
      y = cut;
      if (!hasInk(slice)) continue;
      if (page > 0) pdf.addPage();
      page += 1;
      const sliceMm = slice.height / pxPerMm;
      pdf.addImage(headCanvas.toDataURL("image/png"), "PNG", 0, 0, PAGE_W, headerMm);
      pdf.addImage(
        slice.toDataURL("image/png"),
        "PNG",
        0,
        headerMm + HEADER_GAP_MM,
        PAGE_W,
        sliceMm
      );
      pdf.addImage(
        footCanvas.toDataURL("image/png"),
        "PNG",
        0,
        PAGE_H - BAND_MM - footerMm,
        PAGE_W,
        footerMm
      );
      pdf.setFillColor(8, 40, 104);
      pdf.rect(0, PAGE_H - BAND_MM, PAGE_W, BAND_MM, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(String(page), PAGE_W / 2, PAGE_H - 4.1, { align: "center" });
    }
    if (page === 0) throw new Error("pdf-blank");
    pdf.save(pdfFileName(doc, leadName));
  } finally {
    cleanup();
  }
}
