// Prueft den Schriftzug ueber dem Headerbild auf Seite 2 in drei Faellen:
// Standardtext, eigener Text, ganz ausgeblendet. Der Text wird dafuer aus der
// erzeugten PDF zurueckgelesen - eine PDF, die blosss entsteht, sagt noch
// nicht, dass das Richtige drauf steht.
//
// Aufruf (Dev-Server muss laufen):  node scripts/test-seite2-overlay.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { overlayStandardText } from "../lib/seite2Overlay.ts";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3002";

// Das Kennwort steht in .env.local und wird hier nur durchgereicht, nicht notiert.
function appPasswort() {
  if (process.env.TEST_PASSWORD) return process.env.TEST_PASSWORD;
  const datei = fs.readFileSync(".env.local", "utf8");
  const treffer = datei.match(/^APP_PASSWORD=(.*)$/m);
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

async function erzeuge(felder) {
  const fd = new FormData();
  fd.set("letterheadMode", "logo");
  fd.set("logoFile", new Blob([fs.readFileSync("public/brand/dwerk-logo.jpg")], { type: "image/jpeg" }), "logo.jpg");
  fd.set("logoPosition", "left");
  fd.set("designColor", "#1E6FA6");
  fd.set("absenderUnternehmensname", "Musterwerk GmbH");
  fd.set("absenderStrasse", "Industriestr. 4");
  fd.set("absenderPlz", "12345");
  fd.set("absenderOrt", "Musterstadt");
  fd.set("absenderAusCsv", "false");
  fd.set("bodyHtml", "<p>{{Anredezeile}}</p><p>Kurztext fuer den Test.</p>");
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
  fd.set("beratungslinkSubdomain", "muster");
  fd.set("beratungslinkDomain", "unserebav.de");
  fd.set("beratungQrAktiv", "false");
  fd.set("csvFile", new Blob([CSV], { type: "text/csv" }), "test.csv");
  fd.set("mapping", JSON.stringify({
    vorname: "Vorname", nachname: "Nachname", strasse: "Strasse",
    plz: "PLZ", ort: "Ort", freischaltcode: "Freischaltcode",
  }));
  fd.set("anredezeileConfig", JSON.stringify({ mode: "auto", template: "liebe-vorname" }));
  for (const [k, v] of Object.entries(felder)) fd.set(k, v);

  const res = await fetch(`${BASE}/api/generate`, { method: "POST", headers: { cookie }, body: fd });
  if (!res.ok) throw new Error(`Erzeugen fehlgeschlagen (${res.status}): ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const workerPath = path.resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
if (fs.existsSync(workerPath)) pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

async function seite2Text(pdf) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise;
  const tc = await (await doc.getPage(2)).getTextContent();
  return tc.items.map((i) => i.str).join(" ").replace(/\s+/g, " ");
}

const faelle = [
  {
    name: "Standardtext",
    felder: { overlayZeigen: "true", overlayText: "" },
    erwartet: overlayStandardText("sie").split("\n"),
    darfNicht: [],
  },
  {
    name: "Eigener Text",
    felder: { overlayZeigen: "true", overlayText: "Ihre Betriebsrente\nstartet hier" },
    erwartet: ["Ihre Betriebsrente", "startet hier"],
    darfNicht: ["In nur drei Schritten"],
  },
  {
    name: "Ausgeblendet",
    felder: { overlayZeigen: "false", overlayText: "" },
    erwartet: [],
    darfNicht: ["In nur drei Schritten", "sicheren Ruhestand"],
  },
];

let fehler = 0;
for (const fall of faelle) {
  const text = await seite2Text(await erzeuge(fall.felder));
  const fehlt = fall.erwartet.filter((e) => !text.includes(e));
  const zuviel = fall.darfNicht.filter((v) => text.includes(v));
  if (fehlt.length === 0 && zuviel.length === 0) {
    console.log(`OK   ${fall.name}`);
  } else {
    fehler++;
    console.error(`FEHLER ${fall.name}`);
    if (fehlt.length) console.error(`       fehlt auf Seite 2: ${fehlt.join(" | ")}`);
    if (zuviel.length) console.error(`       steht faelschlich da: ${zuviel.join(" | ")}`);
  }
}

console.log(fehler === 0 ? "\nAlle drei Faelle in Ordnung." : `\n${fehler} Fall/Faelle fehlerhaft.`);
process.exit(fehler === 0 ? 0 : 1);
