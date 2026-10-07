import Papa from "papaparse";
import { plzForm } from "@/lib/csv/staat";

/**
 * Maximale Empfängerzahl pro Lauf - begrenzt durch das Zeitlimit der
 * Serverless-Funktion (siehe app/api/generate/route.ts, maxDuration). Als
 * gemeinsame Konstante hier definiert, damit Client (StepAddresses.tsx,
 * Warnung + Aufteilen-Funktion) und Server (route.ts, harte Prüfung)
 * garantiert denselben Wert verwenden.
 */
/**
 * Empfänger je Anfrage. Lange Listen werden clientseitig in so große Pakete
 * zerlegt und am Ende zu einer PDF zusammengefügt (siehe Wizard.tsx).
 *
 * Die Grenze zieht nicht der Arbeitsspeicher, sondern Cloudflare: eine Anfrage
 * muss in rund 100 Sekunden beantwortet sein. Wie lange ein Empfänger dauert,
 * hängt stark an der Kampagne - mit bloßem Logo rund 30 ms, mit einem als PDF
 * hochgeladenen Briefbogen (ganzseitiges Hintergrundbild auf jeder Seite 1)
 * eher 140 ms. 150 Empfänger bleiben auch im teuren Fall deutlich darunter.
 */
export const MAX_RECIPIENTS = 150;

