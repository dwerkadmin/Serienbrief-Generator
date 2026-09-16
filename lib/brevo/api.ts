/**
 * Schmale Anbindung an die Brevo-API (v3), nur die vier Dinge, die der
 * Generator braucht: Absender auflisten, Kontaktliste anlegen, Kontakte
 * importieren, Kampagne als Entwurf anlegen und eine Testmail schicken.
 *
 * Läuft ausschließlich serverseitig - der API-Schlüssel darf den Server nicht
 * verlassen. Aufrufer ist app/api/brevo/*, und die Routen liegen hinter dem
 * Passwortschutz der App (siehe middleware.ts).
 *
 * Bewusst KEIN Sofortversand: der Generator legt die Kampagne als Entwurf an,
 * den Versand löst ein Mensch in Brevo aus - mit Brevos eigener Vorschau,
 * Empfängerzahl und Kostenanzeige davor. Ein Fehlklick hier wäre nicht
 * zurückzuholen.
 */

const BASIS = "https://api.brevo.com/v3";

export class BrevoFehler extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "BrevoFehler";
  }
}

export function istBrevoKonfiguriert(): boolean {
  return (process.env.BREVO_API_KEY ?? "").trim() !== "";
}

async function brevo<T>(pfad: string, init?: RequestInit): Promise<T> {
  const key = (process.env.BREVO_API_KEY ?? "").trim();
  if (key === "") {
    throw new BrevoFehler("Auf dem Server ist kein Brevo-API-Schlüssel hinterlegt.", 503);
  }

  const res = await fetch(`${BASIS}${pfad}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": key,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let daten: unknown = null;
  try {
    daten = text === "" ? null : JSON.parse(text);
  } catch {
    daten = null;
  }

  if (!res.ok) {
    // Brevo antwortet auf einen ungültigen Schlüssel nur mit "Key not found" -
    // als Meldung im Browser wäre das ein Rätsel.
    if (res.status === 401) {
      throw new BrevoFehler(
        "Brevo weist den hinterlegten API-Schlüssel zurück. Bitte in Brevo unter „SMTP & API“ einen gültigen Schlüssel erzeugen und auf dem Server eintragen.",
        401
      );
    }
    if (res.status === 402) {
      throw new BrevoFehler("Das Brevo-Konto hat nicht genug Guthaben für diese Aktion.", 402);
    }

    const meldung =
      (daten as { message?: string } | null)?.message ?? `Brevo antwortete mit Status ${res.status}.`;
    // Der Schlüssel selbst darf nie in einer Fehlermeldung landen, die im
    // Browser ankommt - Brevo gibt ihn nicht zurück, aber sicherheitshalber.
    throw new BrevoFehler(meldung.replace(/xkeysib-[A-Za-z0-9-]+/g, "***"), res.status);
  }

  return daten as T;
}

export type BrevoAbsender = { id: number; name: string; email: string; active: boolean };

/** Nur in Brevo verifizierte Absender - eine andere Adresse lehnt Brevo beim Versand ab. */
export async function ladeAbsender(): Promise<BrevoAbsender[]> {
  const daten = await brevo<{ senders?: BrevoAbsender[] }>("/senders");
  return daten.senders ?? [];
}

/**
 * Legt fehlende Kontakt-Attribute an. Brevo verwirft beim Import stillschweigend
 * jede Spalte, zu der es kein Attribut gibt - ohne diesen Schritt kämen die
 * Kontakte ohne Vorname und Freischaltcode an, und die Mail wäre leer an den
 * personalisierten Stellen.
 */
export async function stelleAttributeSicher(namen: string[]): Promise<string[]> {
  const daten = await brevo<{ attributes?: { name: string; category: string }[] }>(
    "/contacts/attributes"
  );
  const vorhanden = new Set(
    (daten.attributes ?? []).filter((a) => a.category === "normal").map((a) => a.name.toUpperCase())
  );

  const angelegt: string[] = [];
  for (const name of namen) {
    if (vorhanden.has(name.toUpperCase())) continue;
    await brevo(`/contacts/attributes/normal/${encodeURIComponent(name)}`, {
      method: "POST",
      body: JSON.stringify({ type: "text" }),
    });
    angelegt.push(name);
  }
  return angelegt;
}

/** Brevo verlangt beim Anlegen einer Liste einen Ordner - hier den ersten vorhandenen. */
async function ersterOrdner(): Promise<number> {
  const daten = await brevo<{ folders?: { id: number }[] }>("/contacts/folders?limit=1&offset=0");
  const id = daten.folders?.[0]?.id;
  if (typeof id === "number") return id;

  const neu = await brevo<{ id: number }>("/contacts/folders", {
    method: "POST",
    body: JSON.stringify({ name: "Serienbrief-Generator" }),
  });
  return neu.id;
}

export async function legeListeAn(name: string): Promise<number> {
  const folderId = await ersterOrdner();
  const daten = await brevo<{ id: number }>("/contacts/lists", {
    method: "POST",
    body: JSON.stringify({ name, folderId }),
  });
  return daten.id;
}

/**
 * Startet den Kontakt-Import. Brevo arbeitet ihn im Hintergrund ab und liefert
 * nur eine Prozess-Nummer zurück.
 */
export async function importiereKontakte(csv: string, listId: number): Promise<number> {
  const daten = await brevo<{ processId: number }>("/contacts/import", {
    method: "POST",
    body: JSON.stringify({
      fileBody: csv,
      listIds: [listId],
      updateExistingContacts: true,
      emailBlacklisted: false,
      // Kein Double-Opt-in: die Empfänger sind Beschäftigte des Arbeitgebers,
      // der die Kampagne verschickt, und bekommen eine Information zu ihrer
      // Altersvorsorge - keine Werbung, für die sie sich anmelden müssten.
      emptyContactsAttributes: false,
    }),
  });
  return daten.processId;
}

export type ProzessStand = "queued" | "in_process" | "completed" | "unbekannt";

export async function prozessStand(processId: number): Promise<ProzessStand> {
  const daten = await brevo<{ status?: string }>(`/processes/${processId}`);
  const status = daten.status ?? "";
  if (status === "queued" || status === "in_process" || status === "completed") return status;
  return "unbekannt";
}

/** Wartet begrenzt auf den Import. Läuft er länger, geht es ohne ihn weiter -
 *  die Kampagne kann trotzdem angelegt werden, die Liste füllt sich nach. */
export async function warteAufImport(processId: number, maxMs = 40_000): Promise<ProzessStand> {
  const ende = Date.now() + maxMs;
  let stand: ProzessStand = "queued";
  while (Date.now() < ende) {
    stand = await prozessStand(processId);
    if (stand === "completed" || stand === "unbekannt") return stand;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return stand;
}

export type KampagnenEingabe = {
  name: string;
  betreff: string;
  html: string;
  listId: number;
  absenderName: string;
  absenderEmail: string;
  /** Vorschautext im Posteingang; leer = Brevo nimmt den Anfang der Mail */
  vorschautext?: string;
};

/**
 * Legt die Kampagne an. Ohne `scheduledAt` entsteht sie bei Brevo als Entwurf -
 * genau das ist hier gewollt.
 */
export async function legeKampagneAn(eingabe: KampagnenEingabe): Promise<number> {
  const daten = await brevo<{ id: number }>("/emailCampaigns", {
    method: "POST",
    body: JSON.stringify({
      name: eingabe.name,
      subject: eingabe.betreff,
      sender: { name: eingabe.absenderName, email: eingabe.absenderEmail },
      htmlContent: eingabe.html,
      recipients: { listIds: [eingabe.listId] },
      ...(eingabe.vorschautext ? { previewText: eingabe.vorschautext } : {}),
    }),
  });
  return daten.id;
}

/** Testmail an genau eine Adresse. Brevo lässt höchstens 50 Testmails pro Tag zu. */
export async function sendeTestmail(campaignId: number, an: string): Promise<void> {
  await brevo(`/emailCampaigns/${campaignId}/sendTest`, {
    method: "POST",
    body: JSON.stringify({ emailTo: [an] }),
  });
}
