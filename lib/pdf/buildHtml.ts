import { beratungQrStandardText, beratungQrStandardUeberschrift } from "@/lib/beratungQr";
import type { Recipient } from "@/lib/csv/parseAddresses";
import { buildAbsenderzeile } from "@/lib/absenderzeile";
import { buildBeitragsgrafikSvg, parseGermanDecimal } from "@/lib/beitragsgrafik";
import { getFont } from "@/lib/fonts";
import { overlayZeilen } from "@/lib/seite2Overlay";
import { seite2Texte } from "@/lib/seite2Texte";

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
  /** Schriftzug über dem Headerbild auf Seite 2; false = Bild bleibt unbeschriftet */
  overlayZeigen: boolean;
  /** Eigener Text dafür, Zeilenumbrüche werden übernommen; leer = Standardtext */
  overlayText: string;
  /**
   * Seite 2, Punkt 2: statt der allgemeinen Informationen die Anmeldemaske mit
   * Nutzername und Passwort je Empfänger (Variante mit Verschlüsselung).
   * Der Freischaltcode bleibt unverändert unter Punkt 3.
   */
  zugangsdatenZeigen: boolean;
  duSieMode: DuSieMode;
  beratungslinkUrl: string;
  qrCodeDataUrl: string; // vorab serverseitig generierter QR-Code (für beratungslinkUrl)
  /**
   * Optionaler zweiter QR-Code am Fuß von Seite 2 (Weg zur persönlichen
   * Beratung). Leerer String = Block wird nicht gezeichnet.
   */
  beratungQrDataUrl: string;
  /** Überschrift über diesem Block; leer = Du/Sie-abhängiger Standard */
  beratungQrUeberschrift: string;
  /**
   * Kontaktzeile im Beratungsblock. Nicht jeder Berater will telefonisch oder
   * per Mail erreichbar sein, daher jeweils abschaltbar. Der Name gehört
   * immer dazu, wenn die Zeile überhaupt erscheint.
   */
  beratungQrKontaktZeigen: boolean;
  beratungQrKontaktTelefon: boolean;
  beratungQrKontaktEmail: boolean;
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
  /** CI-Farbe aus Schritt 1 - die Beitragsgrafik leitet ihre Segmentfarben daraus ab */
  designColor: string;
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
  }, campaign.designColor);

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

/**
 * Freischaltcode für die Anzeige auf Seite 2. Früher wurde bei 8 Zeichen ein
 * Leerzeichen nach dem vierten eingefügt ("AB12CD34" -> "AB12 CD34"); das ist
 * auf Wunsch entfallen, der Code steht jetzt unverändert da.
 */
