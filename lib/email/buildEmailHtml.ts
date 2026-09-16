/**
 * Baut aus derselben Kampagne wie der Serienbrief eine E-Mail-Vorlage.
 *
 * Unterschiede zum Brief - bewusst und nicht versehentlich:
 *  - Kein Anschriftenblock. Eine E-Mail braucht keine Postanschrift des
 *    Empfängers, die Personalisierung beschränkt sich auf die Anredezeile.
 *  - Aus den beiden QR-Codes werden Schaltflächen. Wer die Mail liest, hat das
 *    Gerät schon in der Hand - ein QR-Code wäre hier ein Umweg.
 *  - Kein Briefbogen und kein Seiten-2-Foto aus dem Upload: E-Mail-Programme
 *    zeigen eingebettete data:-Bilder überwiegend nicht an. Logo und Kopfbild
 *    kommen deshalb als öffentlich erreichbare Bild-Adresse dazu oder
 *    entfallen.
 *  - Die Beitragsgrafik wird zur Tabelle (siehe lib/email/beitragsTabelle.ts).
 *
 * Aufbau bewusst altmodisch: verschachtelte Tabellen, feste Breiten,
 * ausschließlich Inline-Styles. Outlook rendert mit der Word-Engine und kennt
 * weder Flexbox noch Grid noch <style>-Regeln zuverlässig.
 */
import { beratungQrStandardUeberschrift } from "@/lib/beratungQr";
import { aktionsfarbeAusCi, hexZuHsl, hslZuHex, kontrastZuWeiss } from "@/lib/farbpalette";
import type { DuSieMode } from "@/lib/pdf/buildHtml";
import { buildBeitragsTabelle } from "@/lib/email/beitragsTabelle";
import { platzhalter, platzhalterUmschreiben, type PlatzhalterStil } from "@/lib/email/platzhalter";

const SCHRIFT = "'Open Sans', Arial, Helvetica, sans-serif";
const TEXT = "#2A2A2E";
const MUTED = "#6B7280";
const LINIE = "#DDE3EA";
const SEITE = "#EFF2F5";
const BREITE = 720;

/** Marke für die Beitragstabelle, solange der Fließtext noch umgebaut wird. */
const TABELLEN_MARKE = "@@BEITRAGSTABELLE@@";

