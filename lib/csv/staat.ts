/**
 * Staat im Anschriftenblock - für Empfänger mit Wohnsitz im Ausland.
 *
 * Die dCRYPT-Exporte haben keine Spalte dafür. Erkennbar ist das Ausland aber
 * an der FORM der Postleitzahl: "62-200" gibt es nur in Polen, "7571 AB" nur in
 * den Niederlanden. Der Generator schlägt daraus einen Staat vor; bestätigt
 * oder geändert wird er in Schritt 4, je Form einmal - nicht je Empfänger.
 *
 * Bewusst nur Vorschläge, keine stillen Entscheidungen: Ein falscher Staat
 * unter der Anschrift ist schlimmer als gar keiner, und vier Ziffern allein
 * könnten Österreich, Belgien, die Schweiz oder Dänemark bedeuten. Wo die Form
 * mehrdeutig ist, bleibt der Vorschlag leer und die Maske fragt.
 */

/**
 * Formschlüssel einer Postleitzahl: Ziffern werden zu "#", Buchstaben zu "A",
 * alles andere bleibt. Aus "62-200" wird "##-###", aus "7571 AB" wird "#### AA".
 */
export function plzForm(plz: string): string {
  return plz
    .trim()
    .toUpperCase()
    .replace(/[0-9]/g, "#")
    .replace(/[A-ZÄÖÜ]/g, "A");
}

export type PlzFormVorschlag = {
  form: string;
  /** Leer = mehrdeutig, die Maske muss fragen. */
  vorschlag: string;
  /** Was der Nutzer in der Maske lesen soll. */
  erklaerung: string;
};

/**
 * Bekannte Formen. Nur eintragen, was wirklich eindeutig ist - lieber ein
 * leerer Vorschlag als ein falscher Staat auf dem Brief.
 */
const FORMEN: PlzFormVorschlag[] = [
  { form: "#####", vorschlag: "", erklaerung: "fünfstellig - deutsches Format (auch FR, IT, ES)" },
  { form: "##-###", vorschlag: "POLEN", erklaerung: "nur in Polen gebräuchlich" },
  { form: "#### AA", vorschlag: "NIEDERLANDE", erklaerung: "nur in den Niederlanden gebräuchlich" },
  { form: "####AA", vorschlag: "NIEDERLANDE", erklaerung: "nur in den Niederlanden gebräuchlich" },
  { form: "####", vorschlag: "", erklaerung: "vierstellig - mehrdeutig (AT, BE, CH, DK, HU, NO)" },
  { form: "######", vorschlag: "", erklaerung: "sechsstellig - mehrdeutig (RO, RU)" },
];

/** Länderkürzel, die manche Listen der PLZ voranstellen ("PL-62-200"). */
const KUERZEL: Record<string, string> = {
  D: "DEUTSCHLAND",
  DE: "DEUTSCHLAND",
  PL: "POLEN",
  NL: "NIEDERLANDE",
  A: "ÖSTERREICH",
  AT: "ÖSTERREICH",
  CH: "SCHWEIZ",
  B: "BELGIEN",
  BE: "BELGIEN",
  F: "FRANKREICH",
  FR: "FRANKREICH",
  L: "LUXEMBURG",
  LU: "LUXEMBURG",
  CZ: "TSCHECHIEN",
  DK: "DÄNEMARK",
  IT: "ITALIEN",
  ES: "SPANIEN",
  HU: "UNGARN",
  RO: "RUMÄNIEN",
  SK: "SLOWAKEI",
  SI: "SLOWENIEN",
  HR: "KROATIEN",
  BG: "BULGARIEN",
  PT: "PORTUGAL",
  GB: "GROSSBRITANNIEN",
  UK: "GROSSBRITANNIEN",
};

/**
 * Vorschlag für eine Form. Ein vorangestelltes Länderkürzel schlägt die Form
 * - "PL-62-200" ist eindeutig, egal wie der Rest aussieht.
 */
export function staatVorschlag(form: string): string {
  const mitKuerzel = form.match(/^([A-Z]{1,2})-/);
  if (mitKuerzel) {
    // Im Formschlüssel sind Buchstaben bereits zu "A" geworden - das Kürzel
    // steht deshalb nur im Originalwert, siehe staatVorschlagFuerPlz.
    return "";
  }
  return FORMEN.find((f) => f.form === form)?.vorschlag ?? "";
}

/** Vorschlag direkt aus einer Postleitzahl, inklusive vorangestelltem Kürzel. */
export function staatVorschlagFuerPlz(plz: string): string {
  const kuerzel = plz.trim().toUpperCase().match(/^([A-Z]{1,3})\s*-/);
  if (kuerzel && KUERZEL[kuerzel[1]]) return KUERZEL[kuerzel[1]];
  return staatVorschlag(plzForm(plz));
}

export function formErklaerung(form: string): string {
  return FORMEN.find((f) => f.form === form)?.erklaerung ?? "unbekanntes Format";
}

export type PlzGruppe = {
  form: string;
  anzahl: number;
  vorschlag: string;
  erklaerung: string;
  /** Eine echte Postleitzahl aus der Liste, damit der Nutzer die Form wiedererkennt. */
  beispiel: string;
};

/**
 * Gruppiert die Empfänger nach PLZ-Form - Grundlage für die Abfrage in
 * Schritt 4. Die häufigste Form steht vorn.
 */
export function plzGruppen(plzListe: string[]): PlzGruppe[] {
  const gruppen = new Map<string, { anzahl: number; beispiel: string }>();
  for (const plz of plzListe) {
    const wert = plz.trim();
    if (wert === "") continue;
    const form = plzForm(wert);
    const vorhanden = gruppen.get(form);
    if (vorhanden) vorhanden.anzahl++;
    else gruppen.set(form, { anzahl: 1, beispiel: wert });
  }

  return [...gruppen]
    .map(([form, g]) => ({
      form,
      anzahl: g.anzahl,
      beispiel: g.beispiel,
      vorschlag: staatVorschlagFuerPlz(g.beispiel),
      erklaerung: formErklaerung(form),
    }))
    .sort((a, b) => b.anzahl - a.anzahl);
}

/**
 * Auswahlliste in der Maske. Vorn die neun Staaten, die in den Listen
 * tatsächlich vorkommen (Nachbarländer und Polen), danach weitere - so ist das
 * Übliche mit einem Blick zu finden statt alphabetisch verstreut.
 */
export const STAAT_AUSWAHL = [
  "",
  "NIEDERLANDE",
  "POLEN",
  "BELGIEN",
  "FRANKREICH",
  "SCHWEIZ",
  "ÖSTERREICH",
  "LUXEMBURG",
  "DÄNEMARK",
  "TSCHECHIEN",
  "ITALIEN",
  "SPANIEN",
  "PORTUGAL",
  "UNGARN",
  "RUMÄNIEN",
  "SLOWAKEI",
  "SLOWENIEN",
  "KROATIEN",
  "BULGARIEN",
  "GROSSBRITANNIEN",
];
