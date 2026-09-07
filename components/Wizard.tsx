"use client";

import { useState } from "react";
import StepLetterhead from "./StepLetterhead";
import StepText from "./StepText";
import StepPhoto from "./StepPhoto";
import StepAddresses from "./StepAddresses";
import FileUploadButton from "./FileUploadButton";
import { applyMapping } from "@/lib/csv/parseAddresses";
import { buildConfigExport, parseConfigImport } from "@/lib/configExport";
import { CUSTOM_FONT_ID } from "@/lib/fonts";
import { initialWizardState, type WizardState } from "./wizardTypes";

const STEPS = [
  { id: 1, label: "Briefbogen" },
  { id: 2, label: "Anschreiben" },
  { id: 3, label: "Seite 2" },
  { id: 4, label: "Adressliste" },
] as const;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function buildFormData(state: WizardState): FormData {
  const fd = new FormData();
  // "logoUrl" ist nur eine client-seitige Auswahl (siehe wizardTypes.ts) - fürs
  // Backend ist ein per Webseite geholtes Logo identisch zu einem hochgeladenen.
  const isLogoMode = state.letterheadMode === "logo" || state.letterheadMode === "logoUrl";
  fd.set("letterheadMode", isLogoMode ? "logo" : state.letterheadMode);
  if (state.letterheadMode === "image" && state.letterheadFile) {
    fd.set("letterheadFile", state.letterheadFile);
  }
  if (isLogoMode) {
    if (state.logoFile) fd.set("logoFile", state.logoFile);
    fd.set("logoPosition", state.logoPosition);
  }

  fd.set("designColor", state.designColor);
  fd.set("absenderUnternehmensname", state.absenderUnternehmensname);
  fd.set("absenderStrasse", state.absenderStrasse);
  fd.set("absenderPlz", state.absenderPlz);
  fd.set("absenderOrt", state.absenderOrt);
  fd.set("absenderAusCsv", String(state.absenderAusCsv));
  fd.set("bodyHtml", state.bodyHtml);
  fd.set("showHeadline", String(state.showHeadline));
  fd.set("headlineText", state.headlineText);
  fd.set("showDate", String(state.showDate));
  fd.set("dateMonthOffset", String(state.dateMonthOffset));
  fd.set("duSieMode", state.duSieMode);
  fd.set("fontId", state.fontId);
  if (state.fontId === CUSTOM_FONT_ID && state.customFontFile) {
    fd.set("customFontFile", state.customFontFile);
  }
  fd.set("fontSizePt", String(state.fontSizePt));
  fd.set("ansprechpartnerAnrede", state.ansprechpartnerAnrede);
  fd.set("ansprechpartnerName", state.ansprechpartnerName);
  fd.set("ansprechpartnerTelefon", state.ansprechpartnerTelefon);
  fd.set("ansprechpartnerEmail", state.ansprechpartnerEmail);

  fd.set("photoMode", state.photoMode);
  if (state.photoMode === "upload" && state.photoFile) fd.set("photoFile", state.photoFile);
  if (state.photoMode === "stock") fd.set("stockPhotoId", state.stockPhotoId);
  fd.set("beratungslinkSubdomain", state.beratungslinkSubdomain);
  fd.set("beratungslinkDomain", state.beratungslinkDomain);

  if (state.csvFile) fd.set("csvFile", state.csvFile);
  fd.set("mapping", JSON.stringify(state.mapping));
  fd.set("anredezeileConfig", JSON.stringify(state.anredezeileConfig));

  return fd;
}

