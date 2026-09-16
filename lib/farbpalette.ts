/**
 * Leitet die drei Segmentfarben der Beitragsgrafik aus der CI-Farbe (Schritt 1)
 * ab, statt sie fest zu verdrahten.
 *
 * Zwei harte Anforderungen, die die Wahl bestimmen:
 *
 * 1. In den Ringsegmenten steht WEISSE Schrift, und die Legendenwerte stehen in
 *    Segmentfarbe auf Weiss. Jede Farbe muss daher genug Kontrast zu Weiss
 *    haben - sonst ist der Betrag im Druck nicht lesbar. Wir erzwingen
 *    mindestens 3:1 (WCAG-Schwelle für grosse/fette Schrift) und dunkeln
 *    notfalls ab, bis das erreicht ist.
 * 2. Die drei Segmente müssen sich klar unterscheiden lassen, auch bei einer
 *    grauen oder sehr blassen CI-Farbe. Daher eine Sättigungs-Untergrenze und
 *    ein fester Farbwinkel-Abstand für das Akzentsegment.
 *
 * Aufteilung (entspricht dem Aufbau der bisherigen, vom Kunden gelieferten
 * Referenzgrafik: helle Hauptfarbe / andersfarbiger Akzent / dunkle Variante):
 *   Eigenbeitrag   -> CI-Farbe selbst, etwas aufgehellt
 *   Ersparnis      -> Akzent, Farbwinkel um 85 Grad gedreht
 *   AG-Zuschuss    -> dunkle Variante der CI-Farbe
 */

export type Beitragsfarben = {
  eigenbeitrag: string;
  ersparnis: string;
  agZuschuss: string;
};

type Hsl = { h: number; s: number; l: number };

const HEX_RE = /^#([0-9a-f]{6})$/i;

