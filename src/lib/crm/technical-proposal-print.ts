import type { TechnicalProposalDocument } from "@/types/crm";

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

export function technicalProposalHtml(
  doc: TechnicalProposalDocument,
  leadName: string,
  logoUrl: string
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
        <h2>${index + 1}. ${escapeHtml(section.title.trim())}</h2>
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
    @page { size: A4; margin: 16mm 16mm 22mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: "Noto Sans Arabic", "Geeza Pro", Tahoma, sans-serif;
      font-size: 13.5pt;
      line-height: 1.9;
    }
    .brand {
      text-align: center;
      margin: 0 0 8mm;
    }
    .brand img { height: 18mm; width: auto; }
    h1 {
      margin: 0 0 11mm;
      text-align: center;
      font-size: 18pt;
      font-weight: 700;
      line-height: 1.4;
    }
    .subtitle {
      margin: 0 0 4mm;
      text-align: right;
      font-size: 14.5pt;
      font-weight: 700;
    }
    .intro p, .block p {
      margin: 0 0 2mm;
      text-align: right;
    }
    .intro { margin: 0 0 2mm; }
    .block { margin-top: 11mm; }
    .block h2 {
      margin: 0 0 6mm;
      text-align: right;
      font-size: 14.5pt;
      font-weight: 700;
    }
    ul {
      margin: 5mm 0 0;
      padding: 0;
      list-style: none;
    }
    li {
      margin: 0 0 3.4mm;
      text-align: right;
    }
    li::before { content: "- "; }
    footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      direction: ltr;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #12306e;
      font-family: "Plus Jakarta Sans", "Noto Sans Arabic", sans-serif;
    }
    footer img { height: 8mm; width: auto; }
    footer .name {
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    footer .tag {
      font-size: 7.5pt;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .toolbar {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 2;
    }
    .toolbar button {
      border: 0;
      border-radius: 10px;
      background: #12306e;
      color: #fff;
      font: 600 14px "Noto Sans Arabic", sans-serif;
      padding: 10px 14px;
      cursor: pointer;
    }
    @media print {
      .toolbar { display: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print"><button type="button" onclick="window.print()">تحميل PDF</button></div>
  <header class="brand"><img src="${escapeHtml(logoUrl)}" alt="ROOTK" /></header>
  <h1>${title}</h1>
  ${doc.subtitle.trim() ? `<p class="subtitle">${escapeHtml(doc.subtitle.trim())}</p>` : ""}
  ${doc.intro.trim() ? `<div class="intro">${paragraphs(doc.intro)}</div>` : ""}
  ${sections}
  ${noteBlock}
  <footer>
    <img src="${escapeHtml(logoUrl)}" alt="" />
    <div>
      <div class="name">ROOTK SYSTEMS</div>
      <div class="tag">Custom Software</div>
    </div>
  </footer>
  <script>
    window.addEventListener("load", function () {
      var wait = document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
      Promise.race([
        wait,
        new Promise(function (resolve) { setTimeout(resolve, 1600); })
      ]).then(function () {
        setTimeout(function () { window.print(); }, 120);
      });
    });
  </script>
</body>
</html>`;
}

export function beginTechnicalProposalPrint(): Window | null {
  return window.open("", "_blank");
}

export function writeTechnicalProposalPrint(
  popup: Window,
  doc: TechnicalProposalDocument,
  leadName: string
) {
  const logoUrl = `${window.location.origin}/rootk-logo.png`;
  popup.document.open();
  popup.document.write(technicalProposalHtml(doc, leadName, logoUrl));
  popup.document.close();
}

export function openTechnicalProposalPrint(
  doc: TechnicalProposalDocument,
  leadName: string
): Window | null {
  const popup = beginTechnicalProposalPrint();
  if (!popup) return null;
  writeTechnicalProposalPrint(popup, doc, leadName);
  return popup;
}
