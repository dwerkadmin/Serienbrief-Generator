/**
 * Erzeugt die "Beitragsgrafik" (Donut-Diagramm: Eigenbeitrag / Steuer- und
 * SV-Ersparnis / Arbeitgeberzuschuss) für Anschreibentext Variante C - als
 * per-Empfänger generiertes Inline-SVG, eingesetzt über den Merge-Platzhalter
 * {{Beitragsgrafik}} (siehe applyMergeFields in lib/pdf/buildHtml.ts). Die
 * Zahlen kommen aus den passend gemappten dCRYPT-CSV-Spalten (Schritt 4,
 * siehe CHART_FIELDS in lib/csv/parseAddresses.ts) - typischerweise
 * A1-Nettoeigenanteil, A1-Steuerersparnis, A1-SVErsparnis, A1-AGZuschuss,
 * A1-Gesamtbeitrag (oder A2-/A3-Variante, je nach gewählter Beitragsstufe).
 *
 * Farben sind aus der vom Kunden gelieferten Referenzgrafik übernommen
 * (Grafik_Final_Netto_70_AG-Zuschuss 15prozent.png).
 */

export type BeitragsgrafikData = {
  eigenbeitrag: number;
  steuerErsparnis: number;
  svErsparnis: number;
  agZuschuss: number;
  gesamtbeitrag: number;
};

const COLOR_EIGENBEITRAG = "#5499DE"; // hellblau
const COLOR_ERSPARNIS = "#39D44E"; // grün
const COLOR_AGZUSCHUSS = "#20456C"; // dunkelblau/navy
const COLOR_TEXT = "#1A1A1A";
const COLOR_MUTED = "#5A5A5A";
const COLOR_DIVIDER = "#D8D8D8";