/**
 * Dekodiert eine CSV-Datei robust zu Text - unabhängig davon, ob sie als
 * UTF-8 (mit/ohne BOM) oder als Windows-1252/ANSI gespeichert wurde (typisch
 * für "CSV (Trennzeichen-getrennt)"-Exporte aus Excel auf einem deutschen
 * Windows-System). Ohne das würden Umlaute (ö, ä, ü, ß) falsch dargestellt.
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  const hasUtf8Bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const body = hasUtf8Bom ? bytes.subarray(3) : bytes;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    try {
      return new TextDecoder("windows-1252").decode(body);
    } catch {
      return new TextDecoder("utf-8").decode(body); // letzter Ausweg, ohne fatal
    }
  }
}

// "Einfache" Felder: werden 1:1 aus je einer CSV-Spalte übernommen.
export type SimpleField = "vorname" | "nachname" | "strasse" | "plz" | "ort" | "freischaltcode";

export const SIMPLE_FIELDS: { key: SimpleField; label: string; hint: string }[] = [
  { key: "vorname", label: "Vorname", hint: "z.B. Max" },
  { key: "nachname", label: "Nachname", hint: "z.B. Mustermann" },
  { key: "strasse", label: "Straße + Hausnummer", hint: "für das Adressfeld" },
  { key: "plz", label: "PLZ", hint: "Postleitzahl, für das Adressfeld" },
  { key: "ort", label: "Ort", hint: "für das Adressfeld" },
  { key: "freischaltcode", label: "Freischaltcode", hint: "persönlicher Zugangscode" },
];

// Arbeitgeber-Daten je Empfänger (z.B. aus einer dCRYPT-CSV) - optional, nur
// gebraucht wenn die Absenderzeile (Schritt 1) pro Empfänger aus der CSV
// übernommen werden soll statt fest eingetragen zu sein. arbeitgebername
// ersetzt dabei auch den sonst fest eingetragenen Unternehmensnamen
// (Absenderzeile UND den {{Unternehmensname}}-Platzhalter im Brieftext).
export type EmployerField = "arbeitgebername" | "arbeitgeberStrasse" | "arbeitgeberPlz" | "arbeitgeberOrt";

export const EMPLOYER_FIELDS: { key: EmployerField; label: string; hint: string }[] = [
  { key: "arbeitgebername", label: "Arbeitgebername", hint: "für Absenderzeile und {{Unternehmensname}}" },
  { key: "arbeitgeberStrasse", label: "Arbeitgeber-Straße + Hausnummer", hint: "für die Absenderzeile" },
  { key: "arbeitgeberPlz", label: "Arbeitgeber-PLZ", hint: "für die Absenderzeile" },
  { key: "arbeitgeberOrt", label: "Arbeitgeber-Ort", hint: "für die Absenderzeile" },
];

// Beitragsdaten je Empfänger für die Beitragsgrafik (Anschreibentext Variante
// C, {{Beitragsgrafik}}-Platzhalter) - optional, nur gebraucht wenn dieser
// Platzhalter im Brieftext verwendet wird. Werte kommen typischerweise aus
// einer der drei dCRYPT-Beitragsvarianten (A1/A2/A3-Spalten), der Nutzer
// wählt in Schritt 4 frei, welche Spalten er zuordnet.
export type ChartField =
  | "chartEigenbeitrag"
  | "chartSteuerErsparnis"
  | "chartSvErsparnis"
  | "chartAgZuschuss"
  | "chartGesamtbeitrag";

export const CHART_FIELDS: { key: ChartField; label: string; hint: string }[] = [
  { key: "chartEigenbeitrag", label: "Eigenbeitrag (netto)", hint: "z.B. Spalte A1-Nettoeigenanteil" },
  { key: "chartSteuerErsparnis", label: "Steuerersparnis", hint: "z.B. Spalte A1-Steuerersparnis" },
  { key: "chartSvErsparnis", label: "SV-Ersparnis", hint: "z.B. Spalte A1-SVErsparnis" },
  { key: "chartAgZuschuss", label: "Arbeitgeberzuschuss", hint: "z.B. Spalte A1-AGZuschuss" },
  { key: "chartGesamtbeitrag", label: "Gesamtbeitrag", hint: "z.B. Spalte A1-Gesamtbeitrag" },
];

// Persoenliche Zugangsdaten je Empfaenger - nur gebraucht, wenn Seite 2 mit der
// Anmeldemaske arbeitet statt mit den allgemeinen Informationen (Schritt 3 im
// Wizard). Der Freischaltcode bleibt davon unberuehrt, der steht weiter unter
// Punkt 3 und ist ein eigenes Pflichtfeld.
export type LoginField = "nutzername" | "portalpasswort";

export const LOGIN_FIELDS: { key: LoginField; label: string; hint: string }[] = [
  { key: "nutzername", label: "Nutzername", hint: "z.B. Spalte Nutzername" },
  { key: "portalpasswort", label: "Passwort", hint: "z.B. Spalte Portalpasswort" },
];

// Staat des Empfaengers fuer den Anschriftenblock. Optional: die dCRYPT-Exporte
// haben keine solche Spalte - dann kommt der Wert ueber die PLZ-Form (siehe
// lib/csv/staat.ts). Ist eine Spalte zugeordnet, hat sie Vorrang.
export type StaatField = "staat";

export const STAAT_FIELD: { key: StaatField; label: string; hint: string } = {
  key: "staat",
  label: "Staat",
  hint: "nur falls der Export eine solche Spalte hat",
};

export type ColumnMapping = Partial<
  Record<SimpleField | EmployerField | ChartField | LoginField | StaatField, string>
>;

// Briefanredezeile: entweder aus einer eigenen CSV-Spalte, oder automatisch aus
// Vorname/Nachname nach einer der 4 festen Vorlagen erzeugt.
export type AnredeTemplateId =
  | "liebe-vorname"
  | "liebe-vorname-nachname"
  | "hallo-vorname"
  | "hallo-vorname-nachname";

/**
 * Geschlecht des Empfängers. `null` heißt "nicht bekannt" - keine Spalte
 * zugeordnet, Feld leer, oder ein Wert, der weder männlich noch weiblich
 * meint. Dann bleibt es bei der geschlechtsneutralen Form "Liebe:r".
 */
export type Geschlecht = "m" | "w";

// Gängige Schreibweisen für "männlich" in Personallisten. Bewusst großzügig:
// steht hier eine Variante nicht drin, wird daraus "Liebe Herr Müller" - und
// das fällt erst beim Empfänger auf, nicht beim Erzeugen.
const MAENNLICH = new Set(["m", "m.", "mann", "maennlich", "männlich", "male", "herr", "hr", "1"]);

// Werte, die ausdrücklich KEIN Geschlecht angeben. Sie ergeben "Liebe:r" -
// "Liebe" wäre hier schlicht falsch.
const OHNE_ANGABE = new Set([
  "",
  "-",
  "/",
  "?",
  "d",
  "divers",
  "x",
  "inter",
  "unbekannt",
  "keineangabe",
  "keine angabe",
  "k.a.",
  "ka",
]);

