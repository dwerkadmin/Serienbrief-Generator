"use client";

import { useState } from "react";
import { compressImageFile, dataUrlToFile } from "@/lib/clientImage";
import { buildAbsenderzeile } from "@/lib/absenderzeile";
import FileUploadButton from "./FileUploadButton";
import type { LogoPosition, StepProps } from "./wizardTypes";

const POSITIONS: { id: LogoPosition; label: string }[] = [
  { id: "left", label: "Oben links" },
  { id: "center", label: "Oben mittig" },
  { id: "right", label: "Oben rechts" },
];

/**
 * Neutrales Platzhalter-Logo ("COMPANY / SLOGAN") für Testläufe und
 * Vorführungen, wenn gerade kein Kundenlogo zur Hand ist. Liegt unter public/,
 * wird also wie jede andere statische Datei ausgeliefert; beim Klick holen wir
 * es und geben es in dieselbe Verarbeitung wie ein hochgeladenes Logo.
 * Der weiße Rand des Originals ist bewusst weggeschnitten - das Logo wird in
 * der PDF auf 22 mm Höhe eingepasst (.logo-header img in lib/pdf/buildHtml.ts)
 * und wirkte mit Rand darin viel zu klein.
 */
const BEISPIEL_LOGO_PFAD = "/beispiel/beispiel-logo.jpg";

const COLOR_SOURCE_LABEL: Record<string, string> = {
  "theme-color": "aus der theme-color der Webseite",
  "logo-pixel": "aus dem Logo geschätzt",
  "logo-svg": "aus dem Logo geschätzt",
};

