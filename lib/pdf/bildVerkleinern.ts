import { createCanvas, loadImage } from "@napi-rs/canvas";

/**
 * Verkleinert hochgeladene Bilder auf das, was der Druck tatsächlich braucht.
 *
 * Der Grund ist Rechenzeit, nicht Speicherplatz: Briefbogen und Headerfoto
 * liegen als Hintergrundbild je einer CSS-Klasse im Dokument, aber Chromium
 * skaliert sie trotzdem für JEDE Seite neu. Ein Foto mit 2000 x 1333 Pixeln hat
 * elfmal so viele Bildpunkte wie die mitgelieferten Standardmotive - bei 150
 * Empfängern wurde daraus das Vierfache an Zeit (38 statt 9 Sekunden), und bei
 * grösseren Paketen lief die Erzeugung ins Zeitlimit.
 *
 * 1240 Pixel Breite entsprechen rund 150 dpi auf A4-Breite - dieselbe Auflösung,
 * die auch der Weg über einen PDF-Briefbogen erzeugt (siehe
 * letterheadToImage.ts). Mehr bringt auf Papier nichts mehr.
 *
 * Bilder, die ohnehin kleiner sind, bleiben unangetastet: Hochrechnen würde sie
 * nur unschärfer machen.
 */
export const DRUCK_BREITE_PX = 1240;

export async function verkleinereFuerDruck(
  bild: Buffer,
  maxBreite = DRUCK_BREITE_PX
): Promise<{ daten: Buffer; mimeTyp: string; breite: number; hoehe: number; verkleinert: boolean }> {
  const img = await loadImage(bild);

  if (img.width <= maxBreite) {
    return { daten: bild, mimeTyp: "", breite: img.width, hoehe: img.height, verkleinert: false };
  }

  const faktor = maxBreite / img.width;
  const breite = Math.round(img.width * faktor);
  const hoehe = Math.round(img.height * faktor);

  const leinwand = createCanvas(breite, hoehe);
  leinwand.getContext("2d").drawImage(img, 0, 0, breite, hoehe);

  // JPEG statt PNG: Es geht um Fotos und gerasterte Briefbogen, da ist die
  // Dateigrösse bei gleicher Qualität ein Vielfaches kleiner - und die Datei
  // wandert als data:-URI durch das HTML.
  return {
    daten: leinwand.toBuffer("image/jpeg", 88),
    mimeTyp: "image/jpeg",
    breite,
    hoehe,
    verkleinert: true,
  };
}

/**
 * Der Kopf von Seite 2 ist 210 x 100 mm gross - bei 150 dpi also 1240 x 590
 * Pixel. Das Bild wird genau darauf gebracht, mittig zugeschnitten.
 *
 * Das ist derselbe Ausschnitt, den vorher "background-size: cover" im Browser
 * erzeugt hat - nur eben einmal hier statt auf jeder einzelnen Seite. Was
 * ausserhalb des Kastens lag, wurde ohnehin nie gedruckt.
 */
export const KOPFBILD_BREITE_PX = 1240;
export const KOPFBILD_HOEHE_PX = 590;

export async function verkleinereKopfbild(
  bild: Buffer
): Promise<{ daten: Buffer; mimeTyp: string } | null> {
  const img = await loadImage(bild);
  if (img.width <= KOPFBILD_BREITE_PX && img.height <= KOPFBILD_HOEHE_PX) return null;

  const leinwand = createCanvas(KOPFBILD_BREITE_PX, KOPFBILD_HOEHE_PX);
  const ctx = leinwand.getContext("2d");

  // "cover": der groessere der beiden Faktoren fuellt den Kasten vollstaendig,
  // der Ueberstand wird mittig abgeschnitten.
  const faktor = Math.max(KOPFBILD_BREITE_PX / img.width, KOPFBILD_HOEHE_PX / img.height);
  const breite = img.width * faktor;
  const hoehe = img.height * faktor;
  ctx.drawImage(img, (KOPFBILD_BREITE_PX - breite) / 2, (KOPFBILD_HOEHE_PX - hoehe) / 2, breite, hoehe);

  return { daten: leinwand.toBuffer("image/jpeg", 88), mimeTyp: "image/jpeg" };
}
