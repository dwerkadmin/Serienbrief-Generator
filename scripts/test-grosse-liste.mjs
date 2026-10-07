// Prueft den Weg fuer lange Adresslisten: Pakete von je MAX_RECIPIENTS
// Empfaengern, danach zu EINER PDF zusammengefuegt. Geprueft wird die
// Seitenzahl, die Reihenfolge und dass an den Paketgrenzen niemand fehlt.
//
// Arbeitet mit erfundenen Daten. Aufruf (Dev-Server muss laufen):
//   node scripts/test-grosse-liste.mjs [anzahl]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { MAX_RECIPIENTS, buildCsv, teileInPakete } from "../lib/csv/parseAddresses.ts";
import { getStandardText } from "../lib/templates/standardTexts.ts";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3002";
const ANZAHL = Number(process.argv[2] ?? 1729);

function appPasswort() {
  if (process.env.TEST_PASSWORD) return process.env.TEST_PASSWORD;
  const t = fs.readFileSync(".env.local", "utf8").match(/^APP_PASSWORD=(.*)$/m);
  if (!t) throw new Error("APP_PASSWORD steht nicht in .env.local");
  return t[1].trim();
}

const SPALTEN = ["Vorname","Nachname","Geschlecht","Freischaltcode","Strasse","PLZ","Ort",
  "A1-Nettoeigenanteil","A1-Steuerersparnis","A1-SVErsparnis","A1-AGZuschuss","A1-Gesamtbeitrag"];

/** Erfundene Empfaenger - jeder mit eindeutigem Namen, damit die Reihenfolge pruefbar ist. */
const zeilen = Array.from({ length: ANZAHL }, (_, i) => {
  const n = i + 1, eb = 50 + (n % 40);
  const st = +(eb * 0.37).toFixed(2), sv = +(eb * 0.43).toFixed(2);
  const um = +(eb + st + sv).toFixed(2), ag = +(um * 0.2).toFixed(2);
  const komma = (x) => x.toFixed(2).replace(".", ",");
  return { Vorname: `Vorname${n}`, Nachname: `Testperson${n}`, Geschlecht: n % 2 ? "m" : "w",
    Freischaltcode: `CODE${String(n).padStart(5, "0")}`, Strasse: `Teststrasse ${n}`, PLZ: "12345", Ort: "Teststadt",
    "A1-Nettoeigenanteil": komma(eb), "A1-Steuerersparnis": komma(st), "A1-SVErsparnis": komma(sv),
    "A1-AGZuschuss": komma(ag), "A1-Gesamtbeitrag": komma(um) };
});

const login = await fetch(`${BASE}/api/auth`, { method: "POST",
  headers: { "content-type": "application/json" }, body: JSON.stringify({ password: appPasswort() }) });
if (!login.ok) throw new Error(`Anmeldung fehlgeschlagen (${login.status})`);
const cookie = login.headers.getSetCookie?.().join("; ") ?? login.headers.get("set-cookie") ?? "";

const vorlage = getStandardText("c-sie");
const logo = fs.readFileSync("public/brand/dwerk-logo.jpg");

