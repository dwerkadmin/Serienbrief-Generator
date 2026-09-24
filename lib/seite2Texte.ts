import type { DuSieMode } from "@/lib/pdf/buildHtml";

/**
 * Die festen Texte auf Seite 2 (Zugangsdaten und die drei Schritte), in Du- und
 * Sie-Form.
 *
 * Vor der Neugestaltung war Seite 2 ein freies Eingabefeld - die Anrede war
 * also das, was der Nutzer selbst getippt hatte. Mit den festen Bausteinen kam
 * nur die Sie-Form mit, während der Brieftext auf Seite 1, der Schriftzug über
 * dem Headerbild und der Beratungsblock längst umschalten. Hier stehen sie
 * vollständig beieinander, damit beim nächsten Textwunsch keine Form vergessen
 * wird.
 *
 * Nicht enthalten sind Überschriften, die ohne Anrede auskommen ("Allgemeine
 * Informationen", "Oder mit Hilfe des QR-Codes") - die stehen unverändert in
 * lib/pdf/buildHtml.ts.
 */

export type Seite2Texte = {
  browserHinweis: string;
  qrHinweis: string;
  systemHinweis: string;
  schritt2Text: string;
  schritt3Titel: string;
  schritt3Text: string;
  codeLabel: string;
  schritt4Text: string;
};

const SIE: Seite2Texte = {
  browserHinweis:
    "Um den Beratungsprozess zu starten, geben Sie bitte in der Adresszeile Ihres Internetbrowsers folgende Adresse ein:",
  qrHinweis: "Scannen Sie den QR-Code und lassen Sie sich auf Ihrem Smartphone beraten:",
  systemHinweis:
    "Bitte nutzen Sie für eine optimale Verwendung eine aktuelle Browserversion und ein akt. Betriebssystem",
  schritt2Text:
    "Nach dem Laden der Webseite können Sie die gewünschte Sprache wählen. Danach begrüßt Sie der Moderator und führt Sie durch die allgemeinen Informationen zur betrieblichen Vorsorge.",
  schritt3Titel: "Freischaltung Ihrer persönlichen Berechnung",
  schritt3Text:
    "Mit Hilfe Ihres Freischaltcodes gelangen Sie in Ihren persönlichen Bereich. Hier können Sie Ihren Wunschbetrag eingeben und sich Ihre betriebliche Vorsorge individuell berechnen lassen.",
  codeLabel: "Ihr persönlicher<br/>Freischaltcode:",
  schritt4Text:
    "Sofern Sie Ihren Wunschbetrag gefunden haben, können Sie direkt durch erneute Eingabe Ihres Freischaltcodes Ihre betriebliche Vorsorge beantragen.",
};

const DU: Seite2Texte = {
  browserHinweis:
    "Um den Beratungsprozess zu starten, gib bitte in der Adresszeile deines Internetbrowsers folgende Adresse ein:",
  qrHinweis: "Scanne den QR-Code und lass dich auf deinem Smartphone beraten:",
  systemHinweis:
    "Bitte nutze für eine optimale Verwendung eine aktuelle Browserversion und ein akt. Betriebssystem",
  schritt2Text:
    "Nach dem Laden der Webseite kannst du die gewünschte Sprache wählen. Danach begrüßt dich der Moderator und führt dich durch die allgemeinen Informationen zur betrieblichen Vorsorge.",
  schritt3Titel: "Freischaltung deiner persönlichen Berechnung",
  schritt3Text:
    "Mit Hilfe deines Freischaltcodes gelangst du in deinen persönlichen Bereich. Hier kannst du deinen Wunschbetrag eingeben und dir deine betriebliche Vorsorge individuell berechnen lassen.",
  codeLabel: "Dein persönlicher<br/>Freischaltcode:",
  schritt4Text:
    "Sofern du deinen Wunschbetrag gefunden hast, kannst du direkt durch erneute Eingabe deines Freischaltcodes deine betriebliche Vorsorge beantragen.",
};

export function seite2Texte(duSie: DuSieMode): Seite2Texte {
  return duSie === "du" ? DU : SIE;
}
