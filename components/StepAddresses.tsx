"use client";

import { useMemo, useState } from "react";
import { buildAbsenderzeile } from "@/lib/absenderzeile";
import {
  ANREDE_TEMPLATES,
  CHART_FIELDS,
  EMPLOYER_FIELDS,
  LOGIN_FIELDS,
  MAX_RECIPIENTS,
  SIMPLE_FIELDS,
  applyMapping,
  decodeCsvBytes,
  guessAnredezeileColumn,
  guessGeschlechtColumn,
  guessMapping,
  parseCsv,
  type AnredeTemplateId,
  type Recipient,
} from "@/lib/csv/parseAddresses";
import { STAAT_AUSWAHL, plzGruppen } from "@/lib/csv/staat";
import FileUploadButton from "./FileUploadButton";
import type { StepProps } from "./wizardTypes";

const SAMPLE_CSV_PATH = "/sample-data/Anschreiben_Muster_2DS.csv";
const SAMPLE_CSV_NAME = "Anschreiben_Muster_2DS.csv";

export default function StepAddresses({ state, update }: StepProps) {
  const [error, setError] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);

  function applyParsedCsv(
    file: File,
    headers: string[],
    rows: Record<string, string>[],
    opts?: { forceAutoTemplate?: AnredeTemplateId }
  ) {
    const guessedColumn = guessAnredezeileColumn(headers);
    const guessedGeschlecht = guessGeschlechtColumn(headers) ?? "";

    // Staat je PLZ-Form vorbelegen, soweit die Form eindeutig ist. Steht in der
    // Maske zur Bestaetigung, wird also nicht still entschieden.
    const mapping = guessMapping(headers);
    const staatProForm: Record<string, string> = {};
    if (mapping.plz) {
      for (const g of plzGruppen(rows.map((r) => r[mapping.plz!] ?? ""))) {
        staatProForm[g.form] = g.vorschlag;
      }
    }
    update({
      csvFile: file,
      csvHeaders: headers,
      csvRows: rows,
      mapping,
      staatProForm,
      anredezeileConfig: opts?.forceAutoTemplate
        ? { mode: "auto", template: opts.forceAutoTemplate, geschlechtSpalte: guessedGeschlecht }
        : guessedColumn
          ? { mode: "column", column: guessedColumn }
          : { mode: "auto", template: "liebe-vorname", geschlechtSpalte: guessedGeschlecht },
    });
  }

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) {
      update({ csvFile: null, csvHeaders: [], csvRows: [], mapping: {} });
      return;
    }
    try {
      const text = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0) throw new Error("Konnte keine Spaltenüberschriften finden.");
      applyParsedCsv(file, headers, rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV konnte nicht gelesen werden.");
      update({ csvFile: null, csvHeaders: [], csvRows: [], mapping: {} });
    }
  }

  async function handleUseSample() {
    setError(null);
    setLoadingSample(true);
    try {
      // Ohne "no-store" liefert der Browser die Musterdatei aus seinem Cache
      // (statische Dateien werden mit vier Stunden Haltbarkeit ausgeliefert).
      // Nach einer Erweiterung der Datei fehlten dann Spalten, die es laengst
      // gibt - und niemand kommt auf die Idee, dass der Browser schuld ist.
      // Die Datei ist ein paar hundert Byte gross, das Caching bringt hier nichts.
      const res = await fetch(SAMPLE_CSV_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error("Musterdatei konnte nicht geladen werden.");
      const buf = new Uint8Array(await res.arrayBuffer());
      const file = new File([buf], SAMPLE_CSV_NAME, { type: "text/csv" });
      const text = decodeCsvBytes(buf);
      const { headers, rows } = parseCsv(text);
      // Musterdatei enthält bewusst keine fertige Anredezeile-Spalte, damit die
      // automatische Bildung (samt Geschlechts-Spalte) sichtbar wird.
      applyParsedCsv(file, headers, rows, { forceAutoTemplate: "liebe-vorname-nachname" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Musterdatei konnte nicht geladen werden.");
    } finally {
      setLoadingSample(false);
    }
  }

  const usesBeitragsgrafik = /\{\{\s*Beitragsgrafik\s*\}\}/.test(state.bodyHtml);

  let preview: Recipient[] = [];
  let mappingError: string | null = null;
  if (state.csvRows.length > 0) {
    try {
      preview = applyMapping(state.csvRows.slice(0, 5), state.mapping, state.anredezeileConfig, {
        requireEmployerFields: state.absenderAusCsv,
        requireChartFields: usesBeitragsgrafik,
        requireLoginFields: state.zugangsdatenZeigen,
        staatProForm: state.staatProForm,
      });
    } catch (e) {
      mappingError = e instanceof Error ? e.message : "Zuordnung unvollständig.";
    }
  }

  const usingSample = state.csvFile?.name === SAMPLE_CSV_NAME;

  /**
   * Anschriften, deren Postleitzahl nicht dem deutschen Format entspricht -
   * gruppiert nach Form. Nur diese werden abgefragt; fünfstellige PLZ gelten als
   * Inland und bekommen keine Staatszeile.
   *
   * Ist eine Staat-Spalte zugeordnet, entfällt die Abfrage: dann gewinnt ohnehin
   * die Spalte.
   */
  /** Staat-Spalte in der Vorschau nur zeigen, wenn es ueberhaupt Ausland gibt. */
  const zeigeStaat = !!state.mapping.staat || Object.values(state.staatProForm).some((v) => v !== "");

  const auslandsGruppen = useMemo(() => {
    if (state.mapping.staat) return [];
    const plzSpalte = state.mapping.plz;
    if (!plzSpalte || state.csvRows.length === 0) return [];
    return plzGruppen(state.csvRows.map((r) => r[plzSpalte] ?? "")).filter(
      (g) => g.form !== "#####"
    );
  }, [state.mapping.staat, state.mapping.plz, state.csvRows]);

  // Nur im Modus "automatisch generieren" relevant; im Spalten-Modus kommt die
  // Anredezeile fertig aus der CSV und ein Geschlecht wird nicht gebraucht.
  const geschlechtSpalte =
    state.anredezeileConfig.mode === "auto" ? (state.anredezeileConfig.geschlechtSpalte ?? "") : "";
  const aktuellesTemplate: AnredeTemplateId =
    state.anredezeileConfig.mode === "auto" ? state.anredezeileConfig.template : "liebe-vorname";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Adressliste (CSV)</h2>
        <p className="text-sm text-slate-500">
          Lade die CSV-Datei mit den Empfängerdaten hoch und ordne die Spalten den benötigten
          Feldern zu.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FileUploadButton accept=".csv,text/csv" onChange={handleFile} label="CSV-Datei auswählen" />
        <span className="text-xs text-slate-400">oder</span>
        <button
          type="button"
          onClick={handleUseSample}
          disabled={loadingSample}
          className="rounded-lg border border-dashed border-sky-400 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
        >
          {loadingSample ? "Lade Musterdatei…" : "Musterdatei verwenden (2 Testdatensätze)"}
        </button>
      </div>

      {state.csvFile && !error && (
        <p className="text-sm text-slate-700">
          Ausgewählt: <span className="font-medium">{state.csvFile.name}</span>
          {usingSample && <span className="ml-1 text-slate-400">(eingebaute Musterdatei)</span>}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {state.csvHeaders.length > 0 && (
        <>
          <p className="text-sm text-slate-600">
            {state.csvRows.length} Zeile{state.csvRows.length === 1 ? "" : "n"} gefunden.
          </p>

          {state.csvRows.length > MAX_RECIPIENTS && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              Die Liste wird in {Math.ceil(state.csvRows.length / MAX_RECIPIENTS)} Paketen zu je
              höchstens {MAX_RECIPIENTS} Empfängern erzeugt und am Ende zu{" "}
              <b>einer PDF</b> zusammengefügt. Du musst nichts aufteilen — lass das Fenster
              währenddessen nur offen.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SIMPLE_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-sm font-medium">{field.label}</label>
                <select
                  value={state.mapping[field.key] ?? ""}
                  onChange={(e) =>
                    update({ mapping: { ...state.mapping, [field.key]: e.target.value || undefined } })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">— Spalte wählen —</option>
                  {state.csvHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <p className="mt-0.5 text-xs text-slate-400">{field.hint}</p>
              </div>
            ))}
          </div>

          {auslandsGruppen.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <label className="mb-1 block text-sm font-medium text-amber-900">
                Anschriften im Ausland — Staat festlegen
              </label>
              <p className="mb-3 text-xs text-amber-800">
                Die Liste enthält Postleitzahlen, die nicht dem deutschen Format entsprechen. Der
                Staat steht in keiner Spalte, lässt sich aber an der Form erkennen. Bitte je Form
                einmal bestätigen — er erscheint dann in Großbuchstaben als letzte Zeile der
                Anschrift. Bleibt ein Feld leer, wird kein Staat gedruckt.
              </p>
              <div className="space-y-2">
                {auslandsGruppen.map((g) => (
                  <div key={g.form} className="flex flex-wrap items-center gap-2 text-sm">
                    <code className="rounded bg-white px-2 py-1 text-xs text-slate-700">
                      {g.beispiel}
                    </code>
                    <span className="text-xs text-slate-600">
                      {g.anzahl} Empfänger · {g.erklaerung}
                    </span>
                    <select
                      value={state.staatProForm[g.form] ?? ""}
                      onChange={(e) =>
                        update({
                          staatProForm: { ...state.staatProForm, [g.form]: e.target.value },
                        })
                      }
                      className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    >
                      {STAAT_AUSWAHL.map((land) => (
                        <option key={land} value={land}>
                          {land === "" ? "— kein Staat (Inland) —" : land}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.zugangsdatenZeigen && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4">
              <label className="mb-2 block text-sm font-medium">
                Persönliche Zugangsdaten (für Punkt 2 auf Seite 2)
              </label>
              <p className="mb-3 text-xs text-slate-500">
                „Persönliche Zugangsdaten“ ist in Schritt 3 aktiviert — bitte die beiden Spalten
                zuordnen. Der Freischaltcode oben bleibt davon unberührt, der steht weiter unter
                Punkt 3.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {LOGIN_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-sm font-medium">{field.label}</label>
                    <select
                      value={state.mapping[field.key] ?? ""}
                      onChange={(e) =>
                        update({ mapping: { ...state.mapping, [field.key]: e.target.value || undefined } })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">— Spalte wählen —</option>
                      {state.csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <p className="mt-0.5 text-xs text-slate-400">{field.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.absenderAusCsv && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4">
              <label className="mb-2 block text-sm font-medium">
                Arbeitgeber-Daten (für die Absenderzeile)
              </label>
              <p className="mb-3 text-xs text-slate-500">
                „Absender aus dCRYPT-CSV übernehmen“ ist in Schritt 1 aktiviert — bitte diese vier
                Spalten zuordnen. Die eingebaute Musterdatei enthält sie ebenfalls.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {EMPLOYER_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-sm font-medium">{field.label}</label>
                    <select
                      value={state.mapping[field.key] ?? ""}
                      onChange={(e) =>
                        update({ mapping: { ...state.mapping, [field.key]: e.target.value || undefined } })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">— Spalte wählen —</option>
                      {state.csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {usesBeitragsgrafik && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4">
              <label className="mb-2 block text-sm font-medium">Beitragsdaten (für die Beitragsgrafik)</label>
              <p className="mb-3 text-xs text-slate-500">
                Der Brieftext verwendet den Platzhalter <code>{"{{Beitragsgrafik}}"}</code> (Variante
                C) — bitte diese fünf Spalten zuordnen, typischerweise eine der drei
                dCRYPT-Beitragsvarianten (z.B. A1-Nettoeigenanteil, A1-Steuerersparnis usw.).
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {CHART_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-sm font-medium">{field.label}</label>
                    <select
                      value={state.mapping[field.key] ?? ""}
                      onChange={(e) =>
                        update({ mapping: { ...state.mapping, [field.key]: e.target.value || undefined } })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">— Spalte wählen —</option>
                      {state.csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <p className="mt-0.5 text-xs text-slate-400">{field.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 p-4">
            <label className="mb-2 block text-sm font-medium">Briefanredezeile</label>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => update({ anredezeileConfig: { mode: "column", column: state.csvHeaders[0] ?? "" } })}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  state.anredezeileConfig.mode === "column"
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-300 bg-white hover:bg-slate-100"
                }`}
              >
                Aus CSV-Spalte
              </button>
              <button
                type="button"
                onClick={() =>
                  update({
                    anredezeileConfig: {
                      mode: "auto",
                      template: "liebe-vorname",
                      geschlechtSpalte: guessGeschlechtColumn(state.csvHeaders) ?? "",
                    },
                  })
                }
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  state.anredezeileConfig.mode === "auto"
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-300 bg-white hover:bg-slate-100"
                }`}
              >
                Automatisch generieren
              </button>
            </div>

            {state.anredezeileConfig.mode === "column" ? (
              <select
                value={state.anredezeileConfig.column}
                onChange={(e) => update({ anredezeileConfig: { mode: "column", column: e.target.value } })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-1/2"
              >
                <option value="">— Spalte wählen —</option>
                {state.csvHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                <select
                  value={state.anredezeileConfig.template}
                  onChange={(e) =>
                    update({
                      anredezeileConfig: {
                        ...state.anredezeileConfig,
                        mode: "auto",
                        template: e.target.value as AnredeTemplateId,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-1/2"
                >
                  {ANREDE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {/* Mit Geschlechts-Spalte wird aus "Liebe:r" je Empfänger
                          "Lieber" oder "Liebe" - die Auswahlliste soll das zeigen. */}
                      {t.geschlechtsabhaengig && geschlechtSpalte
                        ? t.label.replace("Liebe:r", "Lieber/Liebe")
                        : t.label}
                    </option>
                  ))}
                </select>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Spalte „Geschlecht“ (optional)
                  </label>
                  <select
                    value={geschlechtSpalte}
                    onChange={(e) =>
                      update({
                        anredezeileConfig: {
                          ...state.anredezeileConfig,
                          mode: "auto",
                          template: aktuellesTemplate,
                          geschlechtSpalte: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-1/2"
                  >
                    <option value="">— ohne, geschlechtsneutral („Liebe:r“) —</option>
                    {state.csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Steht in der Spalte „männlich“ oder „m“, wird daraus <b>Lieber</b>, sonst{" "}
                    <b>Liebe</b>. Auch „Herr“, „Mann“ und „male“ werden als männlich erkannt. Ist
                    das Feld leer oder steht dort „divers“ bzw. „keine Angabe“, bleibt es bei
                    <b> Liebe:r</b> — ebenso ohne Spalte.
                  </p>
                </div>
              </div>
            )}
          </div>

          {mappingError && <p className="text-sm text-amber-600">{mappingError}</p>}

          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Vorname</th>
                    <th className="px-3 py-2 font-medium">Nachname</th>
                    <th className="px-3 py-2 font-medium">Briefanredezeile</th>
                    <th className="px-3 py-2 font-medium">Straße</th>
                    <th className="px-3 py-2 font-medium">PLZ</th>
                    <th className="px-3 py-2 font-medium">Ort</th>
                    {zeigeStaat && <th className="px-3 py-2 font-medium">Staat</th>}
                    <th className="px-3 py-2 font-medium">Freischaltcode</th>
                    {state.absenderAusCsv && (
                      <th className="px-3 py-2 font-medium">Absenderzeile</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2">{r.vorname}</td>
                      <td className="px-3 py-2">{r.nachname}</td>
                      <td className="px-3 py-2">{r.anredezeile}</td>
                      <td className="px-3 py-2">{r.strasse}</td>
                      <td className="px-3 py-2">{r.plz}</td>
                      <td className="px-3 py-2">{r.ort}</td>
                      {zeigeStaat && (
                        <td className="px-3 py-2 font-medium">{r.staat || "—"}</td>
                      )}
                      <td className="px-3 py-2">{r.freischaltcode}</td>
                      {state.absenderAusCsv && (
                        <td className="px-3 py-2">
                          {buildAbsenderzeile(
                            r.arbeitgebername,
                            r.arbeitgeberStrasse,
                            r.arbeitgeberPlz,
                            r.arbeitgeberOrt
                          ) || "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-400">
                Vorschau der ersten {preview.length} Zeilen
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
