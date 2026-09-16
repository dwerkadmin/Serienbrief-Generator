// Erzeugt die Mail-Fassung der sechs Standardmotive: 27 % niedriger, je zur
// Haelfte oben und unten weggeschnitten. Ergebnis liegt in
// public/stock-photos/mail/ und wird mit eingecheckt.
//
// Warum zugeschnittene Dateien statt CSS: In einer E-Mail laesst sich ein Bild
// nicht verlaesslich beschneiden - Outlook rendert mit der Word-Engine und
// ignoriert overflow:hidden. Und die Originale duerfen nicht angetastet
// werden, die braucht Seite 2 der PDF in voller Hoehe.
//
// Aufruf:  node scripts/stock-photos-mail-zuschnitt.mjs
import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";

/** Anteil der Hoehe, der insgesamt verschwindet - je zur Haelfte oben und unten. */
const ANTEIL_WEG = 0.27;

const QUELLE = "public/stock-photos";
const ZIEL = path.join(QUELLE, "mail");

const MOTIVE = [
  { datei: "1.png", typ: "png" },
  { datei: "2.png", typ: "png" },
  { datei: "3.png", typ: "png" },
  { datei: "4.jpg", typ: "jpg" },
  { datei: "5.jpg", typ: "jpg" },
  { datei: "6.jpg", typ: "jpg" },
];

fs.mkdirSync(ZIEL, { recursive: true });

for (const motiv of MOTIVE) {
  const bild = await loadImage(path.join(QUELLE, motiv.datei));

  const neueHoehe = Math.round(bild.height * (1 - ANTEIL_WEG));
  // Rest gleichmaessig auf oben und unten: bei ungerader Differenz faellt das
  // uebrige Pixel nach unten, das faellt niemandem auf.
  const obenWeg = Math.round((bild.height - neueHoehe) / 2);

  const leinwand = createCanvas(bild.width, neueHoehe);
  const ctx = leinwand.getContext("2d");
  ctx.drawImage(bild, 0, obenWeg, bild.width, neueHoehe, 0, 0, bild.width, neueHoehe);

  const daten =
    motiv.typ === "png" ? leinwand.toBuffer("image/png") : leinwand.toBuffer("image/jpeg", 88);
  fs.writeFileSync(path.join(ZIEL, motiv.datei), daten);

  console.log(
    `${motiv.datei}: ${bild.width}x${bild.height} -> ${bild.width}x${neueHoehe} ` +
      `(je ${obenWeg} px oben und ${bild.height - neueHoehe - obenWeg} px unten weg)`
  );
}
