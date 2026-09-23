// Prueft, dass im Editor als "Standardfarbe" markierter Text in der PDF
// tatsaechlich in der Design-Farbe erscheint - und ohne Markierung nicht.
//
// Gemessen wird am Bild, nicht am HTML: der Farbwert steht absichtlich nicht im
// Brieftext, sondern kommt erst ueber eine CSS-Regel dazu. Ob die greift, zeigt
// nur die fertige Seite. Die Design-Farbe ist dafuer ein grelles Rot, das sonst
// nirgends auf Seite 1 vorkommt; die Ueberschrift ist abgeschaltet.
//
// Aufruf (Dev-Server muss laufen):  node scripts/test-standardfarbe.mjs
import fs from "node:fs";
import { renderFirstPdfPageToPng } from "../lib/pdf/letterheadToImage.ts";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3002";
const FARBE = { r: 255, g: 0, b: 0 };
const FARBE_HEX = "#FF0000";

function appPasswort() {
  if (process.env.TEST_PASSWORD) return process.env.TEST_PASSWORD;
  const treffer = fs.readFileSync(".env.local", "utf8").match(/^APP_PASSWORD=(.*)$/m);
  if (!treffer) throw new Error("APP_PASSWORD steht nicht in .env.local");
  return treffer[1].trim();
}

const login = await fetch(`${BASE}/api/auth`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ password: appPasswort() }),
});
if (!login.ok) throw new Error(`Anmeldung fehlgeschlagen (${login.status})`);
const cookie = login.headers.getSetCookie?.().join("; ") ?? login.headers.get("set-cookie") ?? "";

const CSV = "Vorname,Nachname,Strasse,PLZ,Ort,Freischaltcode\nEva,Muster,Hauptstr. 1,12345,Musterstadt,ABCD1234\n";

async function erzeuge(bodyHtml) {
  const fd = new FormData();
  fd.set("letterheadMode", "logo");
  fd.set("logoFile", new Blob([fs.readFileSync("public/brand/dwerk-logo.jpg")], { type: "image/jpeg" }), "logo.jpg");
  fd.set("logoPosition", "left");
  fd.set("designColor", FARBE_HEX);
  fd.set("absenderUnternehmensname", "Musterwerk GmbH");
  fd.set("absenderStrasse", "Industriestr. 4");
  fd.set("absenderPlz", "12345");
  fd.set("absenderOrt", "Musterstadt");
  fd.set("absenderAusCsv", "false");
  fd.set("bodyHtml", bodyHtml);
  fd.set("showHeadline", "false");
  fd.set("headlineText", "");
  fd.set("showDate", "false");
  fd.set("dateMonthOffset", "0");
  fd.set("duSieMode", "sie");
  fd.set("fontId", "inter");
  fd.set("fontSizePt", "10.5");
  fd.set("ansprechpartnerAnrede", "Frau");
  fd.set("ansprechpartnerName", "Eva Beispiel");
  fd.set("ansprechpartnerTelefon", "0123 456");
  fd.set("ansprechpartnerEmail", "eva@example.de");
  fd.set("photoMode", "stock");
  fd.set("stockPhotoId", "1");
  fd.set("overlayZeigen", "false");
  fd.set("beratungslinkSubdomain", "muster");
  fd.set("beratungslinkDomain", "unserebav.de");
  fd.set("beratungQrAktiv", "false");
  fd.set("csvFile", new Blob([CSV], { type: "text/csv" }), "test.csv");
  fd.set("mapping", JSON.stringify({
    vorname: "Vorname", nachname: "Nachname", strasse: "Strasse",
    plz: "PLZ", ort: "Ort", freischaltcode: "Freischaltcode",
  }));
  fd.set("anredezeileConfig", JSON.stringify({ mode: "auto", template: "liebe-vorname" }));

  const res = await fetch(`${BASE}/api/generate`, { method: "POST", headers: { cookie }, body: fd });
  if (!res.ok) throw new Error(`Erzeugen fehlgeschlagen (${res.status}): ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Zaehlt deutlich rote Pixel auf Seite 1. */
async function roteFlaeche(pdf) {
  const png = await renderFirstPdfPageToPng(pdf);
  const bild = await loadImage(png);
  const leinwand = createCanvas(bild.width, bild.height);
  const ctx = leinwand.getContext("2d");
  ctx.drawImage(bild, 0, 0);
  const { data } = ctx.getImageData(0, 0, bild.width, bild.height);

  let treffer = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > FARBE.r - 60 && data[i + 1] < 90 && data[i + 2] < 90) treffer++;
  }
  return treffer;
}

const SATZ = "Dieser Satz steht in der Standardfarbe und wird gemessen.";
const mitMarkierung = `<p>{{Anredezeile}}</p><p><span data-standardfarbe="">${SATZ}</span></p>`;
const ohneMarkierung = `<p>{{Anredezeile}}</p><p>${SATZ}</p>`;

const mit = await roteFlaeche(await erzeuge(mitMarkierung));
const ohne = await roteFlaeche(await erzeuge(ohneMarkierung));

console.log(`rote Pixel mit Markierung:  ${mit}`);
console.log(`rote Pixel ohne Markierung: ${ohne}`);

const okMit = mit > 200;
const okOhne = ohne === 0;
if (okMit && okOhne) {
  console.log("\nOK - markierter Text erscheint in der Design-Farbe, unmarkierter nicht.");
  process.exit(0);
}
if (!okMit) console.error("\nFEHLER: markierter Text ist nicht in der Design-Farbe gesetzt.");
if (!okOhne) console.error("\nFEHLER: auch ohne Markierung ist Farbe auf der Seite.");
process.exit(1);
