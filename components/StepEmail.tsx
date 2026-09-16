"use client";

import { useMemo, useState } from "react";
import { buildBeratungslinkUrl } from "@/lib/beratungslink";
import { normalisiereBeratungQrUrl } from "@/lib/beratungQr";
import { applyMapping } from "@/lib/csv/parseAddresses";
import { buildEmailHtml, betreffVorschlag, type EmailConfig } from "@/lib/email/buildEmailHtml";
import { EMPFAENGER_PLATZHALTER } from "@/lib/email/platzhalter";
import {
  BEISPIEL_WERTE,
  buildBrevoKontaktCsv,
  platzhalterEinsetzen,
  vorschauWerteAusEmpfaenger,
} from "@/lib/email/vorschau";
import type { StepProps } from "./wizardTypes";

/** Spalten, deren Name nach einer E-Mail-Adresse aussieht - als Vorauswahl. */
function rateEmailSpalte(headers: string[]): string {
  const treffer = headers.find((h) => /mail/i.test(h));
  return treffer ?? "";
}

function dateiNameStamm(firma: string): string {
  const stamm = firma.trim() || "Kampagne";
  return `${stamm} - ${new Date().toISOString().slice(0, 10)}`.replace(/[\\/:*?"<>|]/g, "-");
}

function downloadText(text: string, dateiname: string, typ: string) {
  const blob = new Blob([text], { type: typ });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function StepEmail({ state, update }: StepProps) {
  const [hinweis, setHinweis] = useState<string | null>(null);

  const emailSpalte = state.emailSpalte || rateEmailSpalte(state.csvHeaders);

  // Die Vorlage wird vollständig im Browser gebaut - es geht nichts an den
  // Server, so wie beim Rest des Generators auch.
  const basis: Omit<EmailConfig, "platzhalterStil"> = useMemo(
    () => ({
      designColor: state.designColor,
      duSieMode: state.duSieMode,
      showHeadline: state.showHeadline,
      headlineText: state.headlineText,
      bodyHtml: state.bodyHtml,
      unternehmensname: state.absenderUnternehmensname,
      absenderStrasse: state.absenderStrasse,
      absenderPlz: state.absenderPlz,
      absenderOrt: state.absenderOrt,
      ansprechpartnerAnrede: state.ansprechpartnerAnrede,
      ansprechpartnerName: state.ansprechpartnerName,
      ansprechpartnerTelefon: state.ansprechpartnerTelefon,
      ansprechpartnerEmail: state.ansprechpartnerEmail,
      beratungslinkUrl: buildBeratungslinkUrl(state.beratungslinkSubdomain, state.beratungslinkDomain),
      beratungQrAktiv: state.beratungQrAktiv,
      beratungQrUrl: normalisiereBeratungQrUrl(state.beratungQrUrl),
      beratungQrUeberschrift: state.beratungQrUeberschrift,
      beratungQrKontaktZeigen: state.beratungQrKontaktZeigen,
      beratungQrKontaktTelefon: state.beratungQrKontaktTelefon,
      beratungQrKontaktEmail: state.beratungQrKontaktEmail,
      logoUrl: state.emailLogoUrl,
      headerBildUrl: state.emailHeaderBildUrl,
    }),
    [state]
  );

  /** Die Vorlage zum Herunterladen - mit Platzhaltern in der gewählten Schreibweise. */
  const vorlage = useMemo(
    () => buildEmailHtml({ ...basis, platzhalterStil: state.emailPlatzhalterStil }),
    [basis, state.emailPlatzhalterStil]
  );

  /** Dieselbe Mail, aber mit echten Werten - damit die Vorschau zeigt, was ankommt. */
  const vorschau = useMemo(() => {
    const intern = buildEmailHtml({ ...basis, platzhalterStil: "intern" });
    let werte = BEISPIEL_WERTE;
    if (state.csvRows.length > 0) {
      try {
        const empfaenger = applyMapping(state.csvRows, state.mapping, state.anredezeileConfig);
        if (empfaenger.length > 0) werte = vorschauWerteAusEmpfaenger(empfaenger[0]);
      } catch {
        // Zuordnung in Schritt 4 noch unvollständig - dann eben Beispielwerte.
      }
    }
    return platzhalterEinsetzen(intern, werte);
  }, [basis, state.csvRows, state.mapping, state.anredezeileConfig]);

  const betreff = betreffVorschlag({ ...basis, platzhalterStil: state.emailPlatzhalterStil });
  const beratungslink = basis.beratungslinkUrl;

  async function kopieren(text: string, was: string) {
    try {
      await navigator.clipboard.writeText(text);
      setHinweis(`${was} in die Zwischenablage kopiert.`);
    } catch {
      setHinweis(`${was} konnte nicht kopiert werden - bitte die Datei herunterladen.`);
    }
  }

  function kontaktlisteHerunterladen() {
    setHinweis(null);
    if (state.csvRows.length === 0) {
      setHinweis("Bitte zuerst in Schritt 4 eine Adressliste hochladen.");
      return;
    }
    try {
      const empfaenger = applyMapping(state.csvRows, state.mapping, state.anredezeileConfig);
      const csv = buildBrevoKontaktCsv(empfaenger, emailSpalte);
      downloadText(csv, `Kontaktliste ${dateiNameStamm(state.absenderUnternehmensname)}.csv`, "text/csv;charset=utf-8");
      setHinweis(
        emailSpalte === ""
          ? `Kontaktliste mit ${empfaenger.length} Zeilen erstellt - die Spalte EMAIL ist leer, weil keine E-Mail-Spalte zugeordnet ist.`
          : `Kontaktliste mit ${empfaenger.length} Empfängern erstellt.`
      );
    } catch (e) {
      setHinweis(e instanceof Error ? e.message : "Die Adressliste konnte nicht gelesen werden (Schritt 4).");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">E-Mail-Vorlage</h2>
        <p className="text-sm text-slate-500">
          Dasselbe Anschreiben als HTML-Mail: ohne Anschriftenblock, und statt der QR-Codes gibt es
          Schaltflächen zum Anklicken. Die Vorlage lässt sich in Brevo oder ein anderes
          Newsletter-Werkzeug einfügen und von dort als Serienmail versenden.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <label className="mb-1 block text-sm font-medium">Schreibweise der Platzhalter</label>
        <p className="mb-3 text-xs text-slate-500">
          Namen, Anrede und Freischaltcode stehen in der Vorlage als Platzhalter. Welche Schreibweise
          richtig ist, hängt davon ab, womit versendet wird.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => update({ emailPlatzhalterStil: "brevo" })}
            className={`flex-1 rounded-lg border p-3 text-left text-sm ${
              state.emailPlatzhalterStil === "brevo" ? "border-sky-600 bg-sky-50" : "border-slate-300"
            }`}
          >
            <div className="font-medium">Für Brevo</div>
            <div className="mt-0.5 font-mono text-xs text-slate-500">{"{{ contact.VORNAME }}"}</div>
          </button>
          <button
            type="button"
            onClick={() => update({ emailPlatzhalterStil: "intern" })}
            className={`flex-1 rounded-lg border p-3 text-left text-sm ${
              state.emailPlatzhalterStil === "intern" ? "border-sky-600 bg-sky-50" : "border-slate-300"
            }`}
          >
            <div className="font-medium">Schreibweise des Generators</div>
            <div className="mt-0.5 font-mono text-xs text-slate-500">{"{{Vorname}}"}</div>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Logo-Adresse (optional)</label>
          <input
            type="url"
            value={state.emailLogoUrl}
            onChange={(e) => update({ emailLogoUrl: e.target.value })}
            placeholder="https://…/logo.png"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Kopfbild-Adresse (optional)</label>
          <input
            type="url"
            value={state.emailHeaderBildUrl}
            onChange={(e) => update({ emailHeaderBildUrl: e.target.value })}
            placeholder="https://…/header.jpg"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Bilder müssen im Internet erreichbar sein — am einfachsten in Brevo hochladen und die Adresse
        von dort einsetzen. Hochgeladene Dateien aus Schritt 1 und 3 lassen sich nicht verwenden:
        E-Mail-Programme zeigen eingebettete Bilder überwiegend nicht an. Ohne Adresse entfällt das
        jeweilige Bild, die Mail bleibt vollständig.
      </p>

      {beratungslink === "" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Für die Schaltfläche „Jetzt klicken und beraten lassen“ fehlt der Beratungslink aus
          Schritt 3. Ohne ihn erscheint in der Mail keine Schaltfläche.
        </p>
      )}

      <div className="rounded-lg border border-slate-200 p-4">
        <div className="mb-2 text-sm font-medium">Betreffvorschlag</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{betreff}</code>
          <button
            type="button"
            onClick={() => kopieren(betreff, "Betreff")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Kopieren
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            downloadText(
              vorlage,
              `E-Mail-Vorlage ${dateiNameStamm(state.absenderUnternehmensname)}.html`,
              "text/html;charset=utf-8"
            )
          }
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Vorlage herunterladen (.html)
        </button>
        <button
          type="button"
          onClick={() => kopieren(vorlage, "HTML-Quelltext")}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          HTML kopieren
        </button>
        <button
          type="button"
          onClick={kontaktlisteHerunterladen}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Kontaktliste für Brevo (.csv)
        </button>
      </div>

      {hinweis && <p className="text-sm text-slate-600">{hinweis}</p>}

      {state.csvHeaders.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium">Spalte mit der E-Mail-Adresse</label>
          <p className="mb-2 text-xs text-slate-500">
            Nur für die Kontaktliste. Für den gedruckten Serienbrief wird sie nicht gebraucht.
          </p>
          <select
            value={emailSpalte}
            onChange={(e) => update({ emailSpalte: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-sm"
          >
            <option value="">— keine —</option>
            {state.csvHeaders.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      )}

      <details className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Welche Kontakt-Attribute muss die Liste in Brevo haben?
        </summary>
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {EMPFAENGER_PLATZHALTER.map((p) => (
            <li key={p.intern}>
              <code className="font-mono text-slate-800">{p.brevoAttribut}</code> — {p.label}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Die Beitrags-Attribute werden nur gebraucht, wenn im Anschreiben die Beitragsgrafik
          vorkommt (Variante C). Unternehmensname und Ansprechpartner stehen bereits fest in der
          Vorlage und müssen nicht als Attribut gepflegt werden.
        </p>
      </details>

      <div>
        <div className="mb-2 text-sm font-medium">Vorschau</div>
        <p className="mb-2 text-xs text-slate-500">
          Mit den Daten des ersten Empfängers aus Schritt 4 — oder mit Beispielwerten, solange keine
          Adressliste geladen ist.
        </p>
        <iframe
          title="Vorschau der E-Mail"
          srcDoc={vorschau}
          sandbox=""
          className="h-[620px] w-full rounded-lg border border-slate-200 bg-white"
        />
      </div>
    </div>
  );
}
