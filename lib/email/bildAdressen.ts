/**
 * Bild-Adressen für die E-Mail-Vorlage.
 *
 * E-Mail-Programme zeigen eingebettete Bilder (data:-URI) überwiegend nicht an -
 * ein Bild in der Mail braucht also eine Adresse im Internet. Für die sechs
 * Standardmotive gibt es die bereits: sie liegen im öffentlichen Teil dieses
 * Generators und sind absichtlich von der Anmeldung ausgenommen (siehe den
 * matcher in middleware.ts). Ein hochgeladenes eigenes Foto hat dagegen keine
 * Adresse - es existiert nur im Arbeitsspeicher und muss vom Nutzer selbst
 * irgendwo abgelegt werden, am einfachsten in Brevo.
 */
import { STOCK_PHOTOS } from "@/lib/stockPhotos";

/**
 * Adresse, unter der dieser Generator öffentlich erreichbar ist. Bewusst nicht
 * window.location: die Vorlage wird oft lokal erzeugt, und eine localhost-
 * Adresse im fertigen Newsletter wäre ein toter Link.
 */
export const OEFFENTLICHE_BASIS = (
  process.env.NEXT_PUBLIC_OEFFENTLICHE_BASIS ?? "https://briefgenerator.dwerk.net"
).replace(/\/+$/, "");

/**
 * Volle Adresse eines Standardmotivs für die Mail.
 *
 * Verweist auf die flachere Fassung unter /stock-photos/mail/ - 27 % der Höhe
 * sind dort weg, je zur Hälfte oben und unten (erzeugt von
 * scripts/stock-photos-mail-zuschnitt.mjs). Am Bildschirm schiebt ein Kopfbild
 * in Briefhöhe den eigentlichen Text sonst unter die Falz; auf Seite 2 der PDF
 * bleibt das Original in voller Höhe.
 */
export function stockPhotoOeffentlicheUrl(id: string): string {
  const photo = STOCK_PHOTOS.find((p) => p.id === id);
  return `${OEFFENTLICHE_BASIS}/stock-photos/mail/${id}.${photo?.ext ?? "png"}`;
}
