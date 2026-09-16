/**
 * Platzhalter-Schreibweisen für die E-Mail-Vorlage.
 *
 * Im Generator (und in der PDF) heißen die Platzhalter {{Vorname}},
 * {{Freischaltcode}} und so weiter. Ein Newsletter-Werkzeug wie Brevo kennt
 * diese Namen nicht - dort heißen sie {{ contact.VORNAME }} und beziehen sich
 * auf die Attribute der importierten Kontaktliste.
 *
 * Deshalb kann die Vorlage in zwei Schreibweisen ausgegeben werden. Die
 * Kampagnen-Felder (Unternehmensname, Ansprechpartner) stehen NICHT in dieser
 * Tabelle: sie sind für den ganzen Versand gleich und werden schon beim Bauen
 * der Vorlage eingesetzt - sie als Kontakt-Attribut zu pflegen wäre nur
 * Fehlerquelle.
 */

export type PlatzhalterStil = "intern" | "brevo";

/** Empfängerbezogene Felder: interner Name -> Brevo-Attributname. */
export const EMPFAENGER_PLATZHALTER = [
  { intern: "Vorname", brevoAttribut: "VORNAME", label: "Vorname" },
  { intern: "Nachname", brevoAttribut: "NACHNAME", label: "Nachname" },
  { intern: "Anredezeile", brevoAttribut: "ANREDEZEILE", label: "Anredezeile" },
  { intern: "Freischaltcode", brevoAttribut: "FREISCHALTCODE", label: "Freischaltcode" },
  { intern: "Eigenbeitrag", brevoAttribut: "EIGENBEITRAG", label: "Eigenbeitrag (netto)" },
  { intern: "Steuerersparnis", brevoAttribut: "STEUERERSPARNIS", label: "Steuerersparnis" },
  { intern: "SvErsparnis", brevoAttribut: "SVERSPARNIS", label: "SV-Ersparnis" },
  { intern: "Arbeitgeberzuschuss", brevoAttribut: "ARBEITGEBERZUSCHUSS", label: "Arbeitgeberzuschuss" },
  { intern: "Gesamtbeitrag", brevoAttribut: "GESAMTBEITRAG", label: "Gesamtbeitrag" },
] as const;

export type EmpfaengerPlatzhalter = (typeof EMPFAENGER_PLATZHALTER)[number]["intern"];

/**
 * Liefert den fertigen Platzhalter-Text für ein Feld in der gewünschten
 * Schreibweise - also genau das, was am Ende in der E-Mail-Vorlage steht.
 */
export function platzhalter(feld: EmpfaengerPlatzhalter, stil: PlatzhalterStil): string {
  if (stil === "intern") return `{{${feld}}}`;
  const eintrag = EMPFAENGER_PLATZHALTER.find((p) => p.intern === feld);
  return `{{ contact.${eintrag ? eintrag.brevoAttribut : feld.toUpperCase()} }}`;
}

/**
 * Schreibt die {{Feld}}-Platzhalter in einem Textbaustein (z.B. dem aus dem
 * Editor übernommenen Brieftext) auf die gewünschte Schreibweise um. Unbekannte
 * Platzhalter bleiben unangetastet.
 */
export function platzhalterUmschreiben(html: string, stil: PlatzhalterStil): string {
  if (stil === "intern") return html;
  let ergebnis = html;
  for (const p of EMPFAENGER_PLATZHALTER) {
    const muster = new RegExp(`\{\{\s*${p.intern}\s*\}\}`, "g");
    ergebnis = ergebnis.replace(muster, `{{ contact.${p.brevoAttribut} }}`);
  }
  return ergebnis;
}
