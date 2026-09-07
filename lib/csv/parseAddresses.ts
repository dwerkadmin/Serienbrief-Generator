import Papa from "papaparse";

/**
 * Maximale Empfängerzahl pro Lauf - begrenzt durch das Zeitlimit der
 * Serverless-Funktion (siehe app/api/generate/route.ts, maxDuration). Als
 * gemeinsame Konstante hier definiert, damit Client (StepAddresses.tsx,
 * Warnung + Aufteilen-Funktion) und Server (route.ts, harte Prüfung)
 * garantiert denselben Wert verwenden.
 */
export const MAX_RECIPIENTS = 300;

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

export type ColumnMapping = Partial<Record<SimpleField | EmployerField | ChartField, string>>;

// Briefanredezeile: entweder aus einer eigenen CSV-Spalte, oder automatisch aus
// Vorname/Nachname nach einer der 4 festen Vorlagen erzeugt.
export type AnredeTemplateId =
  | "liebe-vorname"
  | "liebe-vorname-nachname"
  | "hallo-vorname"
  | "hallo-vorname-nachname";

export const ANREDE_TEMPLATES: { id: AnredeTemplateId; label: string; build: (vorname: string, nachname: string) => string }[] = [
  { id: "liebe-vorname", label: "Liebe:r [Vorname],", build: (v) => `Liebe:r ${v},` },
  { id: "liebe-vorname-nachname", label: "Liebe:r [Vorname] [Nachname],", build: (v, n) => `Liebe:r ${v} ${n},` },
  { id: "hallo-vorname", label: "Hallo [Vorname],", build: (v) => `Hallo ${v},` },
  { id: "hallo-vorname-nachname", label: "Hallo [Vorname] [Nachname],", build: (v, n) => `Hallo ${v} ${n},` },
];

export function buildAnredezeile(templateId: AnredeTemplateId, vorname: string, nachname: string): string {
  const template = ANREDE_TEMPLATES.find((t) => t.id === templateId) ?? ANREDE_TEMPLATES[0];
  return template.build(vorname, nachname);
}

export type AnredezeileConfig =
  | { mode: "column"; column: string }
  | { mode: "auto"; template: AnredeTemplateId };

export type Recipient = Record<SimpleField, string> &
  /** Arbeitgeber-Daten, leer wenn nicht gemappt (siehe EMPLOYER_FIELDS) */
  Record<EmployerField, string> &
  /** Beitragsdaten für die Beitragsgrafik, leer wenn nicht gemappt (siehe CHART_FIELDS) */
  Record<ChartField, string> & {
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
 * Teilt eine zu lange Adressliste in mehrere kleinere CSV-Dateien mit je
 * maximal `chunkSize` Zeilen auf (gleiche Kopfzeile je Teil) - für den Fall,
 * dass eine Liste MAX_RECIPIENTS überschreitet und der Nutzer sie in mehreren
 * Läufen abarbeiten möchte (siehe StepAddresses.tsx).
 */
export function splitCsvIntoChunks(
  headers: string[],
  rows: Record<string, string>[],
  chunkSize: number = MAX_RECIPIENTS
): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    chunks.push(Papa.unparse({ fields: headers, data: rows.slice(i, i + chunkSize) }));
  }
  return chunks;
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
  const table: Record<SimpleField | EmployerField | ChartField, string[]> = {
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
  };
  // Spaltennamen, die exakt den eigenen Feld-Labels entsprechen (z.B. "Straße + Hausnummer"),
  // sollen immer automatisch erkannt werden - unabhängig von der festen Kandidatenliste oben.
  const labelByField = Object.fromEntries(
    [...SIMPLE_FIELDS, ...EMPLOYER_FIELDS, ...CHART_FIELDS].map((f) => [f.key, normalizeHeader(f.label)])
  ) as Record<SimpleField | EmployerField | ChartField, string>;

  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const n = normalizeHeader(header);
    for (const [field, candidates] of Object.entries(table) as [SimpleField | EmployerField | ChartField, string[]][]) {
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

export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  anredezeileConfig: AnredezeileConfig,
  options?: { requireEmployerFields?: boolean; requireChartFields?: boolean }
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
    rec.anredezeile =
      anredezeileConfig.mode === "auto"
        ? buildAnredezeile(anredezeileConfig.template, rec.vorname ?? "", rec.nachname ?? "")
        : (row[anredezeileConfig.column] ?? "").trim();
    return rec as Recipient;
  });
}
