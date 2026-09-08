"use client";

import { CUSTOM_FONT_ID, FONTS } from "@/lib/fonts";
import { STANDARD_TEXTS, getStandardText } from "@/lib/templates/standardTexts";
import type { StandardText, StandardTextVariant } from "@/lib/templates/standardTexts";
import FileUploadButton from "./FileUploadButton";
import RichTextEditor from "./RichTextEditor";
import type { StepProps } from "./wizardTypes";

const MERGE_FIELDS = [
  { token: "{{Anredezeile}}", label: "Anredezeile" },
  { token: "{{Vorname}}", label: "Vorname" },
  { token: "{{Nachname}}", label: "Nachname" },
  { token: "{{Freischaltcode}}", label: "Freischaltcode" },
  { token: "{{Unternehmensname}}", label: "Unternehmensname" },
  { token: "{{AnsprechpartnerAnrede}}", label: "Ansprechpartner: Anrede" },
  { token: "{{AnsprechpartnerName}}", label: "Ansprechpartner: Name" },
  { token: "{{AnsprechpartnerTelefon}}", label: "Ansprechpartner: Telefon" },
  { token: "{{AnsprechpartnerEmail}}", label: "Ansprechpartner: E-Mail" },
  { token: "{{Beitragsgrafik}}", label: "Beitragsgrafik (Variante C)" },
];

