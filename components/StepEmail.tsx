"use client";

import { useMemo, useState } from "react";
import { buildAbsenderzeile } from "@/lib/absenderzeile";
import { buildBeratungslinkUrl } from "@/lib/beratungslink";
import { normalisiereBeratungQrUrl } from "@/lib/beratungQr";
import { applyMapping } from "@/lib/csv/parseAddresses";
import { buildEmailHtml, betreffVorschlag, type EmailConfig } from "@/lib/email/buildEmailHtml";
import { stockPhotoOeffentlicheUrl } from "@/lib/email/bildAdressen";
import { STOCK_PHOTOS } from "@/lib/stockPhotos";
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

  // Erster Empfänger der Liste - liefert die Absenderzeile, wenn sie je
  // Empfänger aus der CSV kommt. Die Mail ist EIN Dokument; enthält die Liste
  // mehrere Arbeitgeber, kann im Fuß nur einer stehen.
  const ersterEmpfaenger = useMemo(() => {
    if (state.csvRows.length === 0) return null;
    try {
      return applyMapping(state.csvRows.slice(0, 1), state.mapping, state.anredezeileConfig)[0] ?? null;
    } catch {
      return null;
    }
  }, [state.csvRows, state.mapping, state.anredezeileConfig]);

  const mehrereArbeitgeber = useMemo(() => {
    if (!state.absenderAusCsv) return false;
    const spalte = state.mapping.arbeitgebername;
    if (!spalte) return false;
    return new Set(state.csvRows.map((r) => (r[spalte] ?? "").trim()).filter(Boolean)).size > 1;
  }, [state.absenderAusCsv, state.mapping, state.csvRows]);

  /** Vorbelegung des Fußtextes: Absenderzeile plus Kontaktdaten des Ansprechpartners. */
  const fusstextStandard = useMemo(() => {
    const ausCsv = state.absenderAusCsv && ersterEmpfaenger !== null;
    const absenderzeile = ausCsv
      ? buildAbsenderzeile(
          ersterEmpfaenger.arbeitgebername,
          ersterEmpfaenger.arbeitgeberStrasse,
          ersterEmpfaenger.arbeitgeberPlz,
          ersterEmpfaenger.arbeitgeberOrt
        )
      : buildAbsenderzeile(
          state.absenderUnternehmensname,
          state.absenderStrasse,
          state.absenderPlz,
          state.absenderOrt
        );

    const kontakt = [
      state.ansprechpartnerTelefon.trim() ? `Tel: ${state.ansprechpartnerTelefon.trim()}` : "",
      state.ansprechpartnerEmail.trim() ? `E-Mail: ${state.ansprechpartnerEmail.trim()}` : "",
    ]
      .filter((t) => t !== "")
      .join(" · ");

    return [absenderzeile, kontakt].filter((t) => t !== "").join("\n");
  }, [
    state.absenderAusCsv,
    state.absenderUnternehmensname,
    state.absenderStrasse,
    state.absenderPlz,
    state.absenderOrt,
    state.ansprechpartnerTelefon,
    state.ansprechpartnerEmail,
    ersterEmpfaenger,
  ]);

  const fusstext = state.emailFusstext ?? fusstextStandard;

  // Ein Standardmotiv aus Schritt 3 liegt öffentlich in diesem Generator und
  // lässt sich deshalb direkt in die Mail einbinden. Ein selbst hochgeladenes
  // Foto hat keine Adresse - dann bleibt nur das Feld unten.
  const motivUrl =
    state.photoMode === "stock" ? stockPhotoOeffentlicheUrl(state.stockPhotoId) : "";
  const motivName = STOCK_PHOTOS.find((p) => p.id === state.stockPhotoId)?.label ?? "";
  const headerBildUrl = state.emailHeaderBildUrl.trim() || motivUrl;

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
      fusstext,
      impressumUrl: state.emailImpressumUrl,
      datenschutzUrl: state.emailDatenschutzUrl,
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
      headerBildUrl,
      betreff: state.emailBetreff,
    }),
    [state, headerBildUrl, fusstext]
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

  const betreffStandard = betreffVorschlag(state.duSieMode);
  const betreff = state.emailBetreff.trim() || betreffStandard;
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

      <div className="rounded-lg border border-slate-200 p-4">
        <div className="mb-1 text-sm font-medium">Bilder im Kopf der Mail</div>
        <p className="mb-4 text-xs text-slate-500">
          Ganz oben steht das Unternehmenslogo, darunter das Kopfbild über die volle Breite.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Logo-Adresse</label>
            <input
              type="url"
              value={state.emailLogoUrl}
              onChange={(e) => update({ emailLogoUrl: e.target.value })}
              placeholder="https://…/logo.png"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              {state.emailLogoUrl.trim() === ""
                ? "Ohne Adresse erscheint kein Logo. Wurde das Logo in Schritt 1 von einer Webseite geholt, steht die Adresse hier automatisch."
                : "Wird ganz oben in der Mail angezeigt."}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Kopfbild-Adresse</label>
            <input
              type="url"
              value={state.emailHeaderBildUrl}
              onChange={(e) => update({ emailHeaderBildUrl: e.target.value })}
              placeholder={motivUrl || "https://…/header.jpg"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              {state.emailHeaderBildUrl.trim() !== "" ? (
                "Eigene Adresse — überschreibt das Motiv aus Schritt 3."
              ) : motivUrl ? (
                <>
                  Leer lassen: Es wird automatisch das Standardmotiv aus Schritt 3 verwendet
                  {motivName ? ` („${motivName}“)` : ""}. Die Mail lädt es von{" "}
                  <span className="break-all font-mono text-[11px] text-slate-600">{motivUrl}</span>
                </>
              ) : (
                "In Schritt 3 ist ein eigenes Foto hochgeladen — das hat keine Adresse im Internet. Bitte hier eine angeben oder das Feld leer lassen, dann entfällt das Kopfbild."
              )}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <b>Bilder werden nie in die Mail eingebettet</b>, sondern immer von einer Adresse geladen —
          eingebettete Dateien zeigen die meisten E-Mail-Programme nicht an. Zwei Adressen kennt der
          Generator selbst und setzt sie automatisch ein: die sechs Standardmotive (sie liegen
          öffentlich auf diesem Server) und ein Logo, das in Schritt 1 von einer Webseite geholt
          wurde. Nur selbst hochgeladene Dateien brauchen hier eine Adresse — am einfachsten in
          Brevo hochladen und die Adresse von dort einsetzen. Ohne Adresse entfällt das jeweilige
          Bild und die Mail bleibt vollständig.
        </p>
      </div>

      {beratungslink === "" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Für die Schaltfläche „Jetzt klicken und beraten lassen“ fehlt der Beratungslink aus
          Schritt 3. Ohne ihn erscheint in der Mail keine Schaltfläche.
        </p>
      )}

      <div className="rounded-lg border border-slate-200 p-4">
        <label className="mb-1 block text-sm font-medium">Betreff</label>
        <p className="mb-2 text-xs text-slate-500">
          Leer lassen für den Standardvorschlag: „{betreffStandard}“
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={state.emailBetreff}
            onChange={(e) => update({ emailBetreff: e.target.value })}
            placeholder={betreffStandard}
            className="w-full flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => kopieren(betreff, "Betreff")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Kopieren
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <label className="mb-1 block text-sm font-medium">Absenderangaben im Fuß der Mail</label>
        <p className="mb-2 text-xs text-slate-500">
          Steht ganz unten unter der Mail. Vorbelegt mit der Absenderzeile und den Kontaktdaten aus
          Schritt 1 und 2 — hier frei ergänzbar, etwa um Registergericht, Geschäftsführung oder
          USt-IdNr.
        </p>
        <textarea
          value={fusstext}
          onChange={(e) => update({ emailFusstext: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-xs text-slate-500">
            Jede Zeile wird übernommen; E-Mail-Adressen darin werden anklickbar.
          </p>
          {state.emailFusstext !== null && (
            <button
              type="button"
              onClick={() => update({ emailFusstext: null })}
              className="text-xs text-sky-700 underline hover:no-underline"
            >
              Vorbelegung wiederherstellen
            </button>
          )}
        </div>

        {mehrereArbeitgeber && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Die Adressliste enthält mehrere Arbeitgeber. Anders als der Brief ist die E-Mail{" "}
            <b>eine</b> Vorlage — im Fuß steht die Anschrift des ersten Empfängers. Für mehrere
            Absender bitte je Arbeitgeber eine eigene Vorlage erzeugen.
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Impressum (URL)</label>
            <input
              type="url"
              value={state.emailImpressumUrl}
              onChange={(e) => update({ emailImpressumUrl: e.target.value })}
              placeholder="https://…/impressum"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Datenschutz (URL)</label>
            <input
              type="url"
              value={state.emailDatenschutzUrl}
              onChange={(e) => update({ emailDatenschutzUrl: e.target.value })}
              placeholder="https://…/datenschutz"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Erscheinen als Links „Impressum“ und „Datenschutz“ unter den Absenderangaben. Bleibt ein
          Feld leer, entfällt der jeweilige Link.
        </p>
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
