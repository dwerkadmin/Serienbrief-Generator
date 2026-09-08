// End-to-End-Test für den Anschreibentext "Variante C" mit der dynamischen
// Beitragsgrafik ({{Beitragsgrafik}}, siehe lib/beitragsgrafik.ts).
//
// Anders als scripts/test-generate.mjs prüft dieser Test nicht nur, dass eine
// PDF herauskommt: er liest die Beträge aus der erzeugten PDF wieder aus und
// vergleicht sie mit dem, was aus der CSV-Zeile des jeweiligen Empfängers
// folgen muss. Damit fällt auf, wenn die Grafik fehlt, leer bleibt oder für
// alle Empfänger dieselben Zahlen zeigt.
//
// Läuft standardmäßig gegen den lokalen Dev-Server (Port 3002, siehe
// .claude/launch.json). Gegen die Produktion:
//   TEST_BASE_URL=https://briefgenerator.dwerk.net TEST_PASSWORD=... \
//   TEST_OUT_SUFFIX=-prod node scripts/test-variante-c.mjs
//
// Node lädt die .ts-Dateien unten direkt (Type-Stripping ab Node 22.6/24) -
// so nutzt der Test denselben Vorlagentext und dieselbe Zahlen-Logik wie die
// App, statt sie zu duplizieren.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import Papa from "papaparse";
import { getStandardText } from "../lib/templates/standardTexts.ts";
import { parseGermanDecimal } from "../lib/beitragsgrafik.ts";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3002";
const PASSWORD = process.env.TEST_PASSWORD ?? "changeme";
const OUT_SUFFIX = process.env.TEST_OUT_SUFFIX ?? "";
const VARIANT = process.env.TEST_VARIANT ?? "c-du";
const CSV_PATH = "test-data/beispiel-adressen-beitragsgrafik.csv";

// Spaltenzuordnung wie sie der Nutzer in Schritt 4 vornimmt.
const MAPPING = {
  vorname: "Vorname",
  nachname: "Nachname",
  strasse: "Strasse",
  plz: "PLZ",
  ort: "Ort",
  freischaltcode: "Freischaltcode",
  chartEigenbeitrag: "A1-Nettoeigenanteil",
  chartSteuerErsparnis: "A1-Steuerersparnis",
  chartSvErsparnis: "A1-SVErsparnis",
  chartAgZuschuss: "A1-AGZuschuss",
  chartGesamtbeitrag: "A1-Gesamtbeitrag",
};

function euro(n) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Welche Beträge muss die Grafik für diese CSV-Zeile zeigen? Spiegelt buildBeitragsgrafikSvg. */
function erwarteteBetraege(row) {
  const eigenbeitrag = parseGermanDecimal(row[MAPPING.chartEigenbeitrag] ?? "");
  const ersparnis =
    parseGermanDecimal(row[MAPPING.chartSteuerErsparnis] ?? "") +
    parseGermanDecimal(row[MAPPING.chartSvErsparnis] ?? "");
  const agZuschuss = parseGermanDecimal(row[MAPPING.chartAgZuschuss] ?? "");
  const gesamt = parseGermanDecimal(row[MAPPING.chartGesamtbeitrag] ?? "");
  return {
    Eigenbeitrag: euro(eigenbeitrag),
    "Steuer- und SV-Ersparnis": euro(ersparnis),
    Arbeitgeberzuschuss: euro(agZuschuss),
    Entgeltumwandlung: euro(eigenbeitrag + ersparnis),
    Gesamtbeitrag: euro(gesamt),
  };
}

