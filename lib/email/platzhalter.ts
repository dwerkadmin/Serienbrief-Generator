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
 * Ausgabe der Anredezeile in der Brevo-Schreibweise.
 *
 * Ein schlichtes {{ contact.ANREDEZEILE }} bleibt überall dort leer, wo Brevo
 * keinen Kontakt kennt: in der Vorschau im Kampagnen-Editor, in einer Testmail
 * an eine Adresse, die nicht in der Liste steht, und bei einem Kontakt, dessen
 * Attribut beim Import leer geblieben ist. Eine Mail, die mit einer leeren
 * Zeile anfängt, sieht nach Fehler aus - deshalb hier drei Stufen.
 *
 * Bewusst KEIN |default:"…": der Filter nimmt nur festen Text, keine weiteren
 * Variablen - "Liebe:r [Vorname] [Nachname]," ließe sich damit nicht bilden.
 * Vor- und Nachname einzeln abzufragen erspart das doppelte Leerzeichen, wenn
 * nur eines von beiden gefüllt ist.
 */
export const ANREDEZEILE_BREVO =
  "{% if contact.ANREDEZEILE %}{{ contact.ANREDEZEILE }}" +
  "{% elif contact.VORNAME and contact.NACHNAME %}Liebe:r {{ contact.VORNAME }} {{ contact.NACHNAME }}," +
  "{% elif contact.VORNAME %}Liebe:r {{ contact.VORNAME }}," +
  "{% elif contact.NACHNAME %}Liebe:r {{ contact.NACHNAME }}," +
  "{% else %}Guten Tag,{% endif %}";

/**
 * Liefert den fertigen Platzhalter-Text für ein Feld in der gewünschten
 * Schreibweise - also genau das, was am Ende in der E-Mail-Vorlage steht.
 */
export function platzhalter(feld: EmpfaengerPlatzhalter, stil: PlatzhalterStil): string {
  if (stil === "intern") return `{{${feld}}}`;
  if (feld === "Anredezeile") return ANREDEZEILE_BREVO;
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
    // Doppelte Backslashes: im Template-String wird \s sonst zu einem blossen "s",
    // und {{ Anredezeile }} mit Leerzeichen bliebe unuebersetzt stehen.
    const muster = new RegExp(`\\{\\{\\s*${p.intern}\\s*\\}\\}`, "g");
    const ersatz = p.intern === "Anredezeile" ? ANREDEZEILE_BREVO : `{{ contact.${p.brevoAttribut} }}`;
    ergebnis = ergebnis.replace(muster, () => ersatz);
  }
  return ergebnis;
}
