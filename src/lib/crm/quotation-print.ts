import type { TechnicalProposalDocument } from "@/types/crm";

const NAVY = "#082868";
const BLUE = "#1A4A9E";
const GOLD = "#C8962E";
const INK = "#142033";

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

const PRICE_FIELDS = [
  { key: "listed", label: "السعر الحالي" },
  { key: "requested", label: "السعر المطلوب" },
  { key: "approved", label: "السعر المعتمد" },
] as const;

function readPrices(doc: TechnicalProposalDocument): Record<string, string> {
  const found: Record<string, string> = {};
  for (const section of doc.sections) {
    for (const bullet of section.bullets) {
      const trimmed = bullet.trim();
      for (const field of PRICE_FIELDS) {
        if (!trimmed.startsWith(field.label) || found[field.key]) continue;
        const value = trimmed
          .slice(field.label.length)
          .replace(/^[:：\-–\s]+/, "")
          .trim();
        found[field.key] = value || "—";
      }
    }
  }
  return found;
}

function isPriceBullet(bullet: string): boolean {
  const trimmed = bullet.trim();
  return PRICE_FIELDS.some((field) => trimmed.startsWith(field.label));
}

export function quotationHtml(
  doc: TechnicalProposalDocument,
  leadName: string,
  logoUrl: string,
  autoPrint = false
): string {
  const client = escapeHtml(leadName.trim() || doc.subtitle.trim() || "العميل");
  const pageTitle = escapeHtml(
    `كوتشين${leadName.trim() ? ` - ${leadName.trim()}` : ""}`
  );
  const prices = readPrices(doc);
  const reference = doc.reference?.trim()
    ? `<p class="ref">رقم الملف <b dir="ltr">${escapeHtml(doc.reference.trim())}</b></p>`
    : "";
  const priceCards = PRICE_FIELDS.map((field) => {
    const value = escapeHtml(prices[field.key] || "—");
    return `<article class="price ${field.key}">
      <span>${field.label}</span>
      <strong>${value}</strong>
    </article>`;
  }).join("");
  const sections = doc.sections
    .filter((section) => section.title.trim())
    .map((section) => {
      const bullets = section.bullets
        .map((bullet) => bullet.trim())
        .filter((bullet) => bullet && !isPriceBullet(bullet))
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join("");
      const intro = paragraphs(section.intro);
      if (!intro && !bullets) return "";
      return `<section class="block">
        <h2>${escapeHtml(section.title.trim())}</h2>
        ${intro}
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
  const intro = doc.intro.trim()
    ? `<div class="intro">${paragraphs(doc.intro)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${pageTitle}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" />
  <style>
    @page { size: A4; margin: 0 0 11mm 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body {
      margin: 0; padding: 0; background: #fff; color: ${INK};
      font-family: "Noto Sans Arabic", "Geeza Pro", Tahoma, sans-serif;
      font-size: 12pt; line-height: 1.8;
    }
    .sheet-head, .sheet-foot { position: fixed; left: 0; right: 0; z-index: 2; }
    .sheet-head { top: 0; height: 34mm; background: #fff; }
    .sheet-foot { bottom: 0; height: 22mm; background: #fff; }
    .band {
      height: 29mm; background: ${NAVY}; color: #fff;
      display: flex; align-items: center; gap: 5mm; padding: 0 14mm;
    }
    .logo-badge {
      flex: none; width: 16mm; height: 16mm; border-radius: 50%; background: #fff;
      display: flex; align-items: center; justify-content: center;
    }
    .logo-badge img { width: 11mm; height: 11mm; object-fit: contain; }
    .brand-copy { min-width: 0; }
    .kicker {
      margin: 0; font-size: 8pt; font-weight: 700; letter-spacing: 0.16em; opacity: 0.78;
    }
    .doc-kind { margin: 0.4mm 0 0; font-size: 16pt; font-weight: 700; line-height: 1.2; }
    .company {
      margin: 0.6mm 0 0; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.06em; opacity: 0.9;
    }
    .accent { height: 5mm; background: linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 55%, #f3e2b0 100%); }
    .foot-copy {
      height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
      border-top: 0.35mm solid #e4eaf3; color: ${NAVY}; text-align: center; font-size: 8.5pt; font-weight: 600;
    }
    .foot-copy .brand { font-size: 9pt; font-weight: 700; letter-spacing: 0.06em; }
    .foot-copy .row { display: flex; gap: 2.4mm; align-items: center; justify-content: center; flex-wrap: wrap; }
    .foot-copy .sep { opacity: 0.4; }
    .frame { width: 100%; border-collapse: collapse; }
    .head-space { height: 40mm; }
    .foot-space { height: 28mm; }
    .content { padding: 1mm 14mm 0; }
    .who { text-align: center; }
    .for { margin: 0; color: ${BLUE}; font-size: 10pt; font-weight: 700; }
    h1 { margin: 0.5mm 0 0; color: ${NAVY}; font-size: 20pt; font-weight: 700; line-height: 1.3; }
    .ref { margin: 1.5mm 0 0; color: ${NAVY}; font-size: 10pt; font-weight: 700; }
    .intro { margin-top: 4mm; }
    .intro p { margin: 0 0 1.4mm; text-align: right; }
    .prices { display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 3mm; margin-top: 6mm; }
    .price {
      border: 0.35mm solid #e1e8f2; border-radius: 3mm; background: #f7f9fc;
      padding: 3.2mm 3.5mm 2.8mm; text-align: center;
    }
    .price span { display: block; color: #5c6b82; font-size: 9pt; font-weight: 700; }
    .price strong { display: block; margin-top: 1.2mm; color: ${NAVY}; font-size: 13pt; font-weight: 700; line-height: 1.35; }
    .price.requested { background: #fff; border-color: ${BLUE}; }
    .price.approved { background: ${NAVY}; border-color: ${NAVY}; }
    .price.approved span { color: rgba(255,255,255,0.78); }
    .price.approved strong { color: #fff; font-size: 15pt; }
    .block { margin-top: 6mm; break-inside: avoid; page-break-inside: avoid; }
    .block h2 {
      display: flex; align-items: center; gap: 2.4mm; margin: 0 0 1.8mm;
      color: ${NAVY}; font-size: 13pt; font-weight: 700;
    }
    .block h2::before {
      content: ""; width: 2.4mm; height: 2.4mm; border-radius: 0.7mm; background: ${GOLD}; flex: none;
    }
    .block p { margin: 0 0 1.4mm; text-align: right; }
    ul { margin: 1.5mm 0 0; padding: 0; list-style: none; }
    li { position: relative; margin: 0 0 1.4mm; padding-right: 4.5mm; text-align: right; }
    li::before {
      content: ""; position: absolute; right: 0; top: 0.72em; width: 1.6mm; height: 1.6mm;
      border-radius: 50%; background: ${GOLD};
    }
    .note {
      background: #fbf7ee; border: 0.3mm solid #ead9ae; border-right: 1.3mm solid ${GOLD};
      border-radius: 2.5mm; padding: 3.2mm 4mm 2.6mm;
    }
    .note h2 { border: 0; }
    .toolbar { position: fixed; top: 12px; left: 12px; z-index: 5; }
    .toolbar button {
      border: 0; border-radius: 10px; background: ${NAVY}; color: #fff;
      font: 600 14px "Noto Sans Arabic", sans-serif; padding: 10px 14px; cursor: pointer;
    }
    @media screen {
      body { background: #fff; }
      .paper { width: 210mm; margin: 0; position: relative; background: #fff; }
      .sheet-head, .sheet-foot { position: absolute; }
    }
    body.capture .toolbar { display: none !important; }
    body.capture .paper { margin: 0; min-height: 0; box-shadow: none; width: 210mm; }
    body.capture .sheet-head, body.capture .sheet-foot {
      position: relative; top: auto; right: auto; bottom: auto; left: auto; transform: none; width: 210mm;
    }
  </style>
</head>
<body>
  <article class="paper">
    <header class="sheet-head">
      <div class="band">
        <div class="logo-badge"><img src="${escapeHtml(logoUrl)}" alt="Rootk Systems" /></div>
        <div class="brand-copy">
          <p class="kicker" dir="ltr">QUOTATION</p>
          <p class="doc-kind">كوتشين</p>
          <p class="company" dir="ltr">Rootk Systems</p>
        </div>
      </div>
      <div class="accent"></div>
    </header>
    <footer class="sheet-foot">
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
          <div class="who">
            <p class="for">مقدم إلى</p>
            <h1>${client}</h1>
            ${reference}
          </div>
          ${intro}
          <div class="prices">${priceCards}</div>
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
      var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.race([fonts, new Promise(function (resolve) { setTimeout(resolve, 2500); })]).then(function () {
        setTimeout(function () { window.print(); }, 80);
      });
    });
  </script>`
      : ""
  }
</body>
</html>`;
}
