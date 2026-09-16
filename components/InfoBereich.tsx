/**
 * Aufklappbarer Infobereich am Fuß des Wizards. Beantwortet die beiden Fragen,
 * die in der Praxis regelmäßig kommen: wo Daten landen und was in einer
 * gespeicherten Konfiguration steht.
 *
 * Bewusst mit <details>/<summary> statt mit eigenem Zustand - das Aufklappen
 * erledigt der Browser, funktioniert auch ohne JavaScript und ist für
 * Screenreader korrekt ausgezeichnet.
 */
export default function InfoBereich() {
  return (
    <details className="group mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-slate-700">
        <span
          aria-hidden
          className="text-slate-400 transition-transform group-open:rotate-90"
        >
          ▶
        </span>
        Wissenswertes: Wo landen meine Daten? Was steht in einer Konfiguration?
      </summary>

      <div className="space-y-6 border-t border-slate-200 px-6 py-5 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="mb-2 font-semibold text-slate-900">
            Wo wird die hochgeladene CSV gespeichert, und wo die PDF-Anschreiben, bevor sie
            heruntergeladen werden?
          </h2>
          <p className="mb-2">
            <strong>Beide werden nirgends gespeichert</strong> — sie existieren nur im
            Arbeitsspeicher, für die Dauer des einen Vorgangs.
          </p>
          <p className="mb-2">
            <strong>Die CSV</strong> wird zuerst im Browser gelesen (die Spaltenzuordnung in
            Schritt 4 passiert dort). Beim Klick auf „Serienbriefe erstellen“ geht sie an den
            Server, wird im Speicher geparst und danach verworfen. Sie wird zu keinem Zeitpunkt
            auf die Festplatte geschrieben.
          </p>
          <p>
            <strong>Die PDF</strong> entsteht direkt im Speicher und geht als Antwort auf die
            Anfrage an Ihren Browser. Dort landet sie in Ihrem Download-Ordner. Auch hier keine
            Datei auf dem Server.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-slate-900">
            Was steht in der Konfiguration, wenn ich sie per Knopf sichere?
          </h2>
          <p className="mb-3">
            Die Datei enthält <strong>alles außer der Adressliste</strong> — also die komplette
            Kampagne, damit sie beim nächsten Mal nicht neu eingetippt werden muss:
          </p>
          <ul className="mb-3 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Schritt 1 — Briefbogen:</strong> Briefbogen-Datei oder Logo (komplett
              eingebettet), Logo-Position, Design-Farbe, Absenderzeile mit Firma, Straße, PLZ und
              Ort sowie die Einstellung „Absender aus dCRYPT-CSV übernehmen“.
            </li>
            <li>
              <strong>Schritt 2 — Anschreiben:</strong> der komplette Brieftext inklusive
              Formatierung, welche Vorlage gewählt war, Überschrift, Datumsanzeige,
              Du/Sie-Anrede, Schriftart und -größe (bei eigener Schrift auch die TTF-Datei
              selbst) sowie Name, Telefon und E-Mail des Ansprechpartners.
            </li>
            <li>
              <strong>Schritt 3 — Seite 2:</strong> Headerbild oder gewähltes Standardmotiv,
              Beratungslink und die Einstellungen zum Beratungs-QR-Code samt Kontaktzeile.
            </li>
            <li>
              <strong>Schritt 4 — nur die Struktur:</strong> welche CSV-Spalte welchem Feld
              zugeordnet war und wie die Anredezeile gebildet wird.
            </li>
          </ul>

          <h3 className="mb-1 font-semibold text-slate-900">Was nicht drin ist</h3>
          <p className="mb-3">
            <strong>Keine Empfängerdaten.</strong> Die Adressliste bleibt bewusst draußen — weder
            Namen noch Adressen noch Freischaltcodes. Die laden Sie bei jedem Lauf frisch hoch.
            Gespeichert wird nur die <em>Zuordnung</em> („Vorname kommt aus Spalte X“), nicht der
            Inhalt.
          </p>

          <h3 className="mb-1 font-semibold text-slate-900">Zwei Hinweise</h3>
          <p className="mb-2">
            Hochgeladene Dateien stecken vollständig in der Konfigurationsdatei. Ein großer
            Briefbogen macht sie entsprechend groß, dafür ist die Kampagne in einer einzigen Datei
            komplett.
          </p>
          <p>Das Zugangspasswort zur App steht <strong>nicht</strong> darin.</p>
        </section>
      </div>
    </details>
  );
}