function formatFreischaltcode(code: string): string {
  return code.trim();
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
    return `<div class="letterhead-bg"></div>`;
  }
  const justify =
    letterhead.position === "left"
      ? "flex-start"
      : letterhead.position === "right"
        ? "flex-end"
        : "center";
  return `<div class="logo-header" style="justify-content:${justify}"><div class="logo-bild"></div></div>`;
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
    designColor: config.designColor,
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
    ${
      // Auslandsanschrift: Staat als eigene letzte Zeile in Grossbuchstaben
      // (DIN 5008). Bei Inlandsanschriften bleibt die Zeile weg - dort gehoert
      // schlicht kein Staat hin.
      recipient.staat ? `<div class="staat">${escapeHtml(recipient.staat)}</div>` : ""
    }
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
  const overlay = config.overlayZeigen
    ? overlayZeilen(config.overlayText, config.duSieMode)
    : [];
  const t = seite2Texte(config.duSieMode);

  return `
<section class="page page2">
  <div class="page2-header">
    <div class="page2-foto"></div>
    ${
      overlay.length > 0
        ? `<div class="page2-overlay">${overlay.map((z) => `<div>${escapeHtml(z)}</div>`).join("")}</div>`
        : ""
    }
  </div>

  <div class="page2-body">
    <h2 class="p2-title">Login Daten für: ${escapeHtml(recipient.vorname)} ${escapeHtml(recipient.nachname)}</h2>

    <div class="p2-split">
      <div class="p2-col">
        <span class="p2-pill" style="background:${color}">1a</span>
        <strong class="p2-col-title">Starten des Prozesses per Browser</strong>
        <p>${escapeHtml(t.browserHinweis)} <span class="p2-link" style="color:${color}">${url}</span></p>
      </div>
      <div class="p2-col">
        <span class="p2-pill" style="background:${color}">1b</span>
        <strong class="p2-col-title">Oder mit Hilfe des QR-Codes</strong>
        <p>${escapeHtml(t.qrHinweis)}</p>
      </div>
      <div class="p2-qr">
        <div class="p2-qr-bild"></div>
      </div>
    </div>

    <div class="p2-divider" style="border-color:${color}">
      <span class="p2-info-pill" style="background:${color}">i</span>
      <span class="p2-info-text">${escapeHtml(t.systemHinweis)}</span>
    </div>

    <div class="p2-step">
      <div class="p2-icon">${monitorIconSvg("info", color)}</div>
      <div class="p2-connector" style="border-color:${color}"></div>
      <div class="p2-step-body">
        ${
          config.zugangsdatenZeigen
            ? `<div><span class="p2-pill p2-pill-inline" style="background:${color}">2.</span><strong>${escapeHtml(t.zugangsdatenTitel)}</strong></div>
        <p>${escapeHtml(t.zugangsdatenText)}</p>
        <div class="p2-zugangsdaten">
          <div><span class="p2-zd-label">${escapeHtml(t.nutzernameLabel)}:</span><span class="p2-zd-wert" style="color:${color}">${escapeHtml(recipient.nutzername)}</span></div>
          <div><span class="p2-zd-label">${escapeHtml(t.passwortLabel)}:</span><span class="p2-zd-wert" style="color:${color}">${escapeHtml(recipient.portalpasswort)}</span></div>
        </div>`
            : `<div><span class="p2-pill p2-pill-inline" style="background:${color}">2.</span><strong>Allgemeine Informationen</strong></div>
        <p>${escapeHtml(t.schritt2Text)}</p>`
        }
      </div>
    </div>

    <div class="p2-step">
      <div class="p2-icon">${monitorIconSvg("euro", color)}</div>
      <div class="p2-connector" style="border-color:${color}"></div>
      <div class="p2-step-body">
        <div><span class="p2-pill p2-pill-inline" style="background:${color}">3.</span><strong>${escapeHtml(t.schritt3Titel)}</strong></div>
        <p>${escapeHtml(t.schritt3Text)}</p>
      </div>
      <div class="p2-code-box">
        <div class="p2-code-label">${t.codeLabel}</div>
        <div class="p2-code-value">${escapeHtml(code)}</div>
      </div>
    </div>

    <div class="p2-step">
      <div class="p2-icon">${monitorIconSvg("check", color)}</div>
      <div class="p2-connector" style="border-color:${color}"></div>
      <div class="p2-step-body">
        <div><strong>Unsere Plattform mit drei einfachen Schritten auf jedem Endgerät nutzen</strong></div>
        <p>${escapeHtml(t.schritt4Text)}</p>
      </div>
    </div>
${renderBeraterBlock(config)}
  </div>
</section>`;
}

/**
 * Optionaler Abschlussblock am Fuß von Seite 2: QR-Code zur persönlichen
 * Beratung. Bewusst in der Formensprache der übrigen Seite-2-Kästen (Rahmen in
 * der Design-Farbe) statt als Foto-Kachel - Seite 2 trägt oben schon ein großes
 * Bild, und diese Briefe werden in Stückzahl gedruckt.
 *
 * Name, Telefon und E-Mail stehen zusätzlich als Text daneben: wer den Brief
 * auf Papier ohne Handy in der Hand hält, käme mit einem QR-Code allein nicht
 * weiter.
 */
function renderBeraterBlock(config: LetterConfig): string {
  if (!config.beratungQrDataUrl) return "";

  const color = config.designColor;
  const ueberschrift =
    config.beratungQrUeberschrift.trim() || beratungQrStandardUeberschrift(config.duSieMode);
  const text = beratungQrStandardText(config.duSieMode);

  const kontakt = config.beratungQrKontaktZeigen
    ? [
        `${config.ansprechpartnerAnrede} ${config.ansprechpartnerName}`.trim(),
        config.beratungQrKontaktTelefon ? config.ansprechpartnerTelefon.trim() : "",
        config.beratungQrKontaktEmail ? config.ansprechpartnerEmail.trim() : "",
      ]
        .filter((t) => t !== "")
        .map(escapeHtml)
        .join(" &middot; ")
    : "";

  return `
    <div class="p2-berater" style="border-color:${color}">
      <div class="p2-berater-text">
        <div class="p2-berater-title" style="color:${color}">${escapeHtml(ueberschrift)}</div>
        <p>${escapeHtml(text)}</p>
        ${kontakt ? `<p class="p2-berater-kontakt">${kontakt}</p>` : ""}
      </div>
      <div class="p2-berater-qr"></div>
    </div>`;
}