/** Wandelt eine deutsche Dezimalzahl ("70,00" oder "1.234,56") in eine Number um; leer/ungültig -> 0. */
export function parseGermanDecimal(value: string): number {
  const cleaned = value.trim().replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatEuro(n: number): string {
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG-Pfad für ein einzelnes Ring-Segment (Donut) zwischen zwei Winkeln (Grad, 0 = 12 Uhr, im Uhrzeigersinn). */
function donutSegmentPath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    // Ein einzelner SVG-Arc-Befehl kann keinen vollen 360°-Kreis zeichnen (Start- und
    // Endpunkt fallen zusammen) - daher bei "nur ein Segment hat einen Wert" in zwei
    // Halbkreis-Bögen aufteilen.
    const mid = startAngle + sweep / 2;
    return [
      donutSegmentPath(cx, cy, rOuter, rInner, startAngle, mid),
      donutSegmentPath(cx, cy, rOuter, rInner, mid, endAngle),
    ].join(" ");
  }
  const largeArc = sweep > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p3 = polarToCartesian(cx, cy, rInner, startAngle);
  const p4 = polarToCartesian(cx, cy, rInner, endAngle);
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/**
 * Baut das komplette Beitragsgrafik-SVG. Gibt "" zurück, wenn keine gültigen
 * (positiven) Beitragsdaten vorliegen - dann wird an der Platzhalter-Stelle
 * im Brieftext einfach nichts eingefügt, statt eine leere/kaputte Grafik.
 */
export function buildBeitragsgrafikSvg(data: BeitragsgrafikData): string {
  const eigenbeitrag = Math.max(0, data.eigenbeitrag);
  const ersparnis = Math.max(0, data.steuerErsparnis) + Math.max(0, data.svErsparnis);
  const agZuschuss = Math.max(0, data.agZuschuss);
  const entgeltumwandlung = eigenbeitrag + ersparnis;
  const ringTotal = eigenbeitrag + ersparnis + agZuschuss;
  if (ringTotal <= 0) return "";
  const gesamt = data.gesamtbeitrag > 0 ? data.gesamtbeitrag : entgeltumwandlung + agZuschuss;

  // Geometrie bewusst flach gehalten: das SVG steht mit width:100% in einem
  // 165 mm breiten Textblock (210 mm minus 25/20 mm Rand), die gedruckte Höhe
  // ist also immer Breite x viewBox-Verhältnis. Bei 900x220 sind das ~40 mm.
  const cx = 112;
  const cy = 110;
  const rOuter = 104;
  const rInner = 58;

  let angle = 0;
  const arcs = [
    { value: eigenbeitrag, color: COLOR_EIGENBEITRAG },
    { value: ersparnis, color: COLOR_ERSPARNIS },
    { value: agZuschuss, color: COLOR_AGZUSCHUSS },
  ]
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / ringTotal) * 360;
      const seg = { ...s, startAngle: angle, endAngle: angle + sweep, midAngle: angle + sweep / 2 };
      angle += sweep;
      return seg;
    });

  const ringPaths = arcs
    .map((a) => `<path d="${donutSegmentPath(cx, cy, rOuter, rInner, a.startAngle, a.endAngle)}" fill="${a.color}"/>`)
    .join("");

  const ringLabels = arcs
    .filter((a) => a.endAngle - a.startAngle > 22) // zu schmale Segmente -> Wert nur in der Legende
    .map((a) => {
      const p = polarToCartesian(cx, cy, (rOuter + rInner) / 2, a.midAngle);
      return `<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="#ffffff">${escapeXml(formatEuro(a.value))}</text>`;
    })
    .join("");

  // Der durch den kleineren Ring frei gewordene Platz geht an die Legende
  // (legendX weiter links, valueX weiter rechts). So bleibt für die Beschriftung
  // mehr Breite und die Schrift muss weniger stark schrumpfen.
  const legendX = 250;
  const valueX = 884;
  const rows: string[] = [];
  let y = 34;

  function legendRow(color: string | null, label: string, value: string, bold = false) {
    if (color) rows.push(`<rect x="${legendX}" y="${y - 12}" width="15" height="15" rx="2.5" fill="${color}"/>`);
    const weight = bold || color ? 700 : 400;
    rows.push(
      `<text x="${legendX + (color ? 25 : 0)}" y="${y}" font-size="13" font-weight="${weight}" fill="${COLOR_TEXT}">${escapeXml(label)}</text>`
    );
    rows.push(
      `<text x="${valueX}" y="${y}" text-anchor="end" font-size="13" font-weight="700" fill="${color ?? COLOR_TEXT}">${escapeXml(value)}</text>`
    );
  }

  function divider() {
    rows.push(`<line x1="${legendX}" y1="${y - 9}" x2="${valueX}" y2="${y - 9}" stroke="${COLOR_DIVIDER}" stroke-width="1.3"/>`);
  }

  legendRow(COLOR_EIGENBEITRAG, "Ihr monatlicher Eigenbeitrag", formatEuro(eigenbeitrag));
  y += 34;
  legendRow(COLOR_ERSPARNIS, "Steuer- und Sozialversicherungsersparnisse", formatEuro(ersparnis));
  y += 29;
  divider();
  y += 12;
  legendRow(null, "mtl. Entgeltumwandlung in €", formatEuro(entgeltumwandlung), true);
  y += 34;
  legendRow(COLOR_AGZUSCHUSS, "Ihr Arbeitgeber zahlt für Sie", formatEuro(agZuschuss));
  y += 29;
  divider();
  y += 19;
  rows.push(`<text x="${legendX}" y="${y}" font-size="13" font-weight="700" fill="${COLOR_TEXT}">In Ihre betriebliche Altersvorsorge fließen</text>`);
  y += 17;
  rows.push(`<text x="${legendX}" y="${y}" font-size="13" font-weight="700" fill="${COLOR_TEXT}">monatlich insgesamt</text>`);
  rows.push(
    `<text x="${valueX}" y="${y}" text-anchor="end" font-size="15" font-weight="700" fill="${COLOR_TEXT}">${escapeXml(formatEuro(gesamt))}</text>`
  );

  // viewBox-Höhe 220 statt 300: bei 165 mm Textbreite sind das ~40 mm statt
  // ~55 mm gedruckte Höhe. Ring (y 6..214) und Legende (Grundlinie bis 208)
  // passen beide hinein.
  return `<svg viewBox="0 0 900 220" style="width:100%;height:auto;display:block;margin:2mm 0 3mm 0;" xmlns="http://www.w3.org/2000/svg">
  ${ringPaths}
  ${ringLabels}
  <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="12" fill="${COLOR_MUTED}">Sparbetrag</text>
  <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="15" font-weight="700" fill="${COLOR_TEXT}">${escapeXml(formatEuro(gesamt))}</text>
  ${rows.join("\n  ")}
</svg>`;
}
