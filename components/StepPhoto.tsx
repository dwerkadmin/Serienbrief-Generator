"use client";

import { useState } from "react";
import { compressImageFile } from "@/lib/clientImage";
import { BERATUNGSLINK_DOMAINS, buildBeratungslinkUrl } from "@/lib/beratungslink";
import { STOCK_PHOTOS, stockPhotoPublicPath } from "@/lib/stockPhotos";
import { overlayStandardText } from "@/lib/seite2Overlay";
import {
  beratungQrStandardUeberschrift,
  istBeratungQrUrlGueltig,
  normalisiereBeratungQrUrl,
} from "@/lib/beratungQr";
import FileUploadButton from "./FileUploadButton";
import type { StepProps } from "./wizardTypes";

export default function StepPhoto({ state, update }: StepProps) {
  const [preview, setPreview] = useState<string | null>(null);

  async function handlePhotoFile(file: File | null) {
    if (!file) {
      update({ photoFile: null });
      return;
    }
    const processed = await compressImageFile(file);
    update({ photoFile: processed });
    setPreview(URL.createObjectURL(processed));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Headerbild für Seite 2</h2>
        <p className="text-sm text-slate-500">
          Lade ein eigenes Foto/Illustration hoch, oder wähle eines der 6 Standardmotive.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => update({ photoMode: "upload" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.photoMode === "upload" ? "border-sky-600 bg-sky-50" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Eigenes Foto hochladen</div>
        </button>
        <button
          type="button"
          onClick={() => update({ photoMode: "stock" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.photoMode === "stock" ? "border-sky-600 bg-sky-50" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Standardmotiv wählen</div>
        </button>
      </div>

      {state.photoMode === "upload" && (
        <div className="space-y-2">
          <FileUploadButton
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePhotoFile}
            label="Foto auswählen"
          />
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Empfohlene Auflösung: mindestens <strong>1200 px breit</strong> (Seitenverhältnis ca.
            2,7 : 1, z.B. 1600 × 600 px) für einen scharfen Druck über die volle Seitenbreite.
          </p>
          {state.photoFile && (
            <p className="text-sm text-slate-700">
              Ausgewählt: <span className="font-medium">{state.photoFile.name}</span>
            </p>
          )}
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vorschau Headerfoto" className="max-h-40 w-full rounded border border-slate-200 object-cover" />
          )}
        </div>
      )}

      {state.photoMode === "stock" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STOCK_PHOTOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => update({ stockPhotoId: p.id })}
              className={`overflow-hidden rounded-lg border-2 text-left ${
                state.stockPhotoId === p.id ? "border-sky-600" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stockPhotoPublicPath(p.id)}
                alt={p.label}
                className="aspect-[21/10] w-full object-cover"
              />
              <div className="bg-slate-50 px-2 py-1 text-xs text-slate-600">{p.label}</div>
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={state.zugangsdatenZeigen}
            onChange={(e) => update({ zugangsdatenZeigen: e.target.checked })}
            className="h-4 w-4 accent-sky-600"
          />
          Persönliche Zugangsdaten statt „Allgemeine Informationen“
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Für Kampagnen mit Anmeldemaske: Unter Punkt 2 auf Seite 2 stehen dann{" "}
          <b>Nutzername und Passwort</b> des jeweiligen Empfängers statt der allgemeinen Erklärung.
          Punkt 3 mit dem Freischaltcode bleibt unverändert.
        </p>
        {state.zugangsdatenZeigen && (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            In Schritt 4 müssen dafür zwei weitere Spalten zugeordnet werden:{" "}
            <b>Nutzername</b> und <b>Passwort</b> (in dCRYPT-Exporten die Spalte
            „Portalpasswort“).
          </p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={state.overlayZeigen}
            onChange={(e) => update({ overlayZeigen: e.target.checked })}
            className="h-4 w-4 accent-sky-600"
          />
          Schriftzug über dem Headerbild anzeigen
        </label>
        <p className="mb-2 mt-1 text-xs text-slate-500">
          Der dunkel hinterlegte Text unten links im Bild. Ohne Haken bleibt das Bild
          unbeschriftet.
        </p>

        {state.overlayZeigen && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Eigener Text (optional)
            </label>
            <textarea
              value={state.overlayText}
              onChange={(e) => update({ overlayText: e.target.value })}
              rows={2}
              placeholder={overlayStandardText(state.duSieMode)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Leer lassen für den Standardtext. Jede Zeile wird als eigene Zeile gesetzt — zwei
              kurze Zeilen wirken auf dem Bild besser als eine lange.
            </p>
          </div>
        )}
      </div>

      <div className="border-t-2 border-sky-600 pt-6">
        <label className="mb-1 block text-sm font-medium">Beratungslink-URL</label>
        <p className="mb-2 text-xs text-slate-500">
          Wird auf Seite 2 als Link angezeigt und als QR-Code eingebettet. Nur die Subdomain
          eingeben, die Endung wird automatisch ergänzt.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">https://</span>
          <input
            type="text"
            value={state.beratungslinkSubdomain}
            onChange={(e) => update({ beratungslinkSubdomain: e.target.value })}
            placeholder="mustermann"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm sm:max-w-[220px]"
          />
          <span className="text-sm text-slate-500">.</span>
          <select
            value={state.beratungslinkDomain}
            onChange={(e) => update({ beratungslinkDomain: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {BERATUNGSLINK_DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        {state.beratungslinkSubdomain.trim() ? (
          <p className="mt-2 text-xs text-slate-500">
            Vorschau:{" "}
            <span className="font-medium text-slate-700">
              {buildBeratungslinkUrl(state.beratungslinkSubdomain, state.beratungslinkDomain)}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-600">Bitte eine Subdomain eingeben, z.B. „mustermann“.</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={state.beratungQrAktiv}
            onChange={(e) => update({ beratungQrAktiv: e.target.checked })}
            className="h-4 w-4 accent-sky-600"
          />
          QR-Code für die persönliche Beratung anzeigen
        </label>
        <p className="mb-2 mt-1 text-xs text-slate-500">
          Zusätzlicher Block am Fuß von Seite 2 mit einem eigenen QR-Code, z.B. zur
          Terminbuchung oder einem Kontaktformular. Name, Telefon und E-Mail des
          Ansprechpartners aus Schritt 2 stehen dort mit dabei.
        </p>

        {state.beratungQrAktiv && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Adresse, auf die der QR-Code zeigt
              </label>
              <input
                type="text"
                value={state.beratungQrUrl}
                onChange={(e) => update({ beratungQrUrl: e.target.value })}
                placeholder="z.B. beratung.beispiel.de/termin"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {state.beratungQrUrl.trim() === "" ? (
                <p className="mt-1 text-xs text-amber-600">
                  Bitte eine Adresse eingeben oder die Option oben abwählen.
                </p>
              ) : istBeratungQrUrlGueltig(state.beratungQrUrl) ? (
                <p className="mt-1 text-xs text-slate-500">
                  QR-Code zeigt auf:{" "}
                  <span className="font-medium text-slate-700">
                    {normalisiereBeratungQrUrl(state.beratungQrUrl)}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-red-600">
                  Das ergibt keine gültige Adresse. Bitte prüfen, z.B. „beratung.beispiel.de/termin“.
                </p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={state.beratungQrKontaktZeigen}
                  onChange={(e) => update({ beratungQrKontaktZeigen: e.target.checked })}
                  className="h-4 w-4 accent-sky-600"
                />
                Kontaktzeile mit dem Ansprechpartner einblenden
              </label>
              {state.beratungQrKontaktZeigen ? (
                <div className="mt-2 space-y-1.5 pl-6">
                  <p className="text-xs text-slate-500">
                    Der Name wird immer angezeigt. Zusätzlich:
                  </p>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={state.beratungQrKontaktTelefon}
                      onChange={(e) => update({ beratungQrKontaktTelefon: e.target.checked })}
                      className="h-4 w-4 accent-sky-600"
                    />
                    Telefonnummer
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={state.beratungQrKontaktEmail}
                      onChange={(e) => update({ beratungQrKontaktEmail: e.target.checked })}
                      className="h-4 w-4 accent-sky-600"
                    />
                    E-Mail-Adresse
                  </label>
                  <p className="pt-1 text-xs text-slate-500">
                    Vorschau:{" "}
                    <span className="font-medium text-slate-700">
                      {[
                        `${state.ansprechpartnerAnrede} ${state.ansprechpartnerName}`.trim(),
                        state.beratungQrKontaktTelefon ? state.ansprechpartnerTelefon.trim() : "",
                        state.beratungQrKontaktEmail ? state.ansprechpartnerEmail.trim() : "",
                      ]
                        .filter((t) => t !== "")
                        .join(" · ") || "(Ansprechpartner in Schritt 2 noch nicht ausgefüllt)"}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-1 pl-6 text-xs text-slate-500">
                  Im Block steht dann nur die Überschrift, der Hinweistext und der QR-Code.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Überschrift (optional)
              </label>
              <input
                type="text"
                value={state.beratungQrUeberschrift}
                onChange={(e) => update({ beratungQrUeberschrift: e.target.value })}
                placeholder={beratungQrStandardUeberschrift(state.duSieMode)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Leer lassen für den Standardtext, der sich automatisch an die Du/Sie-Anrede aus
                Schritt 2 anpasst.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