/**
 * Liest den Zellwert der Geschlechts-Spalte. Leer oder ausdrücklich ohne
 * Angabe -> null; männlich -> "m"; alles Übrige gilt als weiblich, weil
 * Personallisten dort neben "weiblich"/"w" auch "Frau", "2" oder Ähnliches
 * führen und eine feste Liste davon zu viel verpassen würde.
 */
export function erkenneGeschlecht(wert: string): Geschlecht | null {
  const n = wert.trim().toLowerCase();
  if (OHNE_ANGABE.has(n)) return null;
  return MAENNLICH.has(n) ? "m" : "w";
}

/** "Liebe:r" ohne Geschlechtsangabe, sonst "Lieber" bzw. "Liebe". */
function liebe(geschlecht: Geschlecht | null): string {
  if (geschlecht === null) return "Liebe:r";
  return geschlecht === "m" ? "Lieber" : "Liebe";
}

export const ANREDE_TEMPLATES: {
  id: AnredeTemplateId;
  label: string;
  /** true = das Ergebnis hängt an der Geschlechts-Spalte (für die Beschriftung in der Maske) */
  geschlechtsabhaengig: boolean;
  build: (vorname: string, nachname: string, geschlecht: Geschlecht | null) => string;
}[] = [
  {
    id: "liebe-vorname",
    label: "Liebe:r [Vorname],",
    geschlechtsabhaengig: true,
    build: (v, _n, g) => `${liebe(g)} ${v},`,
  },
  {
    id: "liebe-vorname-nachname",
    label: "Liebe:r [Vorname] [Nachname],",
    geschlechtsabhaengig: true,
    build: (v, n, g) => `${liebe(g)} ${v} ${n},`,
  },
  { id: "hallo-vorname", label: "Hallo [Vorname],", geschlechtsabhaengig: false, build: (v) => `Hallo ${v},` },
  {
    id: "hallo-vorname-nachname",
    label: "Hallo [Vorname] [Nachname],",
    geschlechtsabhaengig: false,
    build: (v, n) => `Hallo ${v} ${n},`,
  },
];

export function buildAnredezeile(
  templateId: AnredeTemplateId,
  vorname: string,
  nachname: string,
  geschlecht: Geschlecht | null = null
): string {
  const template = ANREDE_TEMPLATES.find((t) => t.id === templateId) ?? ANREDE_TEMPLATES[0];
  return template.build(vorname, nachname, geschlecht);
}

export type AnredezeileConfig =
  | { mode: "column"; column: string }
  /** `geschlechtSpalte` ist optional - ohne sie bleibt es bei "Liebe:r". */
  | { mode: "auto"; template: AnredeTemplateId; geschlechtSpalte?: string };

export type Recipient = Record<SimpleField, string> &
  /** Arbeitgeber-Daten, leer wenn nicht gemappt (siehe EMPLOYER_FIELDS) */
  Record<EmployerField, string> &
  /** Beitragsdaten für die Beitragsgrafik, leer wenn nicht gemappt (siehe CHART_FIELDS) */
  Record<ChartField, string> &
  /** Zugangsdaten fürs Portal, leer wenn nicht gemappt (siehe LOGIN_FIELDS) */
  Record<LoginField, string> & {
    /** Staat in Grossbuchstaben; leer = Inland, dann entfaellt die Zeile. */
    staat: string;
    anredezeile: string;
    /** komplette Rohzeile, falls weitere Spalten für spätere Erweiterungen gebraucht werden */
    raw: Record<string, string>;
  };

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (result.errors?.length) {
    const critical = result.errors.filter((e) => e.type !== "FieldMismatch");
    if (critical.length) {
      throw new Error(
        `CSV konnte nicht gelesen werden: ${critical[0].message} (Zeile ${critical[0].row ?? "?"})`
      );
    }
  }
  const headers = result.meta.fields ?? [];
  const rows = (result.data ?? []).filter((r) => Object.values(r).some((v) => (v ?? "").trim() !== ""));
  return { headers, rows };
}

/**
 * Schreibt gelesene Zeilen wieder als CSV - für die Pakete, in denen eine lange
 * Adressliste an die Erzeugung geht (siehe Wizard.tsx).
 *
 * Der Trenner steht hier ausdrücklich auf Semikolon. Ohne die Angabe nimmt
 * Papa.unparse Komma, und genau daran scheiterten früher die Teildateien: die
 * dCRYPT-Exporte kommen mit Semikolon, die erzeugten Teile hatten plötzlich
 * Komma - mit Beträgen wie "50,00" darin, die dadurch zu zwei Spalten wurden.
 */
