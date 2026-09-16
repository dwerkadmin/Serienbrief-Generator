/**
 * Aufklappbare Übersicht: was der Generator kann. Gedacht zum Nachschlagen und
 * zum Zeigen - deshalb bewusst vollständig statt knapp.
 *
 * Gleiche Bauform wie InfoBereich/Impressum (<details>/<summary>), damit die
 * drei Bereiche am Fuß des Wizards als eine Gruppe lesbar sind.
 */

const PLATZHALTER = [
  "{{Anredezeile}}",
  "{{Vorname}}",
  "{{Nachname}}",
  "{{Freischaltcode}}",
  "{{Unternehmensname}}",
  "{{AnsprechpartnerAnrede}}",
  "{{AnsprechpartnerName}}",
  "{{AnsprechpartnerTelefon}}",
  "{{AnsprechpartnerEmail}}",
  "{{Beitragsgrafik}}",
];

const SCHRITTE: { nr: number; titel: string; punkte: React.ReactNode[] }[] = [
  {
    nr: 1,
    titel: "Briefbogen",
    punkte: [
      <>
        <b>Eigener Briefbogen</b> als PDF, PNG, JPEG oder WebP — eine PDF wird automatisch in ein
        Seitenbild umgewandelt.
      </>,
      <>
        <b>Oder nur ein Logo</b>, wahlweise oben links, mittig oder rechts. Ein Beispiel-Logo zum
        Ausprobieren ist eingebaut.
      </>,
      <>
        <b>Logo von einer Webseite holen:</b> Adresse eingeben, das Logo wird gesucht, geladen und
        die Hausfarbe daraus geschätzt.
      </>,
      <>
        <b>Design-Farbe</b> für Überschriften, Akzente auf Seite 2 und die Beitragsgrafik.
      </>,
      <>
        <b>Absenderzeile</b> fest eingetragen — oder je Empfänger aus der Adressliste, wenn eine
        Kampagne mehrere Arbeitgeber-Standorte umfasst.
      </>,
    ],
  },
  {
    nr: 2,
    titel: "Anschreiben",
    punkte: [
      <>
        <b>Sechs Standardvorlagen</b> — Varianten A, B und C, jeweils in Du- und Sie-Anrede. Oder
        leer beginnen.
      </>,
      <>
        <b>Formatierung</b> wie in einer Textverarbeitung: fett, kursiv, unterstrichen,
        Ausrichtung, Überschriften, Aufzählungen, Zeilenabstand.
      </>,
      <>
        <b>Überschrift</b> über der Anredezeile, mehrzeilig, in der Design-Farbe.
      </>,
      <>
        <b>Acht mitgelieferte Schriften</b> — oder eine eigene Hausschrift als TTF/OTF hochladen.
      </>,
      <>
        <b>Datumszeile</b> wahlweise für den aktuellen, nächsten oder übernächsten Monat.
      </>,
    ],
  },
  {
    nr: 3,
    titel: "Seite 2",
    punkte: [
      <>
        <b>Headerbild</b>: eigenes Foto oder eines von sechs Standardmotiven.
      </>,
      <>
        <b>Beratungslink</b> — erscheint als Adresse zum Abtippen <em>und</em> als QR-Code.
      </>,
      <>
        <b>Zweiter QR-Code für die persönliche Beratung</b>, optional: eigene Überschrift, eigenes
        Ziel (Terminbuchung, Kontaktformular), und eine Kontaktzeile, bei der Telefon und E-Mail
        einzeln abschaltbar sind.
      </>,
      <>
        <b>Persönlicher Freischaltcode</b> je Empfänger, hervorgehoben im eigenen Kasten.
      </>,
    ],
  },
  {
    nr: 4,
    titel: "Adressliste",
    punkte: [
      <>
        <b>CSV hochladen</b> — Umlaute werden automatisch erkannt, egal ob die Datei aus Excel oder
        einem Export kommt.
      </>,
      <>
        <b>Spalten werden automatisch zugeordnet</b>, auch die sperrigen Bezeichnungen echter
        dCRYPT-Exporte. Jede Zuordnung lässt sich von Hand korrigieren.
      </>,
      <>
        <b>Anredezeile</b> aus einer eigenen Spalte — oder automatisch gebildet, etwa „Hallo
        [Vorname],“ oder „Liebe:r [Vorname] [Nachname],“.
      </>,
      <>
        <b>Geschlechtergerechte Anrede</b>: enthält die Liste eine Spalte „Geschlecht“, wird aus
        „Liebe:r“ je Empfänger „Lieber“ oder „Liebe“. Ohne Angabe bleibt es beim neutralen
        „Liebe:r“.
      </>,
      <>
        <b>Musterdatei</b> mit zwei Testdatensätzen für einen schnellen Probelauf — mit
        Geschlecht, Arbeitgeber-Anschrift und Beitragsdaten, sodass sich auch die Absenderzeile
        aus der CSV und die Beitragsgrafik damit ausprobieren lassen.
      </>,
    ],
  },
];