export type EmailConfig = {
  designColor: string;
  duSieMode: DuSieMode;
  showHeadline: boolean;
  headlineText: string;
  /** Brieftext aus dem Editor, mit den üblichen {{…}}-Platzhaltern */
  bodyHtml: string;

  unternehmensname: string;

  /**
   * Fußzeile: Absender mit Kontaktdaten, frei eingegeben. Zeilenumbrüche
   * werden übernommen, E-Mail-Adressen darin verlinkt.
   */
  fusstext: string;
  /** Pflichtlinks unter dem Fußtext; leer = der jeweilige Link entfällt. */
  impressumUrl: string;
  datenschutzUrl: string;

  ansprechpartnerAnrede: string;
  ansprechpartnerName: string;
  ansprechpartnerTelefon: string;
  ansprechpartnerEmail: string;

  /** Ziel der Haupt-Schaltfläche (im Brief der QR-Code unter 1b) */
  beratungslinkUrl: string;
  /** Zweite Schaltfläche (im Brief der Beratungs-QR-Code am Fuß von Seite 2) */
  beratungQrAktiv: boolean;
  beratungQrUrl: string;
  beratungQrUeberschrift: string;
  beratungQrKontaktZeigen: boolean;
  beratungQrKontaktTelefon: boolean;
  beratungQrKontaktEmail: boolean;

  /** Öffentlich erreichbare Bild-Adressen; leer = das Element entfällt */
  logoUrl: string;
  headerBildUrl: string;

  /** Betreffzeile; leer = Vorschlag aus betreffVorschlag(). Steht als Titel und
   *  als Vorschautext (die Zeile, die im Posteingang hinter dem Betreff steht). */
  betreff: string;

  platzhalterStil: PlatzhalterStil;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Nur http(s), mailto und tel zulassen - alles andere wäre in einer Mail ein Warnsignal. */
function sichereUrl(url: string): string {
  const wert = url.trim();
  if (wert === "") return "";
  if (!/^(https?:|mailto:|tel:)/i.test(wert)) return "";
  return escapeHtml(wert);
}

/**
 * Schriftfarbe auf der CI-Farbe. Bei einer hellen CI-Farbe (z.B. Gelb) wäre
 * weißer Text auf der Schaltfläche unlesbar - dann dunkel schreiben.
 */
function schriftAufFarbe(ciFarbe: string): string {
  return kontrastZuWeiss(ciFarbe) >= 3 ? "#ffffff" : "#1A1A1A";
}

/**
 * Schaltfläche, die auch in Outlook wie eine Schaltfläche aussieht: Füllfarbe
 * und Innenabstand sitzen auf der Tabellenzelle, nicht auf dem Link - Outlook
 * ignoriert Innenabstände auf Inline-Elementen und die Fläche fiele sonst auf
 * die reine Textbreite zusammen.
 */
function schaltflaeche(url: string, beschriftung: string, ciFarbe: string): string {
  const ziel = sichereUrl(url);
  if (ziel === "") return "";
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
  <tr><td align="center" bgcolor="${ciFarbe}" style="border-radius:6px;padding:14px 30px;">
    <a href="${ziel}" target="_blank" rel="noopener" style="display:inline-block;font-family:${SCHRIFT};font-size:16px;font-weight:700;line-height:20px;color:${schriftAufFarbe(ciFarbe)};text-decoration:none;">${escapeHtml(beschriftung)}</a>
  </td></tr>
</table>`;
}

/**
 * Macht den Editor-Text E-Mail-tauglich: Inline-Styles auf jedes Element, weil
 * E-Mail-Programme <style>-Regeln teils verwerfen.
 */
function fliesstextAufbereiten(html: string, ciFarbe: string): string {
  const stile: Record<string, string> = {
    p: `margin:0 0 14px 0;font-family:${SCHRIFT};font-size:15px;line-height:1.55;color:${TEXT};`,
    ul: "margin:0 0 14px 0;padding:0 0 0 22px;",
    ol: "margin:0 0 14px 0;padding:0 0 0 22px;",
    li: `margin:0 0 4px 0;font-family:${SCHRIFT};font-size:15px;line-height:1.55;color:${TEXT};`,
    h1: `margin:0 0 12px 0;font-family:${SCHRIFT};font-size:22px;line-height:1.3;color:${TEXT};`,
    h2: `margin:0 0 12px 0;font-family:${SCHRIFT};font-size:19px;line-height:1.3;color:${TEXT};`,
    h3: `margin:0 0 10px 0;font-family:${SCHRIFT};font-size:17px;line-height:1.3;color:${TEXT};`,
    a: `color:${ciFarbe};text-decoration:underline;`,
  };

  // Zeilenhöhe aus dem Editor verwerfen. Variante C stellt für den Brief 1,15
  // ein, damit Text und Beitragsgrafik zusammen auf die erste Seite passen -
  // eine reine Papier-Einschränkung. In der Mail gibt es keine Seitengrenze,
  // und so eng gesetzter Text liest sich am Bildschirm schlecht.
  let ergebnis = html.replace(/style="([^"]*)"/gi, (_treffer, inhalt: string) => {
    const gefiltert = inhalt
      .split(";")
      .filter((d) => !/^\s*line-height\s*:/i.test(d))
      .join(";");
    return `style="${gefiltert}"`;
  });

  ergebnis = ergebnis.replace(
    /<(p|ul|ol|li|h1|h2|h3|a)(\s[^>]*)?>/gi,
    (_treffer, tag: string, attribute: string | undefined) => {
      const basis = stile[tag.toLowerCase()] ?? "";
      const attr = attribute ?? "";
      // Styles aus dem Editor (Ausrichtung, Zeilenhöhe) sollen die Grundwerte
      // überschreiben dürfen und stehen deshalb hinter ihnen.
      if (/\sstyle\s*=\s*"/i.test(attr)) {
        return `<${tag}${attr.replace(/\sstyle\s*=\s*"/i, ` style="${basis}`)}>`;
      }
      return `<${tag}${attr} style="${basis}">`;
    }
  );

  // Der Editor verpackt Listeninhalte zusätzlich in <p>. Deren Absatzabstand
  // würde die Aufzählung unnötig auseinanderziehen.
  ergebnis = ergebnis.replace(/<li\b[^>]*>[\s\S]*?<\/li>/gi, (block) =>
    block.replace(/margin:0 0 14px 0;/g, "margin:0;")
  );

  return ergebnis;
}

/**
 * Vorgeschlagene Betreffzeile. Bewusst unabhängig von der Überschrift des
 * Anschreibens: die ist eine Werbeaussage ("Warum Geld verschenken?") und liest
 * sich im Posteingang wie Reklame. Der Betreff benennt stattdessen, was in der
 * Mail steckt - das ist die Zeile, die über das Öffnen entscheidet.
 */