/** "August 2026" für den angegebenen Monats-Offset (0 = aktueller Monat). */
function monthYearLabel(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

/**
 * Standardvorlagen nach Variante gruppieren, je Variante eine Knopfzeile:
 * "j-du"/"j-sie" -> Variante A, "f-*" -> B, "c-*" -> C.
 *
 * Bewusst aus den Daten abgeleitet und nicht mehr fest zugeschnitten: die
 * frühere Fassung zeichnete STANDARD_TEXTS.slice(0,2) und .slice(2,4), wodurch
 * die später ergänzte Variante C unsichtbar blieb, obwohl Vorlagentext und
 * Beitragsgrafik längst funktionierten. Eine neue Variante erscheint hier jetzt
 * automatisch.
 */
function vorlagenNachVariante(): StandardText[][] {
  const gruppen = new Map<string, StandardText[]>();
  for (const t of STANDARD_TEXTS) {
    const variante = t.id.split("-")[0];
    const vorhandene = gruppen.get(variante);
    if (vorhandene) vorhandene.push(t);
    else gruppen.set(variante, [t]);
  }
  return [...gruppen.values()];
}

export default function StepText({ state, update }: StepProps) {
  const vorlagenZeilen = vorlagenNachVariante();

  function vorlageUebernehmen(id: StandardTextVariant) {
    const std = getStandardText(id);
    update({
      bodyHtml: std.bodyHtml,
      standardTextId: id,
      duSieMode: std.duSie,
      showHeadline: std.defaultHeadline !== "",
      headlineText: std.defaultHeadline,
    });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={state.showHeadline}
            onChange={(e) => update({ showHeadline: e.target.checked })}
            className="h-4 w-4 accent-sky-600"
          />
          Überschrift über der Anredezeile anzeigen
        </label>
        <p className="mb-2 mt-1 text-xs text-slate-500">
          Fett, etwas größer als der Fließtext, in der Design-Farbe (Schritt 1). Mehrzeilig möglich
          — z.B. „Warum Geld verschenken?“ + „Sparen Sie Steuern und Sozialabgaben mit unserer
          Hilfe!“.
        </p>
        {state.showHeadline && (
          <textarea
            value={state.headlineText}
            onChange={(e) => update({ headlineText: e.target.value })}
            rows={2}
            placeholder={"Warum Geld verschenken?\nSparen Sie Steuern und Sozialabgaben mit unserer Hilfe!"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold">Anschreibentext</h2>
        <p className="mb-3 text-sm text-slate-500">
          Wähle eine der {STANDARD_TEXTS.length} Standardvorlagen als Ausgangspunkt oder schreibe
          einen eigenen Text. Der Text bleibt danach frei bearbeitbar — Formatierung, Platzhalter
          usw.
        </p>
        {vorlagenZeilen.map((zeile, i) => (
          <div key={zeile[0].id} className={`flex flex-wrap gap-2${i > 0 ? " mt-2" : ""}`}>
            {zeile.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => vorlageUebernehmen(t.id)}
                aria-pressed={state.standardTextId === t.id}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  state.standardTextId === t.id
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-300 bg-white hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
            {/* "Leer beginnen" wird bewusst nie markiert: es ist eine Aktion, kein
                Zustand. standardTextId === null heißt sowohl "leer angefangen" als
                auch "unbekannt" (Konfigurationsdateien von vor diesem Feld) - eine
                Markierung würde dort fälschlich "leer" behaupten, obwohl ein
                vollständiger Brieftext geladen ist. */}
            {i === vorlagenZeilen.length - 1 && (
              <button
                type="button"
                onClick={() =>
                  update({ bodyHtml: "<p>{{Anredezeile}}</p><p></p>", standardTextId: null })
                }
                className="rounded-lg border border-dashed border-slate-400 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Leer beginnen
              </button>
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Brieftext (Seite 1)</label>
        <RichTextEditor
          value={state.bodyHtml}
          onChange={(html) => update({ bodyHtml: html })}
          mergeFields={MERGE_FIELDS}
          minHeight="280px"
        />
      </div>

      <div className="border-t-2 border-sky-600 pt-6">
        <h3 className="mb-1 text-sm font-semibold">Ansprechpartner bAV</h3>
        <p className="mb-2 text-xs text-slate-500">
          Wird über die Platzhalter in der Symbolleiste des Brieftext-Editors eingefügt
          (bereits in allen Standardvorlagen enthalten).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Anrede</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => update({ ansprechpartnerAnrede: "Frau" })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  state.ansprechpartnerAnrede === "Frau"
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-300 bg-white hover:bg-slate-100"
                }`}
              >
                Frau
              </button>
              <button
                type="button"
                onClick={() => update({ ansprechpartnerAnrede: "Herr" })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  state.ansprechpartnerAnrede === "Herr"
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-300 bg-white hover:bg-slate-100"
                }`}
              >
                Herr
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Vorname und Nachname</label>
            <input
              type="text"
              value={state.ansprechpartnerName}
              onChange={(e) => update({ ansprechpartnerName: e.target.value })}
              placeholder="Eva Mustermakler"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Telefonnummer</label>
            <input
              type="text"
              value={state.ansprechpartnerTelefon}
              onChange={(e) => update({ ansprechpartnerTelefon: e.target.value })}
              placeholder="01234 – 567890"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">E-Mail</label>
            <input
              type="text"
              value={state.ansprechpartnerEmail}
              onChange={(e) => update({ ansprechpartnerEmail: e.target.value })}
              placeholder="eva.mustermakler@makler.net"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={state.showDate}
            onChange={(e) => update({ showDate: e.target.checked })}
            className="h-4 w-4 accent-sky-600"
          />
          Datum anzeigen
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Rechts zwischen Adressfeld und Brieftext, Format „{monthYearLabel(0)}“, Schriftgröße wie
          Fließtext.
        </p>
        {state.showDate && (
          <select
            value={state.dateMonthOffset}
            onChange={(e) => update({ dateMonthOffset: Number(e.target.value) as 0 | 1 | 2 })}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-1/2"
          >
            <option value={0}>Aktueller Monat ({monthYearLabel(0)})</option>
            <option value={1}>Nächster Monat ({monthYearLabel(1)})</option>
            <option value={2}>Übernächster Monat ({monthYearLabel(2)})</option>
          </select>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Du/Sie-Anrede</label>
        <p className="mb-2 text-xs text-slate-500">
          Wird für den Overlay-Text auf dem Headerbild von Seite 2 verwendet („In nur drei
          Schritten in {state.duSieMode === "du" ? "deinen" : "Ihren"} sicheren Ruhestand“). Wird
          beim Klick auf eine Standardvorlage automatisch passend gesetzt.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => update({ duSieMode: "du" })}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              state.duSieMode === "du"
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-300 bg-white hover:bg-slate-100"
            }`}
          >
            Du
          </button>
          <button
            type="button"
            onClick={() => update({ duSieMode: "sie" })}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              state.duSieMode === "sie"
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-300 bg-white hover:bg-slate-100"
            }`}
          >
            Sie
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Schriftart</label>
          <select
            value={state.fontId}
            onChange={(e) => update({ fontId: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} ({f.hint})
              </option>
            ))}
            <option value={CUSTOM_FONT_ID}>Eigene Schriftart hochladen (TTF/OTF)</option>
          </select>
          {state.fontId === CUSTOM_FONT_ID && (
            <div className="mt-2 space-y-1.5">
              <FileUploadButton
                accept=".ttf,.otf"
                onChange={(file) => update({ customFontFile: file })}
                label="Schriftart-Datei auswählen"
              />
              {state.customFontFile && (
                <p className="text-xs text-slate-500">Ausgewählt: {state.customFontFile.name}</p>
              )}
              <p className="text-xs text-slate-500">
                TTF oder OTF, z.B. die Corporate-Schrift des Kunden. Bitte nur Schriften verwenden,
                für die ihr das Recht zur Einbettung in Dokumente habt.
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Schriftgröße</label>
          <select
            value={state.fontSizePt}
            onChange={(e) => update({ fontSizePt: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {[9, 10, 10.5, 11, 12, 13].map((pt) => (
              <option key={pt} value={pt}>
                {pt} pt
              </option>
            ))}
          </select>
        </div>
      </div>

    </div>
  );
}