/** Maßstabsgetreue A4-Skizze (210 × 297) - zeigt, was auf welcher Seite landet. */
function SeiteEins() {
  return (
    <svg
      viewBox="0 0 210 297"
      className="w-full"
      role="img"
      aria-label="Skizze von Seite 1: Logo, Absenderzeile, Adressfeld, Datum, Überschrift, Brieftext mit Beitragsgrafik"
    >
      <rect x="0.5" y="0.5" width="209" height="296" fill="#ffffff" stroke="#cbd5e1" />
      <rect x="25" y="18" width="52" height="22" fill="#e0f2fe" stroke="#0284c7" strokeWidth="0.8" />
      <text x="51" y="32" fontSize="7" fill="#0284c7" textAnchor="middle">
        Logo
      </text>
      <rect x="25" y="62" width="70" height="3" fill="#cbd5e1" />
      <rect x="25" y="70" width="58" height="4" fill="#94a3b8" />
      <rect x="25" y="78" width="50" height="4" fill="#94a3b8" />
      <rect x="25" y="86" width="54" height="4" fill="#94a3b8" />
      <rect x="150" y="100" width="35" height="4" fill="#cbd5e1" />
      <rect x="25" y="114" width="120" height="6" fill="#0284c7" />
      <rect x="25" y="124" width="140" height="6" fill="#0284c7" />
      <rect x="25" y="142" width="160" height="3" fill="#94a3b8" />
      <rect x="25" y="149" width="160" height="3" fill="#94a3b8" />
      <rect x="25" y="156" width="120" height="3" fill="#94a3b8" />
      <circle cx="48" cy="190" r="20" fill="none" stroke="#0284c7" strokeWidth="9" />
      <circle
        cx="48"
        cy="190"
        r="20"
        fill="none"
        stroke="#0b4a6f"
        strokeWidth="9"
        strokeDasharray="42 84"
        transform="rotate(-90 48 190)"
      />
      <rect x="82" y="176" width="100" height="3" fill="#94a3b8" />
      <rect x="82" y="185" width="100" height="3" fill="#94a3b8" />
      <rect x="82" y="194" width="100" height="3" fill="#94a3b8" />
      <rect x="82" y="203" width="100" height="3" fill="#94a3b8" />
      <rect x="25" y="228" width="160" height="3" fill="#94a3b8" />
      <rect x="25" y="235" width="160" height="3" fill="#94a3b8" />
      <rect x="25" y="242" width="95" height="3" fill="#94a3b8" />
    </svg>
  );
}

function SeiteZwei() {
  return (
    <svg
      viewBox="0 0 210 297"
      className="w-full"
      role="img"
      aria-label="Skizze von Seite 2: Headerbild, Zugangsdaten mit QR-Code, drei Schritte, Freischaltcode, Beratungsblock"
    >
      <rect x="0.5" y="0.5" width="209" height="296" fill="#ffffff" stroke="#cbd5e1" />
      <rect x="0.5" y="0.5" width="209" height="62" fill="#0284c7" opacity="0.85" />
      <rect x="14" y="34" width="96" height="18" fill="#0f172a" opacity="0.45" />
      <rect x="18" y="40" width="80" height="4" fill="#ffffff" opacity="0.9" />
      <rect x="16" y="76" width="90" height="5" fill="#334155" />
      <rect x="16" y="92" width="80" height="3" fill="#94a3b8" />
      <rect x="16" y="99" width="70" height="3" fill="#94a3b8" />
      <rect x="16" y="106" width="76" height="3" fill="#0284c7" />
      <rect x="160" y="88" width="30" height="30" fill="#ffffff" stroke="#334155" strokeWidth="1.4" />
      <rect x="165" y="93" width="7" height="7" fill="#334155" />
      <rect x="178" y="93" width="7" height="7" fill="#334155" />
      <rect x="165" y="106" width="7" height="7" fill="#334155" />
      <rect x="176" y="104" width="4" height="4" fill="#334155" />
      <rect x="182" y="110" width="4" height="4" fill="#334155" />
      <rect x="16" y="132" width="14" height="14" fill="none" stroke="#0284c7" strokeWidth="1.2" />
      <rect x="38" y="134" width="120" height="3" fill="#94a3b8" />
      <rect x="38" y="141" width="100" height="3" fill="#94a3b8" />
      <rect x="16" y="158" width="14" height="14" fill="none" stroke="#0284c7" strokeWidth="1.2" />
      <rect x="38" y="160" width="90" height="3" fill="#94a3b8" />
      <rect x="140" y="154" width="52" height="24" fill="none" stroke="#334155" strokeWidth="1.2" />
      <rect x="147" y="164" width="38" height="5" fill="#334155" />
      <rect x="16" y="188" width="14" height="14" fill="none" stroke="#0284c7" strokeWidth="1.2" />
      <rect x="38" y="190" width="110" height="3" fill="#94a3b8" />
      <rect x="16" y="222" width="178" height="52" fill="none" stroke="#0284c7" strokeWidth="1.4" rx="3" />
      <rect x="26" y="234" width="86" height="5" fill="#0284c7" />
      <rect x="26" y="246" width="100" height="3" fill="#94a3b8" />
      <rect x="26" y="254" width="78" height="3" fill="#94a3b8" />
      <rect x="152" y="232" width="32" height="32" fill="#ffffff" stroke="#334155" strokeWidth="1.4" />
      <rect x="157" y="237" width="8" height="8" fill="#334155" />
      <rect x="171" y="237" width="8" height="8" fill="#334155" />
      <rect x="157" y="251" width="8" height="8" fill="#334155" />
      <rect x="170" y="250" width="5" height="5" fill="#334155" />
    </svg>
  );
}