export function betreffVorschlag(duSie: DuSieMode): string {
  return duSie === "du"
    ? "Dein Zugang für die digitale Altersvorsorge"
    : "Ihr Zugang für die digitale Altersvorsorge";
}

/**
 * Kopf der Mail: zuerst das Unternehmenslogo auf weißem Grund, darunter das
 * Kopfbild über die volle Breite. Reihenfolge wie beim Briefbogen - der
 * Absender steht oben, das Motiv ist Beiwerk.
 */
function kopfbereich(config: EmailConfig): string {
  const bild = sichereUrl(config.headerBildUrl);
  const logo = sichereUrl(config.logoUrl);

  const logoZeile = logo
    ? `<tr><td class="rand" style="padding:28px 40px ${bild ? "24px" : "0"} 40px;"><img src="${logo}" alt="${escapeHtml(config.unternehmensname)}" style="display:block;max-height:64px;max-width:240px;height:auto;border:0;" /></td></tr>`
    : "";

  const bildZeile = bild
    ? `<tr><td style="padding:0;font-size:0;line-height:0;"><img src="${bild}" width="${BREITE}" alt="" style="display:block;width:100%;max-width:${BREITE}px;height:auto;border:0;" /></td></tr>`
    : "";

  return logoZeile + bildZeile;
}

function ueberschrift(config: EmailConfig): string {
  if (!config.showHeadline || config.headlineText.trim() === "") return "";
  const zeilen = config.headlineText
    .split("\n")
    .map((z) => escapeHtml(z.trim()))
    .filter((z) => z !== "")
    .join("<br />");
  return `<tr><td class="rand" style="padding:28px 40px 4px 40px;font-family:${SCHRIFT};font-size:26px;line-height:1.25;font-weight:700;color:${config.designColor};">${zeilen}</td></tr>`;
}

/**
 * Der Zugangsblock ersetzt die komplette zweite Briefseite. Er ist bewusst der
 * auffälligste Teil der Mail: eine Fläche in der CI-Farbe, darauf die
 * Schaltfläche im Gegenton (siehe aktionsfarbeAusCi) - das ist der eine Klick,
 * auf den es in dieser Mail ankommt.
 *
 * Die Adresse steht als grauer Text unter der Fläche, nicht darauf: manche
 * Firmen-Postfächer schreiben Links um oder zeigen Schaltflächen nicht an, und
 * Kleintext liest sich auf Weiß besser als auf Farbe.
 */
function zugangsblock(config: EmailConfig): string {
  const du = config.duSieMode === "du";
  const ziel = sichereUrl(config.beratungslinkUrl);
  const code = platzhalter("Freischaltcode", config.platzhalterStil);
  const ci = config.designColor;
  const aktion = aktionsfarbeAusCi(ci);
  const auffarbe = schriftAufFarbe(ci);

  // Abgestufter Ton für Vorspann und Schrittmarken: auf einer dunklen CI-Fläche
  // ein heller Ton, auf einer hellen ein dunkler - sonst verschwindet er.
  const basis = hexZuHsl(ci);
  const nebenton = hslZuHex({
    h: basis.h,
    s: Math.min(basis.s, 0.5),
    l: auffarbe === "#ffffff" ? 0.84 : 0.3,
  });

  const titel = du ? "Dein Zugang zur persönlichen Beratung" : "Ihr Zugang zur persönlichen Beratung";
  const vorspann = du
    ? "Zwei Schritte, fünf Minuten - danach weißt du centgenau, was deine Betriebsrente bringt."
    : "Zwei Schritte, fünf Minuten - danach wissen Sie centgenau, was Ihre Betriebsrente bringt.";
  const codeTitel = du ? "Schritt 2 · Dein Freischaltcode" : "Schritt 2 · Ihr Freischaltcode";

  const schrittMarke = (text: string) =>
    `<tr><td align="center" style="padding:0 0 12px 0;font-family:${SCHRIFT};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${nebenton};">${escapeHtml(text)}</td></tr>`;

  const knopf = ziel
    ? schrittMarke("Schritt 1 · Start des Prozesses") +
      `<tr><td align="center" style="padding:0 0 30px 0;">${schaltflaeche(
        config.beratungslinkUrl,
        "Jetzt beraten lassen →",
        aktion
      )}</td></tr>`
    : "";

  const hinweis = ziel
    ? `<tr><td class="rand" align="center" style="padding:12px 40px 0 40px;font-family:${SCHRIFT};font-size:12px;line-height:1.5;color:${MUTED};">Falls die Schaltfläche nicht funktioniert: <a href="${ziel}" target="_blank" rel="noopener" style="color:${MUTED};">${ziel}</a></td></tr>`
    : "";

  return `<tr><td class="rand" style="padding:14px 40px 0 40px;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;background-color:${ci};border-radius:10px;">
    <tr><td bgcolor="${ci}" style="padding:32px 28px 34px 28px;border-radius:10px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;">
        <tr><td align="center" style="padding:0 0 8px 0;font-family:${SCHRIFT};font-size:23px;line-height:1.25;font-weight:700;color:${auffarbe};">${escapeHtml(titel)}</td></tr>
        <tr><td align="center" style="padding:0 0 26px 0;font-family:${SCHRIFT};font-size:14px;line-height:1.55;color:${nebenton};">${escapeHtml(vorspann)}</td></tr>
        ${knopf}
        ${schrittMarke(codeTitel)}
        <tr><td align="center" style="padding:0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
            <tr><td align="center" bgcolor="#FFFFFF" style="border-radius:8px;padding:14px 30px;font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:700;letter-spacing:3px;color:${ci};">${code}</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>
${hinweis}`;
}

