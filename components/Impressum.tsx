/**
 * Impressum nach § 5 DDG / § 18 MStV. Aufklappbar wie der Infobereich daneben.
 *
 * Inhalte kommen unverändert von dWERK - hier bitte nichts "sinngemäß"
 * anpassen: Anschriften, Registernummern und Vertretungsangaben sind rechtlich
 * verbindlich und müssen mit dem Register übereinstimmen.
 */
export default function Impressum() {
  return (
    <details className="group mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium text-slate-700">
        <span aria-hidden className="text-slate-400 transition-transform group-open:rotate-90">
          ▶
        </span>
        Impressum
      </summary>

      <div className="space-y-5 border-t border-slate-200 px-6 py-5 text-sm leading-relaxed text-slate-700">
        <p>
          Der Serienbrief-Generator wird zur Verfügung gestellt von der{" "}
          <strong>dWERK GmbH &amp; Co. KG</strong>.
        </p>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">Anschrift</h2>
          <address className="not-italic">
            dWERK GmbH &amp; Co. KG
            <br />
            Gewerbering 15
            <br />
            76287 Rheinstetten
            <br />
            Deutschland
          </address>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">Kontakt</h2>
          <p>
            Telefon:{" "}
            <a href="tel:+4972428960700" className="text-sky-700 hover:underline">
              +49 (7242) 896070-0
            </a>
            <br />
            E-Mail:{" "}
            <a href="mailto:info@dwerk.de" className="text-sky-700 hover:underline">
              info@dwerk.de
            </a>
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">Registereintrag und Umsatzsteuer</h2>
          <p>
            USt-IdNr.: DE299552629
            <br />
            Registergericht: Amtsgericht Mannheim
            <br />
            Registernummer: HRA 710170
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            Persönlich haftende Gesellschafterin
          </h2>
          <p>
            AUTOBAV Verwaltungs GmbH
            <br />
            Registergericht: Amtsgericht Tostedt
            <br />
            Registernummer: HRB 204897
            <br />
            Geschäftsführer: Torsten Burkart
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            Gesetzlicher Vertreter der dWERK GmbH &amp; Co. KG
          </h2>
          <p>Torsten Burkart</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            Verantwortlicher für den Inhalt nach § 18 Abs. 2 MStV
          </h2>
          <address className="not-italic">
            Torsten Burkart
            <br />
            Gewerbering 23
            <br />
            76287 Rheinstetten
          </address>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">Streitbeilegung</h2>
          <p className="mb-2">
            Im Einklang mit der ODR-Verordnung möchten wir Sie darüber informieren, dass
            Verbraucher die Möglichkeit haben, Beschwerden bei der Online-Streitbeilegungsplattform
            der Europäischen Kommission einzureichen:{" "}
            <a
              href="https://ec.europa.eu/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-700 hover:underline"
            >
              ec.europa.eu/odr
            </a>
          </p>
          <p>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>
      </div>
    </details>
  );
}