export function buildCsv(headers: string[], rows: Record<string, string>[]): string {
  return Papa.unparse({ fields: headers, data: rows }, { delimiter: ";" });
}

/** Zerlegt die Zeilen in Pakete von je höchstens `groesse` Stück. */
export function teileInPakete<T>(zeilen: T[], groesse: number = MAX_RECIPIENTS): T[][] {
  const pakete: T[][] = [];
  for (let i = 0; i < zeilen.length; i += groesse) pakete.push(zeilen.slice(i, i + groesse));
  return pakete;
}

/** Normalisiert einen Spaltennamen für den Best-Effort-Abgleich (Umlaute/ß einrechnen, Rest verwerfen). */
function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[^a-z0-9]/g, "");
}

/** Versucht Spaltennamen automatisch den einfachen (+ Arbeitgeber-)Feldern zuzuordnen (Best-Effort, editierbar in der UI). */
export function guessMapping(headers: string[]): ColumnMapping {
  const table: Record<SimpleField | EmployerField | ChartField | LoginField, string[]> = {
    vorname: ["vorname", "firstname", "givenname"],
    nachname: ["nachname", "name", "lastname", "surname", "familyname"],
    // "ArbeitnehmerStrasseHauptwohnsitz" usw. ist die reale Spaltenbenennung
    // im dCRYPT-Export für die Empfänger-Adresse (z.B. Mail_*.csv-Dateien).
    strasse: ["strasse", "strassehausnummer", "street", "adresse1", "arbeitnehmerstrassehauptwohnsitz"],
    plz: ["plz", "postleitzahl", "zip", "zipcode", "postcode", "arbeitnehmerplzhauptwohnsitz"],
    ort: ["ort", "stadt", "city", "town", "arbeitnehmerorthauptwohnsitz"],
    freischaltcode: ["freischaltcode", "code", "zugangscode", "aktivierungscode"],
    arbeitgebername: ["arbeitgebername"],
    arbeitgeberStrasse: ["arbeitgeberstrasse"],
    arbeitgeberPlz: ["arbeitgeberplz"],
    arbeitgeberOrt: ["arbeitgeberort"],
    // A1- ist die erste der drei dCRYPT-Beitragsvarianten - als Standardvorschlag
    // geraten, in Schritt 4 aber frei auf A2-/A3-Spalten umstellbar.
    chartEigenbeitrag: ["a1nettoeigenanteil"],
    chartSteuerErsparnis: ["a1steuerersparnis"],
    chartSvErsparnis: ["a1sversparnis"],
    chartAgZuschuss: ["a1agzuschuss"],
    chartGesamtbeitrag: ["a1gesamtbeitrag"],
    nutzername: ["nutzername", "benutzername", "username", "login"],
    portalpasswort: ["portalpasswort", "passwort", "password", "kennwort"],
  };
  // Spaltennamen, die exakt den eigenen Feld-Labels entsprechen (z.B. "Straße + Hausnummer"),
  // sollen immer automatisch erkannt werden - unabhängig von der festen Kandidatenliste oben.
  const labelByField = Object.fromEntries(
    [...SIMPLE_FIELDS, ...EMPLOYER_FIELDS, ...CHART_FIELDS, ...LOGIN_FIELDS].map((f) => [
      f.key,
      normalizeHeader(f.label),
    ])
  ) as Record<SimpleField | EmployerField | ChartField | LoginField, string>;

  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const n = normalizeHeader(header);
    for (const [field, candidates] of Object.entries(table) as [
      SimpleField | EmployerField | ChartField | LoginField,
      string[],
    ][]) {
      if (mapping[field]) continue;
      if (candidates.includes(n) || n === labelByField[field]) mapping[field] = header;
    }
  }
  return mapping;
}

/** Rät eine passende Spalte für eine (optionale) fertige Anredezeile, falls vorhanden. */
export function guessAnredezeileColumn(headers: string[]): string | undefined {
  const candidates = ["anredezeile", "briefanrede", "anredetext", "salutation"];
  return headers.find((h) => candidates.includes(normalizeHeader(h)));
}

