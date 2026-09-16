import { NextResponse } from "next/server";
import {
  BrevoFehler,
  importiereKontakte,
  istBrevoKonfiguriert,
  ladeAbsender,
  legeKampagneAn,
  legeListeAn,
  sendeTestmail,
  stelleAttributeSicher,
  warteAufImport,
} from "@/lib/brevo/api";
import { EMPFAENGER_PLATZHALTER } from "@/lib/email/platzhalter";

export const runtime = "nodejs";
// Der Kontakt-Import läuft bei Brevo im Hintergrund; darauf wird begrenzt
// gewartet (siehe warteAufImport). Danach bleibt Luft für die Kampagne.
export const maxDuration = 90;

const MAX_HTML = 2_000_000;
const MAX_CSV = 8_000_000; // Brevo empfiehlt unter 8 MB fileBody

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function text(form: FormData, feld: string): string {
  const wert = form.get(feld);
  return typeof wert === "string" ? wert.trim() : "";
}

export async function POST(req: Request) {
  if (!istBrevoKonfiguriert()) {
    return err(
      "Auf dem Server ist kein Brevo-API-Schlüssel hinterlegt. Ohne ihn kann die Vorlage nicht übergeben werden.",
      503
    );
  }

  const form = await req.formData();
  const listenName = text(form, "listenName");
  const kampagnenName = text(form, "kampagnenName");
  const betreff = text(form, "betreff");
  const absenderEmail = text(form, "absenderEmail").toLowerCase();
  const testEmail = text(form, "testEmail").toLowerCase();
  const vorschautext = text(form, "vorschautext");
  const html = typeof form.get("html") === "string" ? (form.get("html") as string) : "";
  const kontakteCsv = typeof form.get("kontakteCsv") === "string" ? (form.get("kontakteCsv") as string) : "";

  if (listenName === "") return err("Bitte einen Namen für die Kontaktliste angeben.");
  if (kampagnenName === "") return err("Bitte einen Namen für die Kampagne angeben.");
  if (betreff === "") return err("Bitte einen Betreff angeben.");
  if (absenderEmail === "") return err("Bitte eine Absenderadresse wählen.");
  if (html.length === 0) return err("Die E-Mail-Vorlage ist leer.");
  if (html.length > MAX_HTML) return err("Die E-Mail-Vorlage ist zu groß für Brevo.");
  if (kontakteCsv.length === 0) return err("Die Kontaktliste ist leer.");
  if (kontakteCsv.length > MAX_CSV) {
    return err("Die Kontaktliste ist größer als 8 MB - bitte in mehrere Listen aufteilen.");
  }
  if (testEmail !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testEmail)) {
    return err("Die Adresse für die Testmail sieht nicht wie eine E-Mail-Adresse aus.");
  }

  // Zeilen ohne E-Mail-Adresse würde Brevo als Fehler zählen; besser hier
  // merken und dem Nutzer sagen, statt ihn im Brevo-Protokoll suchen zu lassen.
  const zeilen = kontakteCsv.split(/\r?\n/).filter((z) => z.trim() !== "");
  const ohneAdresse = zeilen.slice(1).filter((z) => z.split(";")[0].trim() === "").length;
  if (zeilen.length <= 1) return err("Die Kontaktliste enthält keine Empfänger.");
  if (ohneAdresse === zeilen.length - 1) {
    return err(
      "In der Kontaktliste steht bei keinem Empfänger eine E-Mail-Adresse. Bitte in Schritt 5 die Spalte mit der E-Mail-Adresse zuordnen."
    );
  }

  try {
    // Absender gegen die in Brevo verifizierten prüfen: eine andere Adresse
    // nimmt Brevo zwar in den Entwurf auf, verweigert aber später den Versand.
    const absender = await ladeAbsender();
    const treffer = absender.find((a) => a.active && a.email.toLowerCase() === absenderEmail);
    if (!treffer) {
      return err(
        `Die Absenderadresse ${absenderEmail} ist in Brevo nicht als verifizierter Absender hinterlegt. Bitte in Brevo unter "Absender" eintragen und bestätigen.`,
        422
      );
    }

    const angelegteAttribute = await stelleAttributeSicher(
      EMPFAENGER_PLATZHALTER.map((p) => p.brevoAttribut)
    );

    const listId = await legeListeAn(listenName);
    const processId = await importiereKontakte(kontakteCsv, listId);
    const importStand = await warteAufImport(processId);

    const campaignId = await legeKampagneAn({
      name: kampagnenName,
      betreff,
      html,
      listId,
      absenderName: treffer.name,
      absenderEmail: treffer.email,
      vorschautext,
    });

    let testmail: "gesendet" | "uebersprungen" | string = "uebersprungen";
    if (testEmail !== "") {
      try {
        await sendeTestmail(campaignId, testEmail);
        testmail = "gesendet";
      } catch (e) {
        // Eine gescheiterte Testmail darf den ganzen Vorgang nicht entwerten -
        // Liste und Entwurf stehen ja schon.
        testmail = e instanceof Error ? e.message : "Testmail fehlgeschlagen.";
      }
    }

    return NextResponse.json({
      listId,
      campaignId,
      empfaenger: zeilen.length - 1,
      ohneAdresse,
      angelegteAttribute,
      importStand,
      testmail,
    });
  } catch (e) {
    const status = e instanceof BrevoFehler ? e.status : 502;
    return err(e instanceof Error ? e.message : "Die Übergabe an Brevo ist fehlgeschlagen.", status);
  }
}