export default function FunktionenBereich() {
  return (
    <details className="group mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-slate-700">
        <span aria-hidden className="text-slate-400 transition-transform group-open:rotate-90">
          ▶
        </span>
        Was kann der Generator? Funktionen im Überblick
      </summary>

      <div className="space-y-8 border-t border-slate-200 px-6 py-5 text-sm leading-relaxed text-slate-700">
        <p className="max-w-2xl">
          Der Generator erzeugt personalisierte Mitarbeiteranschreiben zur betrieblichen
          Altersvorsorge: aus einer Adressliste wird eine fertige PDF, zwei Seiten je Empfänger,
          mit persönlichem Freischaltcode und individueller Beitragsrechnung.
        </p>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
          {[
            ["Ergebnis", "Eine PDF"],
            ["je Empfänger", "2 Seiten"],
            ["pro Durchlauf", "bis 300"],
            ["Vorlagen", "6 Texte"],
          ].map(([kopf, wert]) => (
            <div key={kopf} className="bg-white px-3 py-2.5">
              <div className="text-xs uppercase tracking-wide text-slate-400">{kopf}</div>
              <div className="text-base font-semibold text-slate-900">{wert}</div>
            </div>
          ))}
        </div>

        <section>
          <h2 className="mb-1 border-b border-slate-200 pb-1.5 text-base font-semibold text-slate-900">
            Der Ablauf
          </h2>
          <p className="mb-4 text-slate-600">
            Vier Schritte, in beliebiger Reihenfolge anspringbar. Am Ende ein Klick auf
            „Serienbriefe erstellen“ — die fertige PDF landet im Download-Ordner. Schritt 5 ist
            optional und erzeugt aus denselben Angaben eine E-Mail statt eines Briefs.
          </p>

          <div className="space-y-5">
            {SCHRITTE.map((s) => (
              <div key={s.nr} className="flex gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white">
                  {s.nr}
                </div>
                <div className="min-w-0">
                  <h3 className="mb-1 font-semibold text-slate-900">{s.titel}</h3>
                  <ul className="list-disc space-y-1 pl-5 marker:text-sky-600">
                    {s.punkte.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-1 border-b border-slate-200 pb-1.5 text-base font-semibold text-slate-900">
            Platzhalter im Brieftext
          </h2>
          <p className="mb-3 text-slate-600">
            Per Klick einfügbar. Beim Erzeugen wird jeder Platzhalter durch den Wert des jeweiligen
            Empfängers ersetzt — jeder Brief ist damit ein Einzelstück.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PLATZHALTER.map((p) => (
              <code
                key={p}
                className="rounded border border-dashed border-slate-400 px-2 py-1 font-mono text-xs text-slate-700"
              >
                {p}
              </code>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-1 border-b border-slate-200 pb-1.5 text-base font-semibold text-slate-900">
            Die Beitragsgrafik
          </h2>
          <p className="mb-3 text-slate-600">
            Der Platzhalter <code className="font-mono text-xs">{"{{Beitragsgrafik}}"}</code> —
            enthalten in Variante C — wird zu einem Ringdiagramm, das für <em>jeden Empfänger
            einzeln</em> aus seinen Beitragsspalten gerechnet wird: Eigenbeitrag, Steuer- und
            Sozialversicherungsersparnis und Arbeitgeberzuschuss, dazu der Gesamtbetrag in der
            Mitte.
          </p>
          <ul className="list-disc space-y-1 pl-5 marker:text-sky-600">
            <li>
              Die Farben werden <b>aus der Design-Farbe abgeleitet</b>: der Arbeitgeberzuschuss
              trägt die Hausfarbe, der Eigenbeitrag eine dunkle Variante, die Ersparnis einen
              passenden Akzent.
            </li>
            <li>
              Die Beschriftung bleibt dabei automatisch lesbar — Farben werden notfalls
              abgedunkelt, damit die weiße Schrift im Ring Kontrast behält.
            </li>
            <li>
              Die Zuordnung der Beitragsspalten erscheint in Schritt 4 von selbst, sobald der
              Platzhalter im Text steht.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 border-b border-slate-200 pb-1.5 text-base font-semibold text-slate-900">
            Was gedruckt wird
          </h2>
          <p className="mb-4 text-slate-600">
            Zwei DIN-A4-Seiten je Empfänger, in einer einzigen PDF hintereinander.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Seite 1 — Anschreiben
              </div>
              <SeiteEins />
              <p className="text-xs text-slate-500">
                Briefbogen oder Logo, Absenderzeile, Adressfeld, Datum, Überschrift, der
                persönliche Brieftext — und bei Variante C die Beitragsgrafik.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Seite 2 — Zugang
              </div>
              <SeiteZwei />
              <p className="text-xs text-slate-500">
                Headerbild mit Überschrift, die Zugangsdaten mit QR-Code, der Ablauf in drei
                Schritten, der Freischaltcode — und optional der Beratungsblock am Fuß.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-1 border-b border-slate-200 pb-1.5 text-base font-semibold text-slate-900">
            Dieselbe Kampagne als E-Mail
          </h2>
          <p className="mb-3 text-slate-600">
            Schritt 5 baut aus denselben Angaben eine fertige HTML-Mail. Der Anschriftenblock
            entfällt, und aus den QR-Codes werden Schaltflächen zum Anklicken — wer die Mail liest,
            hat das Gerät ohnehin in der Hand. Die Beitragsgrafik wird zur Tabelle, weil
            E-Mail-Programme Vektorgrafiken nicht anzeigen.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600 marker:text-sky-600">
            <li>
              Vorschau mit den Daten des ersten Empfängers, Download als HTML-Datei oder direkt in
              die Zwischenablage.
            </li>
            <li>
              Platzhalter wahlweise in der Schreibweise des Generators oder als Brevo-Attribute —
              dann lässt sich die Vorlage dort einfügen und als Serienmail versenden.
            </li>
            <li>
              Passend dazu eine Kontaktliste als CSV, mit genau den Attributspalten, die die
              Vorlage verwendet.
            </li>
          </ul>
          <div className="mt-3 rounded-lg border-l-4 border-sky-600 bg-sky-50 px-4 py-3">
            <b>Bilder brauchen eine Adresse im Internet.</b> Ein Standardmotiv aus Schritt 3 wird
            automatisch eingesetzt, und ein von einer Webseite geholtes Logo ebenfalls. Nur für
            selbst hochgeladene Dateien ist eine Adresse von Hand nötig — eingebettete Bilder
            zeigen die meisten E-Mail-Programme nicht an. Ohne Adresse entfällt das Bild, die Mail
            bleibt vollständig.
          </div>
        </section>

        <section>
          <h2 className="mb-1 border-b border-slate-200 pb-1.5 text-base font-semibold text-slate-900">
            Kampagne sichern und wiederverwenden
          </h2>
          <p className="mb-3 text-slate-600">
            „Konfiguration speichern“ legt die komplette Einrichtung als Datei ab: Briefbogen,
            Logo, Texte, Design, Schriften, Ansprechpartner, Seite-2-Einstellungen und die
            Spaltenzuordnung. Beim nächsten Mal laden, Adressliste hochladen, fertig.
          </p>
          <div className="rounded-lg border-l-4 border-sky-600 bg-sky-50 px-4 py-3">
            <b>Ohne Empfängerdaten.</b> Die Adressliste bleibt bewusst draußen — gespeichert wird
            nur, <em>welche</em> Spalte wofür steht, nicht was darin steht.
          </div>
        </section>
      </div>
    </details>
  );
}
