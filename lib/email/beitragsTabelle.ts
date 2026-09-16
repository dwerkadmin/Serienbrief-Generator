/**
 * Die Beitragsgrafik als E-Mail-taugliche Tabelle.
 *
 * In der PDF ist {{Beitragsgrafik}} ein Donut-Diagramm als Inline-SVG. In
 * E-Mails geht das nicht: Gmail, Outlook und die meisten Web-Clients entfernen
 * SVG ersatzlos - der Platz bliebe einfach leer. Ein PNG wäre die Alternative,
 * müsste aber je Empfänger erzeugt und irgendwo öffentlich abgelegt werden;
 * bei einem Newsletter-Versand über eine Kontaktliste ist das nicht machbar.
 *
 * Deshalb hier dieselben Zahlen als Tabelle mit farbigen Markern - das rendert
 * in jedem E-Mail-Programm identisch und bleibt personalisierbar, weil in den
 * Wertespalten Platzhalter statt fester Beträge stehen können.
 *
 * Aus "Steuer- und Sozialversicherungsersparnisse" (in der PDF ein
 * zusammengefasster Wert) werden hier zwei Zeilen: ein Newsletter-Werkzeug
 * kann zwei Kontakt-Attribute nicht addieren.
 */
import { beitragsfarbenAusCi } from "@/lib/farbpalette";
import type { DuSieMode } from "@/lib/pdf/buildHtml";
import { platzhalter, type PlatzhalterStil } from "@/lib/email/platzhalter";

const TEXT = "#2A2A2E";
const MUTED = "#6B7280";
const LINIE = "#DDE3EA";
const SCHRIFT = "'Open Sans', Arial, Helvetica, sans-serif";

function zelle(inhalt: string, style: string): string {
  return `<td style="${style}">${inhalt}</td>`;
}

function zeile(farbe: string | null, label: string, wert: string, opts?: { fett?: boolean; zusatz?: string }): string {
  const marker = farbe
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="display:inline-block;vertical-align:middle;margin-right:8px;"><tr><td width="12" height="12" bgcolor="${farbe}" style="width:12px;height:12px;line-height:12px;font-size:0;border-radius:2px;">&nbsp;</td></tr></table>`
    : "";
  const gewicht = opts?.fett || farbe ? "700" : "400";
  const zusatz = opts?.zusatz
    ? `<span style="font-size:12px;font-weight:400;color:${MUTED};"> ${opts.zusatz}</span>`
    : "";
  return `<tr>
  ${zelle(`${marker}<span style="font-size:14px;font-weight:${gewicht};color:${TEXT};">${label}</span>${zusatz}`, `padding:7px 8px 7px 0;font-family:${SCHRIFT};`)}
  ${zelle(`<span style="font-size:14px;font-weight:700;color:${farbe ?? TEXT};white-space:nowrap;">${wert}</span>`, `padding:7px 0;text-align:right;font-family:${SCHRIFT};`)}
</tr>`;
}

function trenner(): string {
  return `<tr><td colspan="2" style="padding:4px 0;"><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="1" bgcolor="${LINIE}" style="height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr></table></td></tr>`;
}

/**
 * Baut die Tabelle. Die Beträge sind Platzhalter - welche Schreibweise,
 * entscheidet `stil` (siehe lib/email/platzhalter.ts).
 */
export function buildBeitragsTabelle(ciFarbe: string, duSie: DuSieMode, stil: PlatzhalterStil): string {
  const farben = beitragsfarbenAusCi(ciFarbe);
  const du = duSie === "du";
  const p = (feld: Parameters<typeof platzhalter>[0]) => platzhalter(feld, stil);

  const zeilen = [
    zeile(farben.eigenbeitrag, du ? "Dein monatlicher Eigenbeitrag" : "Ihr monatlicher Eigenbeitrag", p("Eigenbeitrag"), {
      zusatz: "(persönliches Beispiel)",
    }),
    zeile(farben.ersparnis, "Steuerersparnis", p("Steuerersparnis")),
    zeile(farben.ersparnis, "Sozialversicherungsersparnis", p("SvErsparnis")),
    trenner(),
    zeile(farben.agZuschuss, du ? "Dein Arbeitgeber zahlt für dich" : "Ihr Arbeitgeber zahlt für Sie", p("Arbeitgeberzuschuss")),
    trenner(),
    zeile(
      null,
      du
        ? "In deine betriebliche Altersvorsorge fließen monatlich insgesamt"
        : "In Ihre betriebliche Altersvorsorge fließen monatlich insgesamt",
      p("Gesamtbeitrag"),
      { fett: true }
    ),
  ].join("\n");

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:4px 0 8px 0;background-color:#F7F9FB;border:1px solid ${LINIE};border-radius:6px;">
<tr><td style="padding:14px 18px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;">
${zeilen}
</table>
</td></tr>
</table>`;
}
