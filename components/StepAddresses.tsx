"use client";

import { useState } from "react";
import { buildAbsenderzeile } from "@/lib/absenderzeile";
import {
  ANREDE_TEMPLATES,
  CHART_FIELDS,
  EMPLOYER_FIELDS,
  MAX_RECIPIENTS,
  SIMPLE_FIELDS,
  applyMapping,
  decodeCsvBytes,
  guessAnredezeileColumn,
  guessMapping,
  parseCsv,
  splitCsvIntoChunks,
  type AnredeTemplateId,
  type Recipient,
} from "@/lib/csv/parseAddresses";
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
    update({
      csvFile: file,
      csvHeaders: headers,
      csvRows: rows,
      mapping: guessMapping(headers),
      anredezeileConfig: opts?.forceAutoTemplate
        ? { mode: "auto", template: opts.forceAutoTemplate }
        : guessedColumn
          ? { mode: "column", column: guessedColumn }
          : { mode: "auto", template: "liebe-vorname" },
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
      const res = await fetch(SAMPLE_CSV_PATH);
      if (!res.ok) throw new Error("Musterdatei konnte nicht geladen werden.");
      const buf = new Uint8Array(await res.arrayBuffer());
      const file = new File([buf], SAMPLE_CSV_NAME, { type: "text/csv" });
      const text = decodeCsvBytes(buf);
      const { headers, rows } = parseCsv(text);
      // Musterdatei enthält bewusst keine Anredezeile-Spalte -> immer automatisch generieren.
      applyParsedCsv(file, headers, rows, { forceAutoTemplate: "liebe-vorname-nachname" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Musterdatei konnte nicht geladen werden.");
    } finally {
      setLoadingSample(false);
    }
  }

  const [splitting, setSplitting] = useState(false);

  async function handleSplitAndDownload() {
    setSplitting(true);
    try {
      const chunks = splitCsvIntoChunks(state.csvHeaders, state.csvRows, MAX_RECIPIENTS);
      const baseName = (state.csvFile?.name ?? "adressliste").replace(/\.csv$/i, "");
      const digits = String(chunks.length).length;
      for (let i = 0; i < chunks.length; i++) {
        const partNum = String(i + 1).padStart(digits, "0");
        // UTF-8-BOM voranstellen, damit die Teildatei auch in Excel korrekt aufgeht
        // (die App selbst erkennt BOM/kein-BOM ohnehin robust, siehe decodeCsvBytes).
        const blob = new Blob(["﻿" + chunks[i]], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName} - Teil ${partNum} von ${chunks.length}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        // Kurze Pause zwischen den Downloads, sonst blockieren manche Browser
        // (Chrome/Edge) mehrere schnell aufeinanderfolgende automatische Downloads.
        if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 400));
      }
    } finally {
      setSplitting(false);
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
      });
    } catch (e) {
      mappingError = e instanceof Error ? e.message : "Zuordnung unvollständig.";
    }
  }

  const usingSample = state.csvFile?.name === SAMPLE_CSV_NAME;

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
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                Diese Liste enthält mehr als {MAX_RECIPIENTS} Empfänger und kann daher nicht in
                einem Lauf erzeugt werden (Zeitlimit der Plattform). Teile sie hier in mehrere
                Dateien mit je maximal {MAX_RECIPIENTS} Zeilen auf und lade sie danach nacheinander
                hier hoch, um mehrere PDF-Dateien zu erzeugen.
              </p>
              <button
                type="button"
                onClick={handleSplitAndDownload}
                disabled={splitting}
                className="mt-3 rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {splitting
                  ? "Erzeuge Teildateien…"
                  : `In ${Math.ceil(state.csvRows.length / MAX_RECIPIENTS)} Dateien aufteilen & herunterladen`}
              </button>
            </div>
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

          {state.absenderAusCsv && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4">
              <label className="mb-2 block text-sm font-medium">
                Arbeitgeber-Daten (für die Absenderzeile)
              </label>
              <p className="mb-3 text-xs text-slate-500">
                „Absender aus dCRYPT-CSV übernehmen“ ist in Schritt 1 aktiviert — bitte diese vier
                Spalten zuordnen. (Funktioniert nicht mit der CSV-Musterdatei)
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
                onClick={() => update({ anredezeileConfig: { mode: "auto", template: "liebe-vorname" } })}
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
              <select
                value={state.anredezeileConfig.template}
                onChange={(e) =>
                  update({ anredezeileConfig: { mode: "auto", template: e.target.value as AnredeTemplateId } })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-1/2"
              >
                {ANREDE_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
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
