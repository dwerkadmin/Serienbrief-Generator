/**
 * Das Overlay über dem Headerbild auf Seite 2 ("In nur drei Schritten in Ihren
 * sicheren Ruhestand").
 *
 * Eigene Datei, damit die Eingabemaske denselben Text als Platzhalter zeigen
 * kann, den die PDF später einsetzt - ohne dafür lib/pdf/buildHtml.ts in den
 * Browser zu ziehen (das hängt an Schriften und Beitragsgrafik).
 */
import type { DuSieMode } from "@/lib/pdf/buildHtml";

/** Standardtext, zweizeilig. Zeilenumbruch als \n, wie im Eingabefeld. */
export function overlayStandardText(duSie: DuSieMode): string {
  return duSie === "du"
    ? "In nur drei Schritten in\ndeinen sicheren Ruhestand"
    : "In nur drei Schritten in\nIhren sicheren Ruhestand";
}

/**
 * Die Zeilen, die gezeichnet werden. Leerer eigener Text = Standardtext.
 * Leere Zeilen fliegen raus, sonst reißt ein versehentlicher Doppelumbruch
 * den dunklen Kasten unnötig auseinander.
 */
export function overlayZeilen(eigenerText: string, duSie: DuSieMode): string[] {
  const quelle = eigenerText.trim() !== "" ? eigenerText : overlayStandardText(duSie);
  return quelle
    .split("\n")
    .map((z) => z.trim())
    .filter((z) => z !== "");
}
