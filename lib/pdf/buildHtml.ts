import type { Recipient } from "@/lib/csv/parseAddresses";
import { buildAbsenderzeile } from "@/lib/absenderzeile";
import { buildBeitragsgrafikSvg, parseGermanDecimal } from "@/lib/beitragsgrafik";
import { getFont } from "@/lib/fonts";

export type LogoPosition = "left" | "center" | "right";
export type DuSieMode = "du" | "sie";

// Ersetzt reines Schwarz im gesamten Dokument (Fließtext, Überschriften,
// Rahmen) durch ein elegantes Dunkelgrau. Farbige Elemente (Design-Farbe,
// weißer Text auf farbigen/dunklen Flächen) bleiben davon unberührt.
const TEXT_COLOR = "#2A2A2E";

export type LetterheadConfig =
  | { mode: "image"; dataUrl: string } // voller Seite-1-Hintergrund (hochgeladener Briefbogen, ggf. aus PDF konvertiert)
  | { mode: "logo"; dataUrl: string; position: LogoPosition }; // kein Briefbogen -> weiße Seite + Logo

export type LetterConfig = {
  fontId: string;
  fontSizePt: number;
  designColor: string; // Hex-Farbe, z.B. "#1E6FA6" - für Überschrift (Seite 1) und Akzente (Seite 2)
  bodyHtml: string; // Seite-1-Brieftext mit Merge-Platzhaltern
  showHeadline: boolean;
  headlineText: string; // freier Text, Zeilenumbrüche werden übernommen
  absenderzeile: string; // fest eingetragene Absenderzeile (Schritt 1) - Fallback bzw. genutzt wenn absenderAusCsv=false
  absenderAusCsv: boolean; // wenn true: Absenderzeile wird je Empfänger aus dessen Arbeitgeber-Adresse (CSV) gebaut
  unternehmensname: string; // für den {{Unternehmensname}}-Platzhalter im Brieftext
  ansprechpartnerAnrede: string; // "Herr" oder "Frau", für {{AnsprechpartnerAnrede}}
  ansprechpartnerName: string; // Vor- und Nachname des bAV-Ansprechpartners, für {{AnsprechpartnerName}}
  ansprechpartnerTelefon: string; // für {{AnsprechpartnerTelefon}}
  ansprechpartnerEmail: string; // für {{AnsprechpartnerEmail}}
  showDate: boolean; // "[Monat] [Jahr]" rechts zwischen Adressblock und Brieftext
  dateMonthOffset: number; // 0 = aktueller Monat, 1 = nächster, 2 = übernächster
  letterhead: LetterheadConfig;
  page2PhotoDataUrl: string; // aufgelöstes Headerbild (Upload oder Standardmotiv) für Seite 2
  duSieMode: DuSieMode;
  beratungslinkUrl: string;
  qrCodeDataUrl: string; // vorab serverseitig generierter QR-Code (für beratungslinkUrl)
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type MergeCampaignFields = {
  unternehmensname: string;
  ansprechpartnerAnrede: string;
  ansprechpartnerName: string;
  ansprechpartnerTelefon: string;
  ansprechpartnerEmail: string;
};

/** Ersetzt {{Feld}}-Platzhalter im HTML durch die (escaped) Werte des Empfängers bzw. der Kampagne. */
export function applyMergeFields(html: string, recipient: Recipient, campaign: MergeCampaignFields): string {
  // {{Beitragsgrafik}} wird NICHT escaped (Rest der Ersetzungen schon) - der
  // Platzhalter wird durch fertiges, bereits selbst escapetes Inline-SVG ersetzt.
  const beitragsgrafikSvg = buildBeitragsgrafikSvg({
    eigenbeitrag: parseGermanDecimal(recipient.chartEigenbeitrag),
    steuerErsparnis: parseGermanDecimal(recipient.chartSteuerErsparnis),
    svErsparnis: parseGermanDecimal(recipient.chartSvErsparnis),
    agZuschuss: parseGermanDecimal(recipient.chartAgZuschuss),
    gesamtbeitrag: parseGermanDecimal(recipient.chartGesamtbeitrag),
  });

  return html
    .replace(/\{\{\s*Vorname\s*\}\}/g, escapeHtml(recipient.vorname))
    .replace(/\{\{\s*Nachname\s*\}\}/g, escapeHtml(recipient.nachname))
    .replace(/\{\{\s*Anredezeile\s*\}\}/g, escapeHtml(recipient.anredezeile))
    .replace(/\{\{\s*Freischaltcode\s*\}\}/g, escapeHtml(recipient.freischaltcode))
    .replace(/\{\{\s*Unternehmensname\s*\}\}/g, escapeHtml(campaign.unternehmensname))
    .replace(/\{\{\s*AnsprechpartnerAnrede\s*\}\}/g, escapeHtml(campaign.ansprechpartnerAnrede))
    .replace(/\{\{\s*AnsprechpartnerName\s*\}\}/g, escapeHtml(campaign.ansprechpartnerName))
    .replace(/\{\{\s*AnsprechpartnerTelefon\s*\}\}/g, escapeHtml(campaign.ansprechpartnerTelefon))
    .replace(/\{\{\s*AnsprechpartnerEmail\s*\}\}/g, escapeHtml(campaign.ansprechpartnerEmail))
    .replace(/\{\{\s*Beitragsgrafik\s*\}\}/g, beitragsgrafikSvg);
}

/** "AB12CD34" -> "AB12 CD34" - besser lesbar, ohne den eigentlichen Wert zu verändern. */
function formatFreischaltcode(code: string): string {
  const clean = code.trim();
  if (clean.length === 8) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  return clean;
}

const GERMAN_MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** "August 2026" - für die optionale Datumszeile auf Seite 1. */
function formatGermanMonthYear(date: Date): string {
  return `${GERMAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Verschiebt ein Datum um `offset` Monate (0 = aktueller Monat, 1 = nächster, 2 = übernächster). */
function addMonths(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function overlayLines(mode: DuSieMode): [string, string] {
  return mode === "du"
    ? ["In nur drei Schritten in", "deinen sicheren Ruhestand"]
    : ["In nur drei Schritten in", "Ihren sicheren Ruhestand"];
}

function monitorIconSvg(kind: "info" | "euro" | "check", color: string): string {
  const monitor = `<rect x="6" y="7" width="36" height="24" rx="2.5" stroke="${color}" stroke-width="2.2" fill="none"/><line x1="18" y1="39" x2="30" y2="39" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/><line x1="24" y1="31" x2="24" y2="39" stroke="${color}" stroke-width="2.2"/>`;
  const inner =
    kind === "info"
      ? `<line x1="13" y1="15" x2="35" y2="15" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/><line x1="13" y1="21" x2="26" y2="21" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`
      : kind === "euro"
        ? `<text x="24" y="24.5" font-size="15" text-anchor="middle" fill="${color}" font-family="Arial, sans-serif" font-weight="bold">&#8364;</text>`
        : `<path d="M15 19l6 6 12-12" stroke="${color}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${monitor}${inner}</svg>`;
}

function letterheadStyleAndMarkup(letterhead: LetterheadConfig): string {
  if (letterhead.mode === "image") {
    return `<div class="letterhead-bg" style="background-image:url('${letterhead.dataUrl}')"></div>`;
  }
  const justify =
    letterhead.position === "left"
      ? "flex-start"
      : letterhead.position === "right"
        ? "flex-end"
        : "center";
  return `<div class="logo-header" style="justify-content:${justify}"><img src="${letterhead.dataUrl}" alt="Logo" /></div>`;
}

function renderHeadline(config: LetterConfig): string {
  if (!config.showHeadline || !config.headlineText.trim()) return "";
  const lines = config.headlineText
    .split("\n")
    .map((l) => escapeHtml(l))
    .join("<br/>");
  return `<div class="letter-headline" style="color:${config.designColor}">${lines}</div>`;
}

function renderPage1(config: LetterConfig, recipient: Recipient, dateText: string): string {
  // Bei absenderAusCsv kommt der Unternehmensname (Absenderzeile UND
  // {{Unternehmensname}}-Platzhalter) je Empfänger aus der Arbeitgebername-Spalte
  // statt aus dem fest eingetragenen Feld (Schritt 1).
  const unternehmensnameText = config.absenderAusCsv ? recipient.arbeitgebername : config.unternehmensname;
  const body = applyMergeFields(config.bodyHtml, recipient, {
    unternehmensname: unternehmensnameText,
    ansprechpartnerAnrede: config.ansprechpartnerAnrede,
    ansprechpartnerName: config.ansprechpartnerName,
    ansprechpartnerTelefon: config.ansprechpartnerTelefon,
    ansprechpartnerEmail: config.ansprechpartnerEmail,
  });
  const absenderzeileText = config.absenderAusCsv
    ? buildAbsenderzeile(
        unternehmensnameText,
        recipient.arbeitgeberStrasse,
        recipient.arbeitgeberPlz,
        recipient.arbeitgeberOrt
      )
    : config.absenderzeile;
  const absenderzeile = absenderzeileText.trim()
    ? `<div class="absenderzeile">${escapeHtml(absenderzeileText)}</div>`
    : "";
  const date = config.showDate ? `<div class="page1-date">${escapeHtml(dateText)}</div>` : "";
  return `
<section class="page page1">
  ${letterheadStyleAndMarkup(config.letterhead)}
  ${absenderzeile}
  <div class="address-block">
    <div>${escapeHtml(recipient.vorname)} ${escapeHtml(recipient.nachname)}</div>
    <div>${escapeHtml(recipient.strasse)}</div>
    <div><span class="plz">${escapeHtml(recipient.plz)}</span> <span class="ort">${escapeHtml(recipient.ort)}</span></div>
  </div>
  ${date}
  <div class="letter-body">
    ${renderHeadline(config)}
    ${body}
  </div>
</section>`;
}

function renderPage2(config: LetterConfig, recipient: Recipient): string {
  const color = config.designColor;
  const url = escapeHtml(config.beratungslinkUrl);
  const code = formatFreischaltcode(recipient.freischaltcode);
  const [overlayLine1, overlayLine2] = overlayLines(config.duSieMode);

  return `
<section class="page page2">
  <div class="page2-header">
    <img src="${config.page2PhotoDataUrl}" alt="" />
    <div class="page2-overlay">
      <div>${escapeHtml(overlayLine1)}</div>
      <div>${escapeHtml(overlayLine2)}</div>
    </div>
  </div>

  <div class="page2-body">
    <h2 class="p2-title">Login Daten für: ${escapeHtml(recipient.vorname)} ${escapeHtml(recipient.nachname)}</h2>

    <div class="p2-split">
      <div class="p2-col">
        <span class="p2-pill" style="background:${color}">1a</span>
        <strong class="p2-col-title">Starten des Prozesses per Browser</strong>
        <p>Um den Beratungsprozess zu starten, geben Sie bitte in der Adresszeile Ihres Internetbrowsers folgende Adresse ein: <span class="p2-link" style="color:${color}">${url}</span></p>
      </div>
      <div class="p2-col">
        <span class="p2-pill" style="background:${color}">1b</span>
        <strong class="p2-col-title">Oder mit Hilfe des QR-Codes</strong>
        <p>Scannen Sie den QR-Code und lassen Sie sich auf Ihrem Smartphone beraten:</p>
      </div>
      <div class="p2-qr">
        <img src="${config.qrCodeDataUrl}" alt="QR-Code" />
      </div>
    </div>

    <div class="p2-divider" style="border-color:${color}">
      <span class="p2-info-pill" style="background:${color}">i</span>
      <span class="p2-info-text">Bitte nutzen Sie für eine optimale Verwendung eine aktuelle Browserversion und ein akt. Betriebssystem</span>
    </div>

    <div class="p2-step">
      <div class="p2-icon">${monitorIconSvg("info", color)}</div>
      <div class="p2-connector" style="border-color:${color}"></div>
      <div class="p2-step-body">
        <div><span class="p2-pill p2-pill-inline" style="background:${color}">2.</span><strong>Allgemeine Informationen</strong></div>
        <p>Nach dem Laden der Webseite können Sie die gewünschte Sprache wählen. Danach begrüßt Sie der Moderator und führt Sie durch die allgemeinen Informationen zur betrieblichen Vorsorge.</p>
      </div>
    </div>

    <div class="p2-step">
      <div class="p2-icon">${monitorIconSvg("euro", color)}</div>
      <div class="p2-connector" style="border-color:${color}"></div>
      <div class="p2-step-body">
        <div><span class="p2-pill p2-pill-inline" style="background:${color}">3.</span><strong>Freischaltung Ihrer persönlichen Berechnung</strong></div>
        <p>Mit Hilfe Ihres Freischaltcodes gelangen Sie in Ihren persönlichen Bereich. Hier können Sie Ihren Wunschbetrag eingeben und sich Ihre betriebliche Vorsorge individuell berechnen lassen.</p>
      </div>
      <div class="p2-code-box">
        <div class="p2-code-label">Ihr persönlicher<br/>Freischaltcode:</div>
        <div class="p2-code-value">${escapeHtml(code)}</div>
      </div>
    </div>

    <div class="p2-step">
      <div class="p2-icon">${monitorIconSvg("check", color)}</div>
      <div class="p2-connector" style="border-color:${color}"></div>
      <div class="p2-step-body">
        <div><strong>Unsere Plattform mit drei einfachen Schritten auf jedem Endgerät nutzen</strong></div>
        <p>Sofern Sie Ihren Wunschbetrag gefunden haben, können Sie direkt durch erneute Eingabe Ihres Freischaltcodes Ihre betriebliche Vorsorge beantragen.</p>
      </div>
    </div>
  </div>
</section>`;
}

export function buildFullHtml(
  config: LetterConfig,
  recipients: Recipient[],
  fontFaceCss: string
): string {
  const font = getFont(config.fontId);
  const dateText = formatGermanMonthYear(addMonths(new Date(), config.dateMonthOffset));
  const pages = recipients
    .map((r) => renderPage1(config, r, dateText) + renderPage2(config, r))
    .join("\n");

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  ${fontFaceCss}

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "${font.cssFamily}", sans-serif;
    font-size: ${config.fontSizePt}pt;
    line-height: 1.45;
    color: ${TEXT_COLOR};
  }
  @page { size: A4; margin: 0; }

  .page {
    position: relative;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }

  /* --- Seite 1 --- */
  .letterhead-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: top center;
    background-repeat: no-repeat;
  }
  .logo-header {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 40mm;
    display: flex;
    align-items: center;
    padding: 5mm 20mm 0 20mm;
  }
  .logo-header img { max-height: 22mm; max-width: 60mm; object-fit: contain; }

  .absenderzeile {
    position: absolute;
    top: 60mm;
    left: 25mm;
    right: 20mm;
    font-size: 7pt;
    color: #5a5a5a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .address-block {
    position: absolute;
    top: 65mm;
    left: 25mm;
    width: 80mm;
    font-size: ${config.fontSizePt + 1}pt;
    line-height: 1.35;
  }
  .page1-date {
    position: absolute;
    top: 88mm;
    right: 20mm;
    font-size: ${config.fontSizePt}pt;
  }

  .letter-body {
    position: absolute;
    top: 98mm;
    left: 25mm;
    right: 20mm;
    bottom: 20mm;
    overflow: hidden;
  }
  .letter-headline {
    font-weight: 700;
    font-size: 1.3em;
    line-height: 1.3;
    margin-bottom: 6mm;
  }
  .letter-body h2 { font-size: 1.25em; margin: 0 0 2mm 0; }
  .letter-body h3 { font-size: 1.05em; margin: 0 0 6mm 0; font-weight: 600; }
  .letter-body p { margin: 0 0 3.2mm 0; }
  .letter-body ul { margin: 0 0 3.2mm 0; padding-left: 5mm; }
  .letter-body li { margin-bottom: 1mm; }
  .letter-body li p { margin: 0; }
  .letter-body svg { max-width: 100%; }

  /* --- Seite 2 --- */
  .page2 { display: flex; flex-direction: column; }
  .page2-header {
    position: relative;
    width: 100%;
    height: 100mm;
    overflow: hidden;
    background: #f2f2f2;
    flex-shrink: 0;
  }
  .page2-header img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .page2-overlay {
    position: absolute;
    left: 12mm;
    bottom: 10mm;
    max-width: 155mm;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    padding: 5mm 7mm;
    border-radius: 1.5mm;
    font-weight: 700;
    font-size: 22pt;
    line-height: 1.3;
  }

  .page2-body { padding: 8mm 18mm 0 18mm; font-size: 9.5pt; line-height: 1.4; }
  .p2-title { font-size: 13pt; font-weight: 700; margin: 0 0 6mm 0; color: ${TEXT_COLOR}; }

  .p2-pill {
    display: inline-block;
    color: #fff;
    font-size: 8pt;
    font-weight: 700;
    padding: 1mm 2.2mm;
    border-radius: 1mm;
    margin-right: 2mm;
    vertical-align: middle;
  }
  .p2-pill-inline { margin-right: 2.5mm; }

  .p2-split { display: flex; gap: 8mm; margin-bottom: 6mm; align-items: flex-start; }
  .p2-col { flex: 1; }
  .p2-col-title { display: block; margin-bottom: 1.5mm; }
  .p2-col p { margin: 0; }
  .p2-link { font-weight: 600; overflow-wrap: anywhere; word-break: normal; font-size: 0.95em; }
  .p2-qr { flex-shrink: 0; width: 19mm; height: 19mm; align-self: center; }
  .p2-qr img { width: 100%; height: 100%; object-fit: contain; }

  .p2-divider {
    position: relative;
    border-top: 1.2pt dotted;
    margin: 0 0 7mm 0;
    text-align: center;
  }
  .p2-info-pill {
    position: relative;
    top: -3mm;
    display: inline-block;
    color: #fff;
    font-size: 8pt;
    font-weight: 700;
    width: 5mm;
    height: 5mm;
    line-height: 5mm;
    border-radius: 50%;
    text-align: center;
  }
  .p2-info-text {
    display: block;
    margin-top: -3mm;
    font-size: 8pt;
    color: #555;
  }

  .p2-step { display: flex; align-items: flex-start; gap: 4mm; margin-bottom: 6mm; position: relative; }
  .p2-icon { flex-shrink: 0; width: 14mm; height: 14mm; }
  .p2-connector { flex-shrink: 0; width: 0; align-self: stretch; border-left: 1.2pt dotted; margin-top: 2mm; margin-bottom: 2mm; }
  .p2-step-body { flex: 1; }
  .p2-step-body p { margin: 1.5mm 0 0 0; }
  .p2-code-box {
    flex-shrink: 0;
    border: 1pt solid ${TEXT_COLOR};
    border-radius: 1.5mm;
    padding: 3mm 5mm;
    text-align: center;
    align-self: center;
  }
  .p2-code-label { font-size: 7.5pt; color: ${TEXT_COLOR}; margin-bottom: 1.5mm; }
  .p2-code-value { font-size: 12pt; font-weight: 700; letter-spacing: 0.8pt; white-space: nowrap; }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}