/** Zweite Schaltfläche: persönlicher Beratungstermin (im Brief der untere QR-Code). */
function beratungsblock(config: EmailConfig): string {
  if (!config.beratungQrAktiv) return "";
  const ziel = sichereUrl(config.beratungQrUrl);
  if (ziel === "") return "";

  const du = config.duSieMode === "du";
  const titel = config.beratungQrUeberschrift.trim() || beratungQrStandardUeberschrift(config.duSieMode);
  const text = du
    ? "Vereinbare hier direkt einen persönlichen Beratungstermin."
    : "Vereinbaren Sie hier direkt einen persönlichen Beratungstermin.";

  // Ohne Namen bliebe von der Kontaktzeile nur die Anrede übrig ("Frau") - dann
  // lieber ganz weglassen.
  const name = config.ansprechpartnerName.trim();
  const kontakt = config.beratungQrKontaktZeigen
    ? [
        name === "" ? "" : `${config.ansprechpartnerAnrede} ${name}`.trim(),
        config.beratungQrKontaktTelefon ? config.ansprechpartnerTelefon.trim() : "",
        config.beratungQrKontaktEmail ? config.ansprechpartnerEmail.trim() : "",
      ]
        .filter((t) => t !== "")
        .map(escapeHtml)
        .join(" &middot; ")
    : "";

  return `<tr><td class="rand" style="padding:22px 40px 0 40px;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;border:1px solid ${config.designColor};border-radius:8px;">
    <tr><td style="padding:22px 24px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:0 0 6px 0;font-family:${SCHRIFT};font-size:16px;font-weight:700;color:${config.designColor};">${escapeHtml(titel)}</td></tr>
        <tr><td style="padding:0 0 16px 0;font-family:${SCHRIFT};font-size:14px;line-height:1.55;color:${TEXT};">${escapeHtml(text)}</td></tr>
        <tr><td style="padding:0 0 ${kontakt ? "14px" : "0"} 0;">${schaltflaeche(config.beratungQrUrl, "Beratungstermin vereinbaren", config.designColor)}</td></tr>
        ${kontakt ? `<tr><td style="font-family:${SCHRIFT};font-size:13px;line-height:1.5;color:${MUTED};">${kontakt}</td></tr>` : ""}
      </table>
    </td></tr>
  </table>
</td></tr>`;
}

/**
 * Macht E-Mail-Adressen im Fußtext anklickbar. Telefonnummern bleiben Text:
 * ihre Schreibweisen sind zu vielfältig, um sie verlässlich zu erkennen, und
 * ein falsch zerlegter Anruf-Link wäre schlimmer als gar keiner.
 * Läuft auf bereits escapetem Text - deshalb kein erneutes Escapen.
 */
function mailadressenVerlinken(escapterText: string): string {
  return escapterText.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    (adresse) => `<a href="mailto:${adresse}" style="color:${MUTED};text-decoration:underline;">${adresse}</a>`
  );
}

/**
 * Fuß der Mail: frei eingegebene Absenderangaben plus die beiden Pflichtlinks.
 *
 * Bewusst Freitext statt aus den Einzelfeldern zusammengebaut: was hier stehen
 * muss, hängt an der Rechtsform des Absenders (Registergericht, Geschäftsführer,
 * USt-IdNr.) und ist von Kunde zu Kunde verschieden. Vorbelegt wird er in der
 * Maske mit der Absenderzeile, von da an gehört er dem Nutzer.
 */
