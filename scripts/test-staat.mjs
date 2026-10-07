// Prueft den Staat im Anschriftenblock bei Auslandsadressen.
//
// Deutsche Anschriften duerfen KEINE Staatszeile bekommen, auslaendische
// genau eine - in Grossbuchstaben, unter PLZ und Ort. Gelesen wird der Text
// der fertigen PDF, nicht das HTML.
//
// Erfundene Adressen in den Formaten, die in den echten Exporten vorkommen.
// Aufruf (Dev-Server muss laufen):  node --import ./scripts/alias-hook.mjs scripts/test-staat.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildCsv } from "../lib/csv/parseAddresses.ts";
import { plzGruppen } from "../lib/csv/staat.ts";
import { getStandardText } from "../lib/templates/standardTexts.ts";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3002";

function appPasswort() {
  if (process.env.TEST_PASSWORD) return process.env.TEST_PASSWORD;
  const t = fs.readFileSync(".env.local", "utf8").match(/^APP_PASSWORD=(.*)$/m);
  if (!t) throw new Error("APP_PASSWORD steht nicht in .env.local");
  return t[1].trim();
}

const SPALTEN = ["Vorname", "Nachname", "Strasse", "PLZ", "Ort", "Freischaltcode"];

// Je ein Empfaenger pro Format. "erwarteterStaat" leer = es darf keine Zeile geben.
const EMPFAENGER = [
  { Vorname: "Dirk", Nachname: "Inland", Strasse: "Hauptstr. 1", PLZ: "48529", Ort: "Nordhorn", Freischaltcode: "DE000001", erwarteterStaat: "" },
  { Vorname: "Piotr", Nachname: "Polen", Strasse: "ul. Testowa 5", PLZ: "62-200", Ort: "Gniezno", Freischaltcode: "PL000001", erwarteterStaat: "POLEN" },
  { Vorname: "Jan", Nachname: "Nederland", Strasse: "Teststraat 7", PLZ: "7571 AB", Ort: "Oldenzaal", Freischaltcode: "NL000001", erwarteterStaat: "NIEDERLANDE" },
];

const login = await fetch(`${BASE}/api/auth`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ password: appPasswort() }),
});
if (!login.ok) throw new Error(`Anmeldung fehlgeschlagen (${login.status})`);
const cookie = login.headers.getSetCookie?.().join("; ") ?? login.headers.get("set-cookie") ?? "";

// Die Zuordnung entsteht genauso wie in der Maske: aus den Formen der Liste.
const staatProForm = {};
for (const g of plzGruppen(EMPFAENGER.map((e) => e.PLZ))) staatProForm[g.form] = g.vorschlag;
console.log("Erkannte Formen und Vorschlaege:");
for (const [form, staat] of Object.entries(staatProForm)) {
  console.log(`  ${form.padEnd(9)} -> ${staat || "(Inland, keine Zeile)"}`);
}

const vorlage = getStandardText("j-sie");
const fd = new FormData();
fd.set("letterheadMode", "logo");
fd.set("logoFile", new Blob([fs.readFileSync("public/brand/dwerk-logo.jpg")], { type: "image/jpeg" }), "logo.jpg");
fd.set("logoPosition", "left");
fd.set("designColor", "#1E6FA6");
fd.set("absenderUnternehmensname", "Testfirma GmbH");
fd.set("absenderStrasse", "Teststr. 1");
fd.set("absenderPlz", "48529");
fd.set("absenderOrt", "Nordhorn");
fd.set("absenderAusCsv", "false");
fd.set("bodyHtml", vorlage.bodyHtml);
fd.set("showHeadline", "false");
fd.set("headlineText", "");
fd.set("showDate", "false");
fd.set("dateMonthOffset", "0");
fd.set("duSieMode", "sie");
fd.set("fontId", "inter");
fd.set("fontSizePt", "10.5");
fd.set("ansprechpartnerAnrede", "Frau");
fd.set("ansprechpartnerName", "Testberaterin");
fd.set("ansprechpartnerTelefon", "0123 456");
fd.set("ansprechpartnerEmail", "test@example.de");
fd.set("photoMode", "stock");
fd.set("stockPhotoId", "1");
fd.set("overlayZeigen", "true");
fd.set("overlayText", "");
fd.set("zugangsdatenZeigen", "false");
fd.set("beratungslinkSubdomain", "test");
fd.set("beratungslinkDomain", "unserebav.de");
fd.set("beratungQrAktiv", "false");
fd.set("csvFile", new Blob([buildCsv(SPALTEN, EMPFAENGER)], { type: "text/csv" }), "ausland.csv");
fd.set("mapping", JSON.stringify({
  vorname: "Vorname", nachname: "Nachname", strasse: "Strasse",
  plz: "PLZ", ort: "Ort", freischaltcode: "Freischaltcode",
}));
fd.set("anredezeileConfig", JSON.stringify({ mode: "auto", template: "liebe-vorname" }));
fd.set("staatProForm", JSON.stringify(staatProForm));

const res = await fetch(`${BASE}/api/generate`, { method: "POST", headers: { cookie }, body: fd });
if (!res.ok) throw new Error(`Erzeugen fehlgeschlagen (${res.status}): ${(await res.text()).slice(0, 200)}`);
const pdf = Buffer.from(await res.arrayBuffer());

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const wp = path.resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
if (fs.existsSync(wp)) pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(wp).href;
const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise;

/** pdfjs zerlegt gekernte Buchstaben - fuer die Suche stoert Leerraum nur. */
const kompakt = (s) => s.replace(/\s+/g, "");

let fehler = 0;
console.log("");
for (let i = 0; i < EMPFAENGER.length; i++) {
  const e = EMPFAENGER[i];
  const tc = await (await doc.getPage(i * 2 + 1)).getTextContent();
  const text = kompakt(tc.items.map((x) => x.str).join(" "));

  // Kein anderer Staat darf auf der Seite stehen - sonst waere die Zuordnung
  // vertauscht, und das faellt an einem einzelnen Brief nicht auf.
  const fremde = ["POLEN", "NIEDERLANDE", "BELGIEN", "FRANKREICH", "SCHWEIZ", "ÖSTERREICH", "LUXEMBURG", "DÄNEMARK", "TSCHECHIEN"]
    .filter((s) => s !== e.erwarteterStaat)
    .filter((s) => text.includes(kompakt(s)));

  const erwartetDa = e.erwarteterStaat === "" || text.includes(kompakt(e.erwarteterStaat));

  if (erwartetDa && fremde.length === 0) {
    console.log(`OK   ${e.PLZ.padEnd(8)} ${e.Ort.padEnd(10)} -> ${e.erwarteterStaat || "keine Staatszeile"}`);
  } else {
    fehler++;
    console.error(`FEHLER ${e.PLZ} ${e.Ort}`);
    if (!erwartetDa) console.error(`       "${e.erwarteterStaat}" fehlt im Anschriftenblock`);
    if (fremde.length) console.error(`       falscher Staat auf der Seite: ${fremde.join(", ")}`);
  }
}

console.log(fehler === 0 ? "\nAlles in Ordnung." : `\n${fehler} Fehler.`);
process.exit(fehler === 0 ? 0 : 1);
