import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { chromium, type Browser } from "playwright";

const PDF_LOGO_TOKEN = "__ROOTK_PDF_LOGO__";

@Injectable()
export class ProposalPdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProposalPdfService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;
  private logoDataUrl: string | null = null;

  async onModuleInit() {
    // Warm Chromium so the first mobile export is not paying cold-start cost.
    void this.getBrowser().catch((error) => {
      this.logger.warn(`PDF engine warm-up skipped: ${String(error)}`);
    });
  }

  private resolveLogoDataUrl(): string {
    if (this.logoDataUrl) return this.logoDataUrl;

    const candidates = [
      join(__dirname, "..", "assets", "rootk-logo-pdf.png"), // dist/assets after nest build
      join(__dirname, "assets", "rootk-logo-pdf.png"),
      join(process.cwd(), "assets", "rootk-logo-pdf.png"),
      join(process.cwd(), "src", "assets", "rootk-logo-pdf.png"),
      join(process.cwd(), "backend", "assets", "rootk-logo-pdf.png"),
      join(process.cwd(), "backend", "src", "assets", "rootk-logo-pdf.png"),
      join(process.cwd(), "..", "public", "rootk-logo.png"),
      join(process.cwd(), "public", "rootk-logo.png"),
    ];
    const logoPath = candidates.find((path) => existsSync(path));
    if (!logoPath) {
      this.logger.warn("PDF logo asset missing — exporting without mark image");
      this.logoDataUrl =
        "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#082868"/><text x="32" y="40" text-anchor="middle" fill="#fff" font-size="22" font-family="Tahoma">R</text></svg>`
        );
      return this.logoDataUrl;
    }

    const bytes = readFileSync(logoPath);
    const mime = logoPath.endsWith(".svg") ? "image/svg+xml" : "image/png";
    this.logoDataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
    return this.logoDataUrl;
  }

  private prepareHtml(html: string): string {
    const withLogo = html.includes(PDF_LOGO_TOKEN)
      ? html.split(PDF_LOGO_TOKEN).join(this.resolveLogoDataUrl())
      : html;

    // Belt-and-suspenders: never let a leftover Google Fonts link block PDF render.
    return withLogo
      .replace(
        /<link[^>]+fonts\.googleapis\.com[^>]*>/gi,
        ""
      )
      .replace(/<link[^>]+fonts\.gstatic\.com[^>]*>/gi, "")
      .replace(/<link[^>]+rel=["']preconnect["'][^>]*>/gi, "");
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    if (this.launching) return this.launching;

    this.launching = chromium
      .launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--font-render-hinting=none",
          "--disable-gpu",
        ],
      })
      .then((browser) => {
        this.browser = browser;
        this.launching = null;
        browser.on("disconnected", () => {
          this.browser = null;
        });
        return browser;
      })
      .catch((error) => {
        this.launching = null;
        this.logger.error("Failed to launch Chromium for PDF export", error);
        throw new ServiceUnavailableException(
          "PDF engine is unavailable on the server"
        );
      });

    return this.launching;
  }

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    const started = Date.now();
    const prepared = this.prepareHtml(html);
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      // domcontentloaded (not networkidle): no CDN wait. Logo is already inlined.
      await page.setContent(prepared, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });
      await page.emulateMedia({ media: "print" });
      await Promise.race([
        page.evaluate(async () => {
          if (document.fonts?.ready) await document.fonts.ready;
        }),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      this.logger.log(
        `PDF rendered in ${Date.now() - started}ms (html=${prepared.length}B pdf=${pdf.byteLength}B)`
      );
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
  }
}
