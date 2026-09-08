// End-to-End-Test: simuliert genau den Request, den der Wizard beim Klick auf
// "Serienbriefe erstellen" absetzt. Läuft standardmäßig gegen den lokalen
// Dev-Server; für einen Test gegen eine andere Umgebung (z.B. die
// Vercel-Produktion) TEST_BASE_URL / TEST_PASSWORD setzen, z.B.:
//   TEST_BASE_URL=https://serienbrief-generator.vercel.app TEST_PASSWORD=... node scripts/test-generate.mjs
import fs from "node:fs";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3002";
const PASSWORD = process.env.TEST_PASSWORD ?? "changeme";
const OUT_SUFFIX = process.env.TEST_OUT_SUFFIX ?? "";

async function login() {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (!res.ok) throw new Error("Login fehlgeschlagen: " + res.status);
  const setCookie = res.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0];
  if (!cookie) throw new Error("Kein Cookie erhalten");
  return cookie;
}

async function run(mode) {
  const cookie = await login();

  const fd = new FormData();
  if (mode === "letterhead") {
    fd.set("letterheadMode", "image");
    fd.set(
      "letterheadFile",
      new Blob([fs.readFileSync("test-data/briefbogen.pdf")], { type: "application/pdf" }),
      "briefbogen.pdf"
    );
  } else {
    fd.set("letterheadMode", "logo");
    fd.set("logoFile", new Blob([fs.readFileSync("test-data/logo.png")], { type: "image/png" }), "logo.png");
    fd.set("logoPosition", "left");
  }

  fd.set(
    "bodyHtml",
    "<p>{{Anredezeile}}</p><p>Das ist ein Testtext von {{Unternehmensname}} für {{Vorname}} {{Nachname}}.</p><p>Bei Fragen erreichen Sie {{AnsprechpartnerAnrede}} {{AnsprechpartnerName}} unter {{AnsprechpartnerTelefon}} oder {{AnsprechpartnerEmail}}.</p><p>Ihre Geschäftsführung</p>"
  );
  fd.set("fontId", "carlito");
  fd.set("fontSizePt", "11");
  fd.set("ansprechpartnerAnrede", "Frau");
  fd.set("ansprechpartnerName", "Eva Testmakler");
  fd.set("ansprechpartnerTelefon", "0123 456789");
  fd.set("ansprechpartnerEmail", "eva.test@makler.net");
  fd.set("designColor", "#1E6FA6");
  fd.set("showHeadline", "true");
  fd.set("headlineText", "Warum Geld verschenken?\nSparen Sie Steuern und Sozialabgaben mit unserer Hilfe!");
  fd.set("duSieMode", mode === "letterhead" ? "du" : "sie");
  fd.set("beratungslinkSubdomain", "schwarz");
  fd.set("beratungslinkDomain", "unserebav.de");
  fd.set("absenderUnternehmensname", "Testfirma GmbH");
  fd.set("absenderStrasse", "Musterstraße 1");
  fd.set("absenderPlz", "12345");
  fd.set("absenderOrt", "Musterstadt");
  fd.set("showDate", "true");
  fd.set("dateMonthOffset", mode === "letterhead" ? "2" : "0");

  fd.set("photoMode", "stock");
  fd.set("stockPhotoId", mode === "letterhead" ? "1" : "3");

  // "logo"-Lauf nutzt zusätzlich die Windows-1252-kodierte Test-CSV (Umlaut-Fix)
  // mit automatisch generierter Anredezeile, "letterhead"-Lauf die UTF-8-CSV
  // mit einer eigenen Anredezeile-Spalte.
  const csvPath = mode === "logo" ? "test-data/beispiel-adressen-cp1252.csv" : "test-data/beispiel-adressen.csv";
  fd.set("csvFile", new Blob([fs.readFileSync(csvPath)], { type: "text/csv" }), csvPath.split("/").pop());
  fd.set(
    "mapping",
    JSON.stringify({
      vorname: "Vorname",
      nachname: "Nachname",
      strasse: "Strasse",
      plz: "PLZ",
      ort: "Ort",
      freischaltcode: "Freischaltcode",
    })
  );
  fd.set(
    "anredezeileConfig",
    mode === "logo"
      ? JSON.stringify({ mode: "auto", template: "hallo-vorname" })
      : JSON.stringify({ mode: "column", column: "Anredezeile" })
  );

  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: fd,
  });

  console.log(mode, "-> status", res.status, res.headers.get("content-type"));
  if (!res.ok) {
    console.log(await res.text());
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = `test-data/output-${mode}${OUT_SUFFIX}.pdf`;
  fs.writeFileSync(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

await run("logo");
await run("letterhead");
