/**
 * Vorschau und Kontaktliste für die E-Mail-Vorlage.
 *
 * Die Vorschau setzt in die Vorlage (interne Schreibweise) echte Werte des
 * ersten Empfängers ein - oder Beispielwerte, solange keine Adressliste
 * hochgeladen ist. So sieht man die Mail so, wie sie beim Empfänger ankommt,
 * ohne dass die Vorlage selbst verändert wird.
 */
import type { Recipient } from "@/lib/csv/parseAddresses";
import { EMPFAENGER_PLATZHALTER, type EmpfaengerPlatzhalter } from "@/lib/email/platzhalter";

export type VorschauWerte = Record<EmpfaengerPlatzhalter, string>;

export const BEISPIEL_WERTE: VorschauWerte = {
  Vorname: "Max",
  Nachname: "Mustermann",
  Anredezeile: "Liebe:r Max,",
  Freischaltcode: "8TWF1E72",
  Eigenbeitrag: "50,00 €",
  Steuerersparnis: "18,40 €",
  SvErsparnis: "21,60 €",
  Arbeitgeberzuschuss: "18,00 €",
  Gesamtbeitrag: "108,00 €",
};

/** Hängt das Euro-Zeichen an, wenn in der CSV nur die nackte Zahl steht. */
function alsBetrag(wert: string): string {
  const roh = wert.trim();
  if (roh === "") return "";
  return /€/.test(roh) ? roh : `${roh} €`;
}

/** Baut die Vorschauwerte aus einem Empfänger; leere Felder bleiben beim Beispiel. */
export function vorschauWerteAusEmpfaenger(r: Recipient): VorschauWerte {
  const nimm = (wert: string, ersatz: string) => (wert.trim() !== "" ? wert.trim() : ersatz);
  const betrag = (wert: string, ersatz: string) => (wert.trim() !== "" ? alsBetrag(wert) : ersatz);
  return {
    Vorname: nimm(r.vorname, BEISPIEL_WERTE.Vorname),
    Nachname: nimm(r.nachname, BEISPIEL_WERTE.Nachname),
    Anredezeile: nimm(r.anredezeile, BEISPIEL_WERTE.Anredezeile),
    Freischaltcode: nimm(r.freischaltcode, BEISPIEL_WERTE.Freischaltcode),
    Eigenbeitrag: betrag(r.chartEigenbeitrag, BEISPIEL_WERTE.Eigenbeitrag),
    Steuerersparnis: betrag(r.chartSteuerErsparnis, BEISPIEL_WERTE.Steuerersparnis),
    SvErsparnis: betrag(r.chartSvErsparnis, BEISPIEL_WERTE.SvErsparnis),
    Arbeitgeberzuschuss: betrag(r.chartAgZuschuss, BEISPIEL_WERTE.Arbeitgeberzuschuss),
    Gesamtbeitrag: betrag(r.chartGesamtbeitrag, BEISPIEL_WERTE.Gesamtbeitrag),
  };
}

/** Ersetzt in einer Vorlage in interner Schreibweise alle {{Feld}} durch echte Werte. */
export function platzhalterEinsetzen(html: string, werte: VorschauWerte): string {
  let ergebnis = html;
  for (const p of EMPFAENGER_PLATZHALTER) {
    ergebnis = ergebnis.replace(new RegExp(`\\{\\{\\s*${p.intern}\\s*\\}\\}`, "g"), werte[p.intern]);
  }
  return ergebnis;
}

const CSV_TRENNER = ";";

function csvFeld(wert: string): string {
  return /[";\n]/.test(wert) ? `"${wert.replace(/"/g, '""')}"` : wert;
}

/**
 * Kontaktliste zum Import in Brevo: eine Spalte EMAIL plus je eine Spalte für
 * jedes Attribut, das die Vorlage verwendet. Die Spaltennamen entsprechen genau
 * den Attributnamen in {{ contact.… }}.
 *
 * Semikolon als Trenner und BOM voran, damit Excel die Datei ohne Nachfrage
 * und mit richtigen Umlauten öffnet.
 */
export function buildBrevoKontaktCsv(empfaenger: Recipient[], emailSpalte: string): string {
  const kopf = ["EMAIL", ...EMPFAENGER_PLATZHALTER.map((p) => p.brevoAttribut)];
  // Für die echte Liste zählt der Rohwert, nicht der Beispielersatz aus der
  // Vorschau - ein leeres Feld muss leer bleiben, sonst stünde bei jedem
  // Empfänger ohne Beitragsdaten "50,00 €" in der Mail.
  const zeilen = empfaenger.map((r) => {
    const roh: Record<EmpfaengerPlatzhalter, string> = {
      Vorname: r.vorname,
      Nachname: r.nachname,
      Anredezeile: r.anredezeile,
      Freischaltcode: r.freischaltcode,
      Eigenbeitrag: alsBetrag(r.chartEigenbeitrag),
      Steuerersparnis: alsBetrag(r.chartSteuerErsparnis),
      SvErsparnis: alsBetrag(r.chartSvErsparnis),
      Arbeitgeberzuschuss: alsBetrag(r.chartAgZuschuss),
      Gesamtbeitrag: alsBetrag(r.chartGesamtbeitrag),
    };
    const email = emailSpalte !== "" ? (r.raw[emailSpalte] ?? "").trim() : "";
    return [email, ...EMPFAENGER_PLATZHALTER.map((p) => roh[p.intern])].map(csvFeld).join(CSV_TRENNER);
  });
  return `﻿${[kopf.join(CSV_TRENNER), ...zeilen].join("\r\n")}\r\n`;
}
