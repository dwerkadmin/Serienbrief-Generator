"use client";

import { PDFDocument } from "pdf-lib";

/**
 * Fügt die PDF-Pakete einer langen Adressliste in der richtigen Reihenfolge zu
 * einer Datei zusammen.
 *
 * Läuft bewusst im Browser. Die Empfängerdaten und die fertigen Briefe bleiben
 * damit genau dort, wo sie beim Generator ohnehin schon sind - im
 * Arbeitsspeicher des Rechners, auf dem jemand den Knopf drückt. Ein
 * Zusammenführen auf dem Server (oder über einen Dienst wie Gotenberg) hieße,
 * Namen, Anschriften und Beiträge zusätzlich dorthin zu schicken und
 * zwischenzulagern - für eine Aufgabe, die hier zehn Zeilen lang ist.
 */
export async function fuegePdfsZusammen(
  teile: ArrayBuffer[],
  /** Wird nach jedem übernommenen Paket aufgerufen - für die Anzeige. */
  fortschritt?: (fertig: number, gesamt: number) => void
): Promise<Uint8Array> {
  if (teile.length === 1) return new Uint8Array(teile[0]);

  const ziel = await PDFDocument.create();
  for (let i = 0; i < teile.length; i++) {
    const quelle = await PDFDocument.load(teile[i]);
    const seiten = await ziel.copyPages(quelle, quelle.getPageIndices());
    for (const seite of seiten) ziel.addPage(seite);

    fortschritt?.(i + 1, teile.length);
    // Kurz an den Browser zurueckgeben. Das Kopieren rechnet mehrere Sekunden je
    // Paket am Stueck; ohne diese Pause zeichnet die Seite nichts neu und sieht
    // minutenlang eingefroren aus.
    await new Promise((r) => setTimeout(r, 0));
  }
  return ziel.save();
}
