import type { DuSieMode } from "@/lib/pdf/buildHtml";

/**
 * Optionaler zweiter QR-Code am Fuß von Seite 2: Weg zur persönlichen Beratung.
 *
 * Achtung, Seite 2 zeigt dann ZWEI QR-Codes (der erste führt zum
 * Beratungsvideo unter 1b). Beide brauchen deshalb eindeutige Überschriften,
 * sonst scannt man den falschen.
 *
 * Standardtexte hier zentral, damit die Eingabemaske denselben Text als
 * Platzhalter zeigt, den die PDF später einsetzt.
 */

export function beratungQrStandardUeberschrift(duSie: DuSieMode): string {
  return duSie === "du"
    ? "Hilfe durch deinen Berater gewünscht?"
    : "Hilfe durch Ihren Berater gewünscht?";
}

export function beratungQrStandardText(duSie: DuSieMode): string {
  return duSie === "du"
    ? "Scanne den QR-Code und vereinbare einen persönlichen Beratungstermin."
    : "Scannen Sie den QR-Code und vereinbaren Sie einen persönlichen Beratungstermin.";
}

/**
 * Ergänzt ein fehlendes Schema, damit ein QR-Code aus "beispiel.de/termin" auch
 * wirklich als Link geöffnet wird und nicht als reiner Text ankommt.
 */
export function normalisiereBeratungQrUrl(eingabe: string): string {
  const wert = eingabe.trim();
  if (wert === "") return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(wert)) return wert; // https:, mailto:, tel: … bleibt
  return `https://${wert}`;
}

/**
 * Prüft, ob daraus eine brauchbare URL wird - für Maske und API dieselbe Regel.
 *
 * Wichtig: `new URL()` allein reicht dafür NICHT. Die Browser-Implementierung
 * kodiert Leerzeichen im Host stillschweigend ("https://kaputt kaputt" wird zu
 * "https://kaputt%20kaputt/") und wirft nicht, Node wirft dagegen. Ohne die
 * eigenen Prüfungen unten wäre die Maske nachsichtiger als der Server: der
 * Nutzer sähe keine Warnung und liefe erst beim Erzeugen in einen Fehler.
 */
export function istBeratungQrUrlGueltig(eingabe: string): boolean {
  const wert = normalisiereBeratungQrUrl(eingabe);
  if (wert === "") return false;
  if (/\s/.test(wert)) return false; // in beiden Laufzeiten gleich behandelt

  let url: URL;
  try {
    url = new URL(wert);
  } catch {
    return false;
  }

  // Für Web-Adressen einen erreichbaren Hostnamen verlangen: ein einzelnes Wort
  // ohne Punkt ("https://kaputt") ergibt einen QR-Code, der ins Nichts führt.
  // localhost bleibt für Tests erlaubt, andere Schemata (mailto:, tel:) haben
  // keinen Host und werden hier nicht geprüft.
  if (url.protocol === "http:" || url.protocol === "https:") {
    if (url.hostname === "localhost") return true;
    return url.hostname.includes(".") && !url.hostname.startsWith(".") && !url.hostname.endsWith(".");
  }

  return true;
}