export default function Wizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialWizardState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  function update(patch: Partial<WizardState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  async function handleExportConfig() {
    setConfigMessage(null);
    try {
      const json = await buildConfigExport(state);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStamp = new Date().toISOString().slice(0, 10);
      const nameHint = state.absenderUnternehmensname.trim() || "Konfiguration";
      a.download = `Serienbrief-${nameHint} - ${dateStamp}.json`.replace(/[\\/:*?"<>|]/g, "-");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setConfigMessage("Konfiguration wurde als Datei heruntergeladen.");
    } catch {
      setConfigMessage("Konfiguration konnte nicht gespeichert werden.");
    }
  }

  async function handleImportConfig(file: File | null) {
    if (!file) return;
    setConfigMessage(null);
    try {
      const text = await file.text();
      const patch = parseConfigImport(text);
      update(patch);
      setConfigMessage("Konfiguration wurde geladen. Adressliste (Schritt 4) bitte separat hochladen.");
      setStep(1);
    } catch (e) {
      setConfigMessage(e instanceof Error ? e.message : "Konfiguration konnte nicht geladen werden.");
    }
  }

  function validate(): string | null {
    if (state.letterheadMode === "image" && !state.letterheadFile) {
      setStep(1);
      return "Bitte einen Briefbogen hochladen (Schritt 1).";
    }
    if (state.letterheadMode === "logo" && !state.logoFile) {
      setStep(1);
      return "Bitte ein Logo hochladen (Schritt 1).";
    }
    if (state.letterheadMode === "logoUrl" && !state.logoFile) {
      setStep(1);
      return "Bitte ein Logo von einer Webseite laden (Schritt 1).";
    }
    if (!HEX_COLOR_RE.test(state.designColor)) {
      setStep(1);
      return "Bitte eine gültige Design-Farbe als Hex-Wert angeben (Schritt 1).";
    }
    if (!state.bodyHtml || state.bodyHtml.replace(/<[^>]+>/g, "").trim() === "") {
      setStep(2);
      return "Bitte einen Anschreibentext eingeben (Schritt 2).";
    }
    if (state.fontId === CUSTOM_FONT_ID && !state.customFontFile) {
      setStep(2);
      return "Bitte eine eigene Schriftart-Datei (TTF/OTF) hochladen (Schritt 2).";
    }
    if (state.showHeadline && state.headlineText.trim() === "") {
      setStep(2);
      return "Bitte einen Text für die Überschrift eingeben oder sie deaktivieren (Schritt 2).";
    }
    const usesAnsprechpartner = /\{\{\s*Ansprechpartner(Name|Telefon|Email)\s*\}\}/.test(state.bodyHtml);
    if (
      usesAnsprechpartner &&
      (!state.ansprechpartnerName.trim() || !state.ansprechpartnerTelefon.trim() || !state.ansprechpartnerEmail.trim())
    ) {
      setStep(2);
      return "Der Brieftext verwendet die Ansprechpartner-Platzhalter - bitte Name, Telefonnummer und E-Mail des bAV-Ansprechpartners angeben (Schritt 2).";
    }
    if (state.photoMode === "upload" && !state.photoFile) {
      setStep(3);
      return "Bitte ein Headerfoto hochladen (Schritt 3).";
    }
    if (!state.beratungslinkSubdomain.trim()) {
      setStep(3);
      return "Bitte die Subdomain für den Beratungslink angeben (Schritt 3).";
    }
    if (!state.csvFile || state.csvRows.length === 0) {
      setStep(4);
      return "Bitte eine Adressliste hochladen (Schritt 4).";
    }
    try {
      applyMapping(state.csvRows, state.mapping, state.anredezeileConfig, {
        requireEmployerFields: state.absenderAusCsv,
      });
    } catch (e) {
      setStep(4);
      return e instanceof Error ? e.message : "Spalten-Zuordnung unvollständig (Schritt 4).";
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/generate", { method: "POST", body: buildFormData(state) });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler beim Erstellen (Status ${res.status}).`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Serienbriefe.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(state.csvRows.length);
    } catch {
      setError("Netzwerkfehler beim Erstellen der PDF. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-3 text-2xl font-semibold">Serienbrief-Generator / Mitarbeiteranschreiben</h1>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleExportConfig}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Konfiguration speichern
        </button>
        <FileUploadButton accept=".json,application/json" onChange={handleImportConfig} label="Konfiguration laden" />
        <span className="text-xs text-slate-400">
          Sichert/lädt Briefbogen, Texte, Design und Ansprechpartner als Datei - ohne Adressliste.
        </span>
      </div>
      {configMessage && (
        <p className="mb-4 text-sm text-slate-600">{configMessage}</p>
      )}

      <div className="mb-6 flex gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm ${
              step === s.id
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s.id}. {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 1 && <StepLetterhead state={state} update={update} />}
        {step === 2 && <StepText state={state} update={update} />}
        {step === 3 && <StepPhoto state={state} update={update} />}
        {step === 4 && <StepAddresses state={state} update={update} />}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {done !== null && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Fertig! Die PDF mit {done} Empfänger{done === 1 ? "" : "n"} (à 2 Seiten) wurde
          heruntergeladen.
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-40"
        >
          Zurück
        </button>

        {step < STEPS.length ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Weiter
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {submitting ? "Erstelle PDF…" : "Serienbriefe erstellen"}
          </button>
        )}
      </div>
    </div>
  );
}