/**
 * Die Bilder, die für ALLE Empfänger dieselben sind: Briefbogen bzw. Logo,
 * Headerfoto von Seite 2 und die beiden QR-Codes.
 *
 * Sie stehen hier genau einmal im Dokument, als Hintergrundbild einer
 * CSS-Klasse. Vorher trug jede Seite ihre eigene Kopie als data:-URI im
 * Markup - bei 300 Empfängern waren das rund 140 MB HTML, nur aus immer
 * demselben Foto und Logo. So viel Text nimmt Chromium nicht mehr an: der
 * Renderer stirbt beim Laden, und die Erzeugung bricht mit "Target closed" ab.
 * Seit die Bilder einmalig hier stehen, ist das HTML praktisch leer an Daten
 * und die Seitenzahl nahezu beliebig.
 *
 * Das Logo wird an der vom Nutzer gewählten Kante ausgerichtet - als
 * Hintergrundbild füllt es sonst mittig eine feste Box und läge nicht mehr dort,
 * wo es bei "oben links" liegen soll.
 */
function geteilteBilderCss(config: LetterConfig): string {
  const logoPosition =
    config.letterhead.mode === "logo"
      ? config.letterhead.position === "right"
        ? "right center"
        : config.letterhead.position === "center"
          ? "center"
          : "left center"
      : "left center";

  const regeln = [
    config.letterhead.mode === "image"
      ? `.letterhead-bg { background-image: url('${config.letterhead.dataUrl}'); }`
      : `.logo-bild { background-image: url('${config.letterhead.dataUrl}'); background-position: ${logoPosition}; }`,
    `.page2-foto { background-image: url('${config.page2PhotoDataUrl}'); }`,
    `.p2-qr-bild { background-image: url('${config.qrCodeDataUrl}'); }`,
    config.beratungQrDataUrl
      ? `.p2-berater-qr { background-image: url('${config.beratungQrDataUrl}'); }`
      : "",
  ];

  return regeln.filter((r) => r !== "").join("\n");
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
  /* Das Logo liegt als Hintergrundbild vor (siehe geteilteBilderCss): "contain"
     entspricht dem frueheren object-fit, die Position haelt es an der vom
     Nutzer gewaehlten Kante statt es in der 60-mm-Box zu zentrieren. */
  .logo-bild {
    height: 22mm;
    width: 60mm;
    background-size: contain;
    background-repeat: no-repeat;
  }

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
  /* Staat bei Auslandsanschriften - etwas abgesetzt und in Grossbuchstaben,
     damit er beim Sortieren sofort ins Auge faellt (DIN 5008). */
  .address-block .staat { margin-top: 1mm; font-weight: 700; letter-spacing: 0.3pt; }
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
  /* Aufzaehlungspunkte im gleichen Abstand wie Fliesstext-Zeilen (kein Extra-Rand). */
  .letter-body li { margin-bottom: 0; }
  .letter-body li p { margin: 0; }
  .letter-body svg { max-width: 100%; }
  /* Im Editor als "Standardfarbe" markierter Text. Der Farbwert steht bewusst
     nicht im Brieftext, sondern kommt hier aus der Design-Farbe dazu - so folgt
     einmal gefärbter Text einer späteren Änderung der Hausfarbe.
     Siehe lib/tiptap/standardfarbe.ts. */
  .letter-body [data-standardfarbe] { color: ${config.designColor}; }

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
  .page2-foto {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
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
  .p2-qr-bild {
    width: 100%;
    height: 100%;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }

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

  /* Optionaler Abschlussblock: QR-Code zur persönlichen Beratung.
     Rahmen in der Design-Farbe wie die Freischaltcode-Box darüber, damit sich
     der Block in die Formensprache von Seite 2 einfügt. */
  .p2-berater {
    display: flex;
    align-items: center;
    gap: 6mm;
    margin-top: 7mm;
    padding: 4mm 5mm;
    border: 1.2pt solid;
    border-radius: 2mm;
  }
  .p2-berater-text { flex: 1; }
  .p2-berater-title { font-size: 11pt; font-weight: 700; margin-bottom: 1.5mm; }
  .p2-berater-text p { margin: 0; }
  .p2-berater-kontakt { margin-top: 1.5mm; font-weight: 600; }
  /* Weißer Grund unter dem Code: QR-Leser brauchen den Kontrast, und der
     Rahmen darf nicht bis an die Module heranreichen. */
  /* Zugangsdaten unter Punkt 2: Beschriftung und Wert nebeneinander, die beiden
     Paare in einer Zeile - wie in der Vorlage des Kunden. */
  .p2-zugangsdaten {
    display: flex;
    gap: 14mm;
    margin-top: 2.5mm;
  }
  .p2-zd-label { font-weight: 700; margin-right: 2mm; }
  .p2-zd-wert { font-weight: 700; word-break: break-all; }

  .p2-berater-qr {
    flex-shrink: 0;
    width: 24mm;
    height: 24mm;
    background: #fff;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }
${geteilteBilderCss(config)}
</style>
</head>
<body>
${pages}
</body>
</html>`;
}
