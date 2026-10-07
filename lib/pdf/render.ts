import type { Browser } from "puppeteer-core";

/**
 * Startet Chromium – auf Vercel/Serverless über @sparticuz/chromium (schlanke,
 * für Lambda/Vercel-Functions gebaute Binary), lokal über das normale
 * `puppeteer`-Paket mit gebündeltem Chromium (siehe scripts/fetch-fonts.mjs
 * Kommentar oben für den Hintergrund, warum wir Fonts lokal bündeln).
 */
async function getBrowser(): Promise<Browser> {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    const executablePath = await chromium.executablePath();
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  }

  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({
    headless: true,
    // Nötig auf Linux-Servern ohne unprivilegierte User-Namespaces (z.B.
    // Ubuntu 24.04 mit AppArmor-Restriktion) - Chrome kann sich sonst nicht
    // sandboxen und stürzt beim Start ab. Der Prozess läuft ohnehin als
    // eigener unprivilegierter Systembenutzer (siehe Deployment), das
    // kompensiert einen Teil der fehlenden Chrome-eigenen Sandbox.
    // --disable-crash-reporter: der Crashpad-Handler versucht sonst, seine
    // Datenbank unter $HOME abzulegen - unter systemd mit ProtectHome=true
    // (siehe Deployment) ist das nicht beschreibbar, Chrome bricht sonst
    // schon beim Start ab ("chrome_crashpad_handler: --database is required").
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-crash-reporter"],
  }) as unknown as Browser;
}

/**
 * Zeitlimit für die einzelnen Chromium-Befehle.
 *
 * Puppeteers Vorgabe sind 30 Sekunden - zu wenig für ein ganzes Paket. Ein
 * Briefbogen, der als PDF hochgeladen und zu einem ganzseitigen Hintergrundbild
 * wird, kostet rund 140 ms je Empfänger statt der 30 ms einer Seite mit bloßem
 * Logo; ein Paket lief damit in den Abbruch ("Timed out after waiting 30000ms"),
 * obwohl nichts kaputt war.
 *
 * 120 Sekunden sind großzügig gewählt und trotzdem unterhalb des nginx-Limits
 * (300 s). Die eigentliche Grenze zieht ohnehin die Paketgröße: ein Paket soll
 * deutlich unter Cloudflares rund 100 Sekunden bleiben (siehe MAX_RECIPIENTS).
 */
const CHROMIUM_ZEITLIMIT_MS = 120_000;

/** Rendert ein komplettes HTML-Dokument (alle Empfänger, alle Seiten) zu einer einzigen PDF. */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(CHROMIUM_ZEITLIMIT_MS);
    // Alle Ressourcen (Schriften, Bilder) sind als data:-URIs inline eingebettet,
    // daher genügt "load" - kein externer Netzwerk-Traffic zu erwarten.
    await page.setContent(html, { waitUntil: "load", timeout: CHROMIUM_ZEITLIMIT_MS });
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      timeout: CHROMIUM_ZEITLIMIT_MS,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