function fussbereich(config: EmailConfig): string {
  const zeilen = config.fusstext
    .split("\n")
    .map((z) => z.trim())
    .filter((z) => z !== "")
    .map((z) => mailadressenVerlinken(escapeHtml(z)))
    .join("<br />");

  const rechtslinks = [
    { url: config.impressumUrl, text: "Impressum" },
    { url: config.datenschutzUrl, text: "Datenschutz" },
  ]
    .map(({ url, text }) => {
      const ziel = sichereUrl(url);
      return ziel === ""
        ? ""
        : `<a href="${ziel}" target="_blank" rel="noopener" style="color:${MUTED};text-decoration:underline;">${text}</a>`;
    })
    .filter((t) => t !== "")
    .join(" &middot; ");

  // Ohne Inhalt bliebe nur eine Trennlinie mit Leerraum unter der Mail stehen.
  if (zeilen === "" && rechtslinks === "") return "";

  return `<tr><td class="rand" style="padding:28px 40px 34px 40px;border-top:1px solid ${LINIE};font-family:${SCHRIFT};font-size:12px;line-height:1.7;color:${MUTED};">
  ${zeilen}
  ${rechtslinks ? `<div style="padding-top:${zeilen ? "12px" : "0"};">${rechtslinks}</div>` : ""}
</td></tr>`;
}

/** Vollständige, versandfertige HTML-Mail. */
export function buildEmailHtml(config: EmailConfig): string {
  const stil = config.platzhalterStil;

  // Die Beitragsgrafik zuerst aus dem Fließtext nehmen: eine Tabelle darf nicht
  // in einem <p> stehen, und die Stil-Ersetzung würde ihre eigenen Tags sonst
  // mit Absatz-Styles überschreiben.
  let text = config.bodyHtml
    .replace(/<p[^>]*>\s*\{\{\s*Beitragsgrafik\s*\}\}\s*<\/p>/gi, TABELLEN_MARKE)
    .replace(/\{\{\s*Beitragsgrafik\s*\}\}/gi, TABELLEN_MARKE);

  // Kampagnenweite Felder sind für alle Empfänger gleich - sie werden hier fest
  // eingesetzt und nicht als Kontakt-Attribut nach außen gereicht.
  text = text
    .replace(/\{\{\s*Unternehmensname\s*\}\}/g, escapeHtml(config.unternehmensname))
    .replace(/\{\{\s*AnsprechpartnerAnrede\s*\}\}/g, escapeHtml(config.ansprechpartnerAnrede))
    .replace(/\{\{\s*AnsprechpartnerName\s*\}\}/g, escapeHtml(config.ansprechpartnerName))
    .replace(/\{\{\s*AnsprechpartnerTelefon\s*\}\}/g, escapeHtml(config.ansprechpartnerTelefon))
    .replace(/\{\{\s*AnsprechpartnerEmail\s*\}\}/g, escapeHtml(config.ansprechpartnerEmail));

  text = platzhalterUmschreiben(text, stil);
  text = fliesstextAufbereiten(text, config.designColor);
  text = text.split(TABELLEN_MARKE).join(buildBeitragsTabelle(config.designColor, config.duSieMode, stil));

  const vorschau = escapeHtml(config.betreff.trim() || betreffVorschlag(config.duSieMode));

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="de">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no" />
<title>${vorschau}</title>
<!--[if mso]>
<style type="text/css">
  body, table, td, a, span, strong { font-family: Arial, Helvetica, sans-serif !important; }
  table { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse; }
</style>
<![endif]-->
<style type="text/css">
  html, body { margin:0 !important; padding:0 !important; width:100% !important; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
  /* Unter 720px wird der Rahmen auf volle Breite gezogen - sonst bekommen
     Handys eine waagerechte Bildlaufleiste. */
  @media only screen and (max-width:720px) {
    .rahmen { width:100% !important; }
    .rand { padding-left:20px !important; padding-right:20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${SEITE};">
<div style="display:none;font-size:0;line-height:0;max-height:0;overflow:hidden;mso-hide:all;">${vorschau}</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;background-color:${SEITE};">
<tr><td align="center" style="padding:24px 12px;">

<table role="presentation" class="rahmen" border="0" cellpadding="0" cellspacing="0" width="${BREITE}" style="width:${BREITE}px;max-width:${BREITE}px;border-collapse:collapse;background-color:#FFFFFF;border-radius:10px;">
${kopfbereich(config)}
${ueberschrift(config)}
<tr><td class="rand" style="padding:18px 40px 6px 40px;font-family:${SCHRIFT};font-size:15px;line-height:1.55;color:${TEXT};">
${text}
</td></tr>
${zugangsblock(config)}
${beratungsblock(config)}
${fussbereich(config)}
</table>

</td></tr>
</table>
</body>
</html>`;
}