export default function StepLetterhead({ state, update }: StepProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [fetchingLogo, setFetchingLogo] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [colorSourceNote, setColorSourceNote] = useState<string | null>(null);
  const [holeBeispielLogo, setHoleBeispielLogo] = useState(false);
  const [beispielLogoFehler, setBeispielLogoFehler] = useState<string | null>(null);

  async function handleLetterheadFile(file: File | null) {
    if (!file) {
      update({ letterheadFile: null });
      return;
    }
    const processed = file.type === "application/pdf" ? file : await compressImageFile(file);
    update({ letterheadFile: processed });
    if (processed.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(processed));
    } else {
      setPreview(null);
    }
  }

  async function handleLogoFile(file: File | null) {
    if (!file) {
      update({ logoFile: null });
      return;
    }
    const processed = await compressImageFile(file);
    update({ logoFile: processed });
    setPreview(URL.createObjectURL(processed));
    setColorSourceNote(null);
  }

  async function beispielLogoVerwenden() {
    setHoleBeispielLogo(true);
    setBeispielLogoFehler(null);
    try {
      const res = await fetch(BEISPIEL_LOGO_PFAD);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      await handleLogoFile(new File([blob], "beispiel-logo.jpg", { type: "image/jpeg" }));
    } catch {
      setBeispielLogoFehler("Beispiel-Logo konnte nicht geladen werden.");
    } finally {
      setHoleBeispielLogo(false);
    }
  }

  async function handleFetchLogo() {
    if (!logoUrlInput.trim()) return;
    setFetchingLogo(true);
    setFetchError(null);
    setColorSourceNote(null);
    try {
      const res = await fetch("/api/fetch-logo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: logoUrlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Logo konnte nicht geladen werden.");
      }
      const file = dataUrlToFile(data.logoDataUrl, "logo-von-webseite." + (data.logoMime === "image/svg+xml" ? "svg" : data.logoMime.split("/")[1]));
      const processed = file.type === "image/svg+xml" ? file : await compressImageFile(file);
      update({
        logoFile: processed,
        ...(data.suggestedColor ? { designColor: data.suggestedColor } : {}),
      });
      setPreview(URL.createObjectURL(processed));
      if (data.suggestedColor) {
        const recoloredHint = data.recolored
          ? " Das Logo war weiß (für farbige Hintergründe gedacht) und wurde automatisch in dieser Farbe eingefärbt, damit es auf weißem Papier sichtbar ist."
          : "";
        setColorSourceNote(
          `Design-Farbe ${data.suggestedColor} übernommen (${COLOR_SOURCE_LABEL[data.colorSource] ?? "automatisch erkannt"}) — unten anpassbar.${recoloredHint}`
        );
      } else {
        setColorSourceNote("Logo geladen. Es konnte aber keine Farbe automatisch erkannt werden — bitte unten manuell setzen.");
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Logo konnte nicht geladen werden.");
    } finally {
      setFetchingLogo(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Firmen-Briefbogen</h2>
        <p className="text-sm text-slate-500">
          Lade den Briefbogen deines Kunden hoch, oder nutze stattdessen nur ein Logo, falls kein
          fertiger Briefbogen vorliegt.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => update({ letterheadMode: "image" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.letterheadMode === "image" ? "border-sky-600 bg-sky-50" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Briefbogen hochladen</div>
          <div className="text-slate-500">PDF, PNG, JPEG oder WebP</div>
        </button>
        <button
          type="button"
          onClick={() => update({ letterheadMode: "logo" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.letterheadMode === "logo" ? "border-sky-600 bg-sky-50" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Kein Briefbogen — nur Logo</div>
          <div className="text-slate-500">Logo hochladen und Position wählen</div>
        </button>
        <button
          type="button"
          onClick={() => update({ letterheadMode: "logoUrl" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.letterheadMode === "logoUrl" ? "border-sky-600 bg-sky-50" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Logo von Webseite holen (experimentell)</div>
          <div className="text-slate-500">Adresse eingeben, Logo + Farbe automatisch übernehmen</div>
        </button>
      </div>

      {state.letterheadMode === "image" && (
        <div className="space-y-2">
          <FileUploadButton
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={handleLetterheadFile}
            label="Briefbogen auswählen"
          />
          <p className="text-xs text-slate-500">
            Word-Datei (.docx)? Bitte in Word einmal über „Datei &gt; Speichern unter &gt; PDF“
            exportieren und die PDF hier hochladen.
          </p>
          <p className="text-xs text-slate-500">
            Der Briefbogen sollte <strong>keine eigene Absenderzeile</strong> über dem Adressfeld
            enthalten — die App setzt die Absenderzeile (siehe unten) selbst darüber, sonst
            überlagern sich beide.
          </p>
          <p className="text-xs text-slate-500">
            Ein Briefbogen als PDF wird nicht komprimiert — hier lohnt es sich, auf eine schlanke
            PDF-Datei zu achten (kein hochauflösendes Hintergrundbild o.ä.), damit 4 MB nicht
            überschritten werden.
          </p>
          {state.letterheadFile && (
            <p className="text-sm text-slate-700">
              Ausgewählt: <span className="font-medium">{state.letterheadFile.name}</span>
            </p>
          )}
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vorschau Briefbogen" className="max-h-64 rounded border border-slate-200" />
          )}
        </div>
      )}

      {state.letterheadMode === "logo" && (
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileUploadButton
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoFile}
                label="Logo auswählen"
              />
              <span className="text-xs text-slate-400">oder</span>
              <button
                type="button"
                onClick={beispielLogoVerwenden}
                disabled={holeBeispielLogo}
                title="Neutrales Platzhalter-Logo, wenn gerade kein Kundenlogo zur Hand ist"
                className="flex items-center gap-2 rounded-lg border border-dashed border-slate-400 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={BEISPIEL_LOGO_PFAD} alt="" className="h-5 w-auto" />
                {holeBeispielLogo ? "wird geladen …" : "Beispiel-Logo verwenden"}
              </button>
            </div>
            {beispielLogoFehler && (
              <p className="mt-1 text-sm text-red-600">{beispielLogoFehler}</p>
            )}
            {state.logoFile && (
              <p className="mt-1 text-sm text-slate-700">
                Ausgewählt: <span className="font-medium">{state.logoFile.name}</span>
              </p>
            )}
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Vorschau Logo" className="mt-2 max-h-32 rounded border border-slate-200 bg-white p-2" />
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Position auf Seite 1</label>
            <div className="flex gap-2">
              {POSITIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => update({ logoPosition: p.id })}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    state.logoPosition === p.id
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-300 bg-white hover:bg-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.letterheadMode === "logoUrl" && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Webseite des Kunden</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={logoUrlInput}
                onChange={(e) => setLogoUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleFetchLogo();
                  }
                }}
                placeholder="www.musterfirma.de"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleFetchLogo}
                disabled={fetchingLogo || !logoUrlInput.trim()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {fetchingLogo ? "Lade…" : "Logo laden"}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Sucht auf der Startseite automatisch nach dem Logo (og:image, Header-Logo, Icon) und
              versucht, die CI-Hauptfarbe daraus bzw. aus der Seite zu erkennen. Experimentell —
              funktioniert nicht auf jeder Webseite gleich gut, bitte Ergebnis prüfen.
            </p>
            {fetchError && <p className="mt-2 text-sm text-red-600">{fetchError}</p>}
            {colorSourceNote && <p className="mt-2 text-sm text-emerald-700">{colorSourceNote}</p>}
          </div>

          {state.logoFile && (
            <>
              <div>
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Vorschau Logo" className="max-h-32 rounded border border-slate-200 bg-white p-2" />
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Position auf Seite 1</label>
                <div className="flex gap-2">
                  {POSITIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => update({ logoPosition: p.id })}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        state.logoPosition === p.id
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-slate-300 bg-white hover:bg-slate-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="border-t-2 border-sky-600 pt-6">
        <h3 className="mb-1 text-sm font-semibold">Absenderzeile</h3>
        <p className="mb-2 text-xs text-slate-500">
          Kleine Zeile über dem Adressfeld, z.B. für die Fensterlasche des Umschlags. Optional.
        </p>

        <label className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <input
            type="checkbox"
            checked={state.absenderAusCsv}
            onChange={(e) => update({ absenderAusCsv: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Absender aus dCRYPT-CSV übernehmen</span>
            <span className="block text-xs text-slate-500">
              Unternehmensname, Straße, PLZ und Ort der Absenderzeile werden dann je Empfänger aus
              der Adressliste gelesen (z.B. bei mehreren Arbeitgebern/Standorten in einer Liste) -
              die Spalten dafür ordnest du in Schritt 4 zu.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          {!state.absenderAusCsv && (
            <>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Unternehmensname</label>
                <input
                  type="text"
                  value={state.absenderUnternehmensname}
                  onChange={(e) => update({ absenderUnternehmensname: e.target.value })}
                  placeholder="Musterfirma GmbH"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Straße und Hausnummer</label>
                <input
                  type="text"
                  value={state.absenderStrasse}
                  onChange={(e) => update({ absenderStrasse: e.target.value })}
                  placeholder="Musterstraße 1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">PLZ</label>
                <input
                  type="text"
                  value={state.absenderPlz}
                  onChange={(e) => update({ absenderPlz: e.target.value })}
                  placeholder="12345"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Ort</label>
                <input
                  type="text"
                  value={state.absenderOrt}
                  onChange={(e) => update({ absenderOrt: e.target.value })}
                  placeholder="Musterstadt"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
        </div>

        {state.absenderAusCsv ? (
          <p className="mt-2 text-xs text-slate-500">
            Vorschau je Empfänger erst nach Zuordnung der Arbeitgeber-Spalten in Schritt 4 möglich.
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            Vorschau:{" "}
            <span className="font-medium text-slate-700">
              {buildAbsenderzeile(
                state.absenderUnternehmensname,
                state.absenderStrasse,
                state.absenderPlz,
                state.absenderOrt
              ) || "—"}
            </span>
          </p>
        )}
      </div>

      <div className="border-t-2 border-sky-600 pt-6">
        <h3 className="mb-1 text-sm font-semibold">Design-Farbe</h3>
        <p className="mb-2 text-xs text-slate-500">
          Wird für die Überschrift auf Seite 1 sowie Nummerierungen, Striche und Linien auf Seite 2
          verwendet.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(state.designColor) ? state.designColor : "#000000"}
            onChange={(e) => update({ designColor: e.target.value.toUpperCase() })}
            className="h-9 w-14 cursor-pointer rounded border border-slate-300"
          />
          <input
            type="text"
            value={state.designColor}
            onChange={(e) => update({ designColor: e.target.value })}
            placeholder="#000000"
            maxLength={7}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          />
          {!/^#[0-9a-fA-F]{6}$/.test(state.designColor) && (
            <span className="text-xs text-red-600">Bitte gültigen Hex-Wert angeben, z.B. #1E6FA6</span>
          )}
        </div>
      </div>
    </div>
  );
}