async function paketErzeugen(paket) {
  const fd = new FormData();
  fd.set("letterheadMode", "logo");
  fd.set("logoFile", new Blob([logo], { type: "image/jpeg" }), "logo.jpg");
  fd.set("logoPosition", "left"); fd.set("designColor", "#1E6FA6");
  fd.set("absenderUnternehmensname", "Testfirma GmbH"); fd.set("absenderStrasse", "Teststr. 1");
  fd.set("absenderPlz", "12345"); fd.set("absenderOrt", "Teststadt"); fd.set("absenderAusCsv", "false");
  fd.set("bodyHtml", vorlage.bodyHtml);
  fd.set("showHeadline", "true"); fd.set("headlineText", vorlage.defaultHeadline);
  fd.set("showDate", "true"); fd.set("dateMonthOffset", "0"); fd.set("duSieMode", "sie");
  fd.set("fontId", "inter"); fd.set("fontSizePt", "10.5");
  fd.set("ansprechpartnerAnrede", "Frau"); fd.set("ansprechpartnerName", "Testberaterin");
  fd.set("ansprechpartnerTelefon", "0123 456"); fd.set("ansprechpartnerEmail", "test@example.de");
  fd.set("photoMode", "stock"); fd.set("stockPhotoId", "1");
  fd.set("overlayZeigen", "true"); fd.set("overlayText", "");
  fd.set("beratungslinkSubdomain", "test"); fd.set("beratungslinkDomain", "unserebav.de");
  fd.set("beratungQrAktiv", "false");
  fd.set("csvFile", new Blob([buildCsv(SPALTEN, paket)], { type: "text/csv" }), "liste.csv");
  fd.set("mapping", JSON.stringify({ vorname: "Vorname", nachname: "Nachname", strasse: "Strasse",
    plz: "PLZ", ort: "Ort", freischaltcode: "Freischaltcode",
    chartEigenbeitrag: "A1-Nettoeigenanteil", chartSteuerErsparnis: "A1-Steuerersparnis",
    chartSvErsparnis: "A1-SVErsparnis", chartAgZuschuss: "A1-AGZuschuss", chartGesamtbeitrag: "A1-Gesamtbeitrag" }));
  fd.set("anredezeileConfig", JSON.stringify({ mode: "auto", template: "liebe-vorname", geschlechtSpalte: "Geschlecht" }));

  const res = await fetch(`${BASE}/api/generate`, { method: "POST", headers: { cookie }, body: fd });
  if (!res.ok) throw new Error(`Paket fehlgeschlagen (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return await res.arrayBuffer();
}

const pakete = teileInPakete(zeilen, MAX_RECIPIENTS);
console.log(`${ANZAHL} Empfaenger in ${pakete.length} Paketen zu je hoechstens ${MAX_RECIPIENTS}\n`);

const t0 = Date.now();
const teile = [];
for (let i = 0; i < pakete.length; i++) {
  const t = Date.now();
  teile.push(await paketErzeugen(pakete[i]));
  console.log(`  Paket ${i + 1}/${pakete.length}: ${pakete[i].length} Empfaenger, ${((Date.now() - t) / 1000).toFixed(1)} s`);
}
const erzeugung = (Date.now() - t0) / 1000;

const { fuegePdfsZusammen } = await import("../lib/pdf/mergePdfs.ts");
const tm = Date.now();
const gesamt = await fuegePdfsZusammen(teile);
const merge = (Date.now() - tm) / 1000;

const aus = "test-data/.grosse-liste.pdf";
fs.writeFileSync(aus, gesamt);
console.log(`\nErzeugung ${erzeugung.toFixed(1)} s, Zusammenfuegen ${merge.toFixed(1)} s`);
console.log(`Gesamt-PDF: ${(gesamt.length / 1024 / 1024).toFixed(1)} MB -> ${aus}`);

// --- Nachpruefen: Seitenzahl, Reihenfolge, Paketgrenzen ---
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const wp = path.resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
if (fs.existsSync(wp)) pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(wp).href;
const doc = await pdfjs.getDocument({ data: new Uint8Array(gesamt), useSystemFonts: true }).promise;

let fehler = 0;
const erwarteteSeiten = ANZAHL * 2;
if (doc.numPages !== erwarteteSeiten) {
  fehler++; console.error(`FEHLER Seitenzahl: ${doc.numPages}, erwartet ${erwarteteSeiten}`);
} else console.log(`OK   Seitenzahl ${doc.numPages} (2 je Empfaenger)`);

// Stichproben: erster, letzter und je die Empfaenger an den Paketgrenzen
const stichproben = [1, ANZAHL];
for (let i = 1; i < pakete.length; i++) stichproben.push(i * MAX_RECIPIENTS, i * MAX_RECIPIENTS + 1);
for (const n of [...new Set(stichproben)].sort((a, b) => a - b)) {
  const seite = await doc.getPage(n * 2 - 1);
  const txt = (await seite.getTextContent()).items.map((x) => x.str).join("").replace(/\s+/g, "");
  if (txt.includes(`Testperson${n},`) || txt.includes(`Testperson${n}`)) {
    console.log(`OK   Empfaenger ${n} steht auf Seite ${n * 2 - 1}`);
  } else {
    fehler++;
    console.error(`FEHLER Empfaenger ${n} fehlt auf Seite ${n * 2 - 1}`);
  }
}

console.log(fehler === 0 ? "\nAlles in Ordnung." : `\n${fehler} Fehler.`);
process.exit(fehler === 0 ? 0 : 1);