export function hexZuHsl(hex: string): Hsl {
  const treffer = HEX_RE.exec(hex.trim());
  const wert = treffer ? treffer[1] : "1e6fa6"; // Vorgabe, falls unbrauchbar
  const r = parseInt(wert.slice(0, 2), 16) / 255;
  const g = parseInt(wert.slice(2, 4), 16) / 255;
  const b = parseInt(wert.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

export function hslZuHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.min(1, Math.max(0, s));
  const lig = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  const [r1, g1, b1] =
    hue < 60 ? [c, x, 0]
    : hue < 120 ? [x, c, 0]
    : hue < 180 ? [0, c, x]
    : hue < 240 ? [0, x, c]
    : hue < 300 ? [x, 0, c]
    : [c, 0, x];
  const zwei = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${zwei(r1)}${zwei(g1)}${zwei(b1)}`;
}

/** Relative Leuchtdichte nach WCAG. */
function leuchtdichte(hex: string): number {
  const treffer = HEX_RE.exec(hex.trim());
  const wert = treffer ? treffer[1] : "000000";
  const kanal = (i: number) => {
    const v = parseInt(wert.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * kanal(0) + 0.7152 * kanal(2) + 0.0722 * kanal(4);
}

/** Kontrastverhältnis zweier Farben nach WCAG (1 bis 21). */
export function kontrastZuWeiss(hex: string): number {
  return 1.05 / (leuchtdichte(hex) + 0.05);
}

/** Dunkelt eine Farbe so weit ab, bis weisse Schrift darauf das Mindestmass erreicht. */
function aufKontrastAbdunkeln(farbe: Hsl, mindest: number): string {
  let l = farbe.l;
  for (let i = 0; i < 60; i++) {
    const hex = hslZuHex({ ...farbe, l });
    if (kontrastZuWeiss(hex) >= mindest || l <= 0.04) return hex;
    l -= 0.015;
  }
  return hslZuHex({ ...farbe, l });
}

/** Mindestkontrast zu Weiss: 3:1, die WCAG-Schwelle für grosse bzw. fette Schrift. */
export const MINDESTKONTRAST = 3;

/** Farbwinkel der Vorgabefarbe - Rückfall, wenn die CI-Farbe grau/farblos ist. */
const VORGABE_WINKEL = hexZuHsl("#1E6FA6").h;

/**
 * Gelb- und Olivtöne (etwa 30 bis 95 Grad) wirken als Akzent schmutzig, sobald
 * man sie für weisse Schrift abdunkeln muss. Landet die Drehung dort, drehen
 * wir stattdessen in die Gegenrichtung.
 */
function akzentWinkel(basisWinkel: number): number {
  const normiere = (w: number) => ((w % 360) + 360) % 360;
  const gegenUhrzeiger = normiere(basisWinkel - 85);
  if (gegenUhrzeiger >= 30 && gegenUhrzeiger <= 95) return normiere(basisWinkel + 85);
  return gegenUhrzeiger;
}

export function beitragsfarbenAusCi(ciFarbe: string): Beitragsfarben {
  const basis = hexZuHsl(ciFarbe);

  // Bei einer grauen oder fast farblosen CI-Farbe gibt es keinen brauchbaren
  // Farbwinkel (Grau liefert 0 = Rot, was für eine Spargrafik unpassend wäre) -
  // dann auf den Blauton der Vorgabefarbe zurückfallen.
  const h = basis.s < 0.15 ? VORGABE_WINKEL : basis.h;

  // Untergrenze für die Sättigung: sonst wären alle drei Segmente grau.
  const s = Math.max(0.42, Math.min(0.85, basis.s < 0.15 ? 0.6 : basis.s));

  // Der Arbeitgeberzuschuss trägt die CI-Farbe selbst, der Eigenbeitrag die
  // dunkle Variante. Bewusst so herum: der Zuschuss ist die Botschaft des
  // Briefes und bekommt damit den Auftritt der Hausfarbe.
  const agZuschuss = aufKontrastAbdunkeln(
    { h, s, l: Math.min(0.58, Math.max(0.42, basis.l + 0.06)) },
    MINDESTKONTRAST
  );

  const ersparnis = aufKontrastAbdunkeln(
    { h: akzentWinkel(h), s: Math.max(0.5, s), l: 0.46 },
    MINDESTKONTRAST
  );

  // Dunkle Variante derselben Farbe. Sie teilt sich den Farbwinkel mit dem
  // Zuschuss-Segment, muss sich also über die Helligkeit absetzen - deshalb
  // hier ein garantierter Abstand statt eines festen Werts: musste die helle
  // Farbe zum Erreichen des Kontrasts selbst abgedunkelt werden, rutscht die
  // dunkle entsprechend mit.
  const hellAg = hexZuHsl(agZuschuss).l;
  const eigenbeitrag = aufKontrastAbdunkeln(
    { h, s: Math.min(0.8, s + 0.1), l: Math.max(0.12, Math.min(0.24, hellAg - 0.22)) },
    MINDESTKONTRAST
  );

  return { eigenbeitrag, ersparnis, agZuschuss };
}

/**
 * Farbe für die Handlungs-Schaltfläche in der E-Mail ("Jetzt beraten lassen").
 *
 * Sie liegt auf einer Fläche in der CI-Farbe und soll dort auffallen, ohne
 * fremd zu wirken - deshalb der Gegenton (Farbkreis um 180 Grad gedreht) mit
 * kräftigerer Sättigung. Zu einem Blau ergibt das ein warmes Orange, zu einem
 * Grün ein Magenta.
 *
 * Anders als die Segmentfarben der Beitragsgrafik wird hier bewusst NICHT nur
 * leicht gedreht: ein Nachbarton würde neben der CI-Farbe als Fehler gelesen,
 * nicht als Akzent.
 */
export function aktionsfarbeAusCi(ciFarbe: string): string {
  const basis = hexZuHsl(ciFarbe);
  const h = basis.s < 0.15 ? VORGABE_WINKEL : basis.h;
  let gegen = ((h + 180) % 360 + 360) % 360;

  // Landet der Gegenton im Gelb-/Olivbereich, wird er beim Abdunkeln
  // schmutzig - dann auf ein sattes Orange ausweichen.
  if (gegen >= 50 && gegen <= 95) gegen = 32;

  // Sättigung anheben: der Akzent darf deutlich kräftiger sein als die CI-Farbe.
  const s = Math.min(0.92, Math.max(0.62, basis.s + 0.2));
  return aufKontrastAbdunkeln({ h: gegen, s, l: 0.52 }, MINDESTKONTRAST);
}
