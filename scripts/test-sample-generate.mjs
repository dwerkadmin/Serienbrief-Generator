// Testet den kompletten Ablauf mit der eingebauten Musterdatei
// (public/sample-data/Anschreiben_Muster_2DS.csv), genau wie ihn der
// "Musterdatei verwenden"-Button im Wizard auslöst.
import fs from "node:fs";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3002";
const PASSWORD = process.env.TEST_PASSWORD ?? "changeme";

async function login() {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (!res.ok) throw new Error("Login fehlgeschlagen: " + res.status);
  return res.headers.get("set-cookie")?.split(";")[0];
}

const cookie = await login();

const fd = new FormData();
fd.set("letterheadMode", "logo");
fd.set("logoFile", new Blob([fs.readFileSync("test-data/logo.png")], { type: "image/png" }), "logo.png");
fd.set("logoPosition", "left");
fd.set("bodyHtml", "<p>{{Anredezeile}}</p><p>Das ist ein Test von {{Unternehmensname}} mit der Musterdatei für {{Vorname}} {{Nachname}}.</p><p>Ihre Geschäftsführung</p>");
fd.set("fontId", "carlito");
fd.set("fontSizePt", "11");
fd.set("designColor", "#1E6FA6");
fd.set("showHeadline", "false");
fd.set("headlineText", "");
fd.set("duSieMode", "sie");
fd.set("beratungslinkSubdomain", "schwarz");
fd.set("beratungslinkDomain", "unserebav.de");
fd.set("absenderUnternehmensname", "Musterfirma GmbH");
fd.set("absenderStrasse", "Musterstraße 1");
fd.set("absenderPlz", "12345");
fd.set("absenderOrt", "Musterstadt");
fd.set("showDate", "false");
fd.set("dateMonthOffset", "0");
fd.set("photoMode", "stock");
fd.set("stockPhotoId", "1");

fd.set(
  "csvFile",
  new Blob([fs.readFileSync("public/sample-data/Anschreiben_Muster_2DS.csv")], { type: "text/csv" }),
  "Anschreiben_Muster_2DS.csv"
);
fd.set(
  "mapping",
  JSON.stringify({
    vorname: "Vorname",
    nachname: "Nachname",
    strasse: "Straße + Hausnummer",
    plz: "PLZ",
    ort: "Ort",
    freischaltcode: "Freischaltcode",
  })
);
fd.set("anredezeileConfig", JSON.stringify({ mode: "auto", template: "liebe-vorname-nachname" }));

const res = await fetch(`${BASE}/api/generate`, { method: "POST", headers: { Cookie: cookie }, body: fd });
console.log("status", res.status, res.headers.get("content-type"));
if (!res.ok) {
  console.log(await res.text());
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync("test-data/output-sample.pdf", buf);
console.log("wrote test-data/output-sample.pdf", buf.length, "bytes");
