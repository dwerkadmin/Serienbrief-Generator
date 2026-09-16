import { NextResponse } from "next/server";
import { BrevoFehler, istBrevoKonfiguriert, ladeAbsender } from "@/lib/brevo/api";

export const runtime = "nodejs";

/**
 * Sagt der Maske, ob die Brevo-Übergabe überhaupt angeboten werden kann, und
 * liefert die in Brevo verifizierten Absenderadressen. Eine nicht verifizierte
 * Adresse lehnt Brevo beim Versand ab - deshalb eine Auswahlliste statt eines
 * freien Feldes.
 */
export async function GET() {
  if (!istBrevoKonfiguriert()) {
    return NextResponse.json({ konfiguriert: false, absender: [] });
  }
  try {
    const absender = (await ladeAbsender())
      .filter((a) => a.active)
      .map((a) => ({ name: a.name, email: a.email }));
    return NextResponse.json({ konfiguriert: true, absender });
  } catch (e) {
    const status = e instanceof BrevoFehler ? e.status : 502;
    const error = e instanceof Error ? e.message : "Brevo ist nicht erreichbar.";
    return NextResponse.json({ konfiguriert: true, absender: [], error }, { status });
  }
}