async function login() {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login fehlgeschlagen: ${res.status}`);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Kein Cookie erhalten");
  return cookie;
}

/** Text je Seite aus der erzeugten PDF, um die Beträge nachzuprüfen. */
async function seitentexte(pdfBuffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = path.join(process.cwd(), "public", "pdf.worker.mjs");
  if (fs.existsSync(workerPath)) {
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  }
  const task = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: true,
    useWorkerFetch: false,
  });
  try {
    const doc = await task.promise;
    const seiten = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent();
      seiten.push(tc.items.map((x) => x.str).join(" ").replace(/\s+/g, " "));
    }
    return seiten;
  } finally {
    await task.destroy();
  }
}

// ---------------------------------------------------------------------------

const vorlage = getStandardText(VARIANT);
if (!vorlage.bodyHtml.includes("{{Beitragsgrafik}}")) {
  console.error(`FEHLER: Vorlage "${VARIANT}" enthält keinen {{Beitragsgrafik}}-Platzhalter.`);
  process.exit(1);
}

const csvRaw = fs.readFileSync(CSV_PATH, "utf8");
const rows = Papa.parse(csvRaw, { header: true, skipEmptyLines: true }).data;
console.log(`Vorlage "${VARIANT}" (${vorlage.label}), ${rows.length} Empfänger aus ${CSV_PATH}`);

const cookie = await login();

const fd = new FormData();
fd.set("letterheadMode", "logo");
fd.set("logoFile", new Blob([fs.readFileSync("test-data/logo.png")], { type: "image/png" }), "logo.png");
fd.set("logoPosition", "left");
fd.set("bodyHtml", vorlage.bodyHtml);
fd.set("fontId", "carlito");
fd.set("fontSizePt", "11");
fd.set("ansprechpartnerAnrede", "Frau");
fd.set("ansprechpartnerName", "Eva Testmakler");
fd.set("ansprechpartnerTelefon", "0123 456789");
fd.set("ansprechpartnerEmail", "eva.test@makler.net");
fd.set("designColor", "#1E6FA6");
fd.set("showHeadline", "true");
fd.set("headlineText", vorlage.defaultHeadline);
fd.set("duSieMode", vorlage.duSie);
fd.set("beratungslinkSubdomain", "schwarz");
fd.set("beratungslinkDomain", "unserebav.de");
fd.set("absenderUnternehmensname", "Testfirma GmbH");
fd.set("absenderStrasse", "Musterstraße 1");
fd.set("absenderPlz", "12345");
fd.set("absenderOrt", "Musterstadt");
fd.set("showDate", "true");
fd.set("dateMonthOffset", "0");
fd.set("photoMode", "stock");
fd.set("stockPhotoId", "3");
fd.set("csvFile", new Blob([csvRaw], { type: "text/csv" }), path.basename(CSV_PATH));
fd.set("mapping", JSON.stringify(MAPPING));
fd.set("anredezeileConfig", JSON.stringify({ mode: "column", column: "Anredezeile" }));

const res = await fetch(`${BASE}/api/generate`, { method: "POST", headers: { Cookie: cookie }, body: fd });
console.log("Status:", res.status, res.headers.get("content-type"));
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}

const pdf = Buffer.from(await res.arrayBuffer());
const outPath = `test-data/output-variante-c${OUT_SUFFIX}.pdf`;
fs.writeFileSync(outPath, pdf);
console.log("geschrieben:", outPath, pdf.length, "Bytes");

// --- Nachprüfung: stehen die richtigen Beträge auf der richtigen Seite? ------

const seiten = await seitentexte(pdf);
let fehler = 0;

const erwarteteSeiten = rows.length * 2; // Seite 1 + Seite 2 je Empfänger
if (seiten.length !== erwarteteSeiten) {
  console.error(`FEHLER: ${seiten.length} Seiten, erwartet ${erwarteteSeiten} (2 pro Empfänger)`);
  fehler++;
} else {
  console.log(`Seiten: ${seiten.length} (2 pro Empfänger, korrekt)`);
}

rows.forEach((row, i) => {
  const seitentext = seiten[i * 2] ?? "";
  const name = `${row.Vorname} ${row.Nachname}`;
  const erwartet = erwarteteBetraege(row);
  const fehlend = Object.entries(erwartet).filter(([, wert]) => !seitentext.includes(wert));

  if (!seitentext.includes(row.Vorname)) {
    console.error(`  FEHLER: Seite ${i * 2 + 1} nennt "${row.Vorname}" nicht - falsche Reihenfolge?`);
    fehler++;
  }
  if (fehlend.length) {
    console.error(`  FEHLER ${name}: fehlende Beträge -> ${fehlend.map(([k, v]) => `${k}=${v}`).join(", ")}`);
    fehler++;
  } else {
    console.log(`  OK ${name}: ${Object.values(erwartet).join(" | ")}`);
  }
});

// Gegenprobe gegen "alle Empfänger bekommen dieselbe Grafik": mindestens zwei
// Empfänger müssen sich in ihren Beträgen unterscheiden.
if (rows.length > 1) {
  const ersteBetraege = Object.values(erwarteteBetraege(rows[0])).join("|");
  const zweiteBetraege = Object.values(erwarteteBetraege(rows[1])).join("|");
  if (ersteBetraege === zweiteBetraege) {
    console.error("FEHLER: Testdaten taugen nicht - die ersten zwei Empfänger haben gleiche Beträge.");
    fehler++;
  } else if (seiten[0] === seiten[2]) {
    console.error("FEHLER: Seite 1 und Seite 3 sind textgleich - die Grafik ist nicht empfängerspezifisch.");
    fehler++;
  }
}

if (fehler) {
  console.error(`\n${fehler} Fehler.`);
  process.exit(1);
}
console.log("\nAlles in Ordnung.");