/**
 * Rät die Spalte mit dem Geschlecht. Bewusst eng gefasst: eine Spalte "Anrede"
 * enthält je nach Liste mal "Herr"/"Frau", mal die komplette Briefanrede - die
 * automatisch zu wählen ginge zu oft daneben.
 */
export function guessGeschlechtColumn(headers: string[]): string | undefined {
  const candidates = ["geschlecht", "gender", "sex", "geschl"];
  return headers.find((h) => candidates.includes(normalizeHeader(h)));
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  anredezeileConfig: AnredezeileConfig,
  options?: {
    requireEmployerFields?: boolean;
    requireChartFields?: boolean;
    requireLoginFields?: boolean;
    /**
     * Staat je PLZ-Form, wenn keine Staat-Spalte zugeordnet ist. Schluessel ist
     * der Formschluessel aus plzForm() (siehe lib/csv/staat.ts).
     */
    staatProForm?: Record<string, string>;
  }
): Recipient[] {
  const missing = SIMPLE_FIELDS.filter((f) => !mapping[f.key]);
  if (missing.length) {
    throw new Error(
      `Bitte alle Felder zuordnen. Es fehlt: ${missing.map((m) => m.label).join(", ")}`
    );
  }
  if (options?.requireEmployerFields) {
    const missingEmployer = EMPLOYER_FIELDS.filter((f) => !mapping[f.key]);
    if (missingEmployer.length) {
      throw new Error(
        `Für "Absender aus CSV übernehmen" bitte auch diese Felder zuordnen: ${missingEmployer
          .map((m) => m.label)
          .join(", ")}`
      );
    }
  }
  if (options?.requireChartFields) {
    const missingChart = CHART_FIELDS.filter((f) => !mapping[f.key]);
    if (missingChart.length) {
      throw new Error(
        `Für die Beitragsgrafik (Platzhalter {{Beitragsgrafik}}) bitte auch diese Felder zuordnen: ${missingChart
          .map((m) => m.label)
          .join(", ")}`
      );
    }
  }
  if (options?.requireLoginFields) {
    const missingLogin = LOGIN_FIELDS.filter((f) => !mapping[f.key]);
    if (missingLogin.length) {
      throw new Error(
        `Für die persönlichen Zugangsdaten auf Seite 2 bitte auch diese Spalten zuordnen: ${missingLogin
          .map((m) => m.label)
          .join(", ")}`
      );
    }
  }
  if (anredezeileConfig.mode === "column" && !anredezeileConfig.column) {
    throw new Error("Bitte eine Spalte für die Briefanredezeile wählen (oder auf „Automatisch generieren“ umstellen).");
  }

  return rows.map((row) => {
    const rec: Partial<Recipient> = { raw: row };
    for (const field of SIMPLE_FIELDS) {
      const header = mapping[field.key]!;
      rec[field.key] = (row[header] ?? "").trim();
    }
    for (const field of EMPLOYER_FIELDS) {
      const header = mapping[field.key];
      rec[field.key] = header ? (row[header] ?? "").trim() : "";
    }
    for (const field of CHART_FIELDS) {
      const header = mapping[field.key];
      rec[field.key] = header ? (row[header] ?? "").trim() : "";
    }
    for (const field of LOGIN_FIELDS) {
      const header = mapping[field.key];
      rec[field.key] = header ? (row[header] ?? "").trim() : "";
    }

    // Eine zugeordnete Spalte gewinnt; sonst gilt, was fuer diese PLZ-Form
    // eingestellt wurde. Leer heisst Inland - dann steht kein Staat im Brief.
    const ausSpalte = mapping.staat ? (row[mapping.staat] ?? "").trim() : "";
    rec.staat = (
      ausSpalte !== "" ? ausSpalte : (options?.staatProForm?.[plzForm(rec.plz ?? "")] ?? "")
    )
      .trim()
      .toUpperCase();
    if (anredezeileConfig.mode === "auto") {
      const spalte = anredezeileConfig.geschlechtSpalte;
      const geschlecht = spalte ? erkenneGeschlecht(row[spalte] ?? "") : null;
      rec.anredezeile = buildAnredezeile(
        anredezeileConfig.template,
        rec.vorname ?? "",
        rec.nachname ?? "",
        geschlecht
      );
    } else {
      rec.anredezeile = (row[anredezeileConfig.column] ?? "").trim();
    }
    return rec as Recipient;
  });
}
