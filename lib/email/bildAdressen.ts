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
import { stockPhotoPublicPath } from "@/lib/stockPhotos";

/**
 * Adresse, unter der dieser Generator öffentlich erreichbar ist. Bewusst nicht
 * window.location: die Vorlage wird oft lokal erzeugt, und eine localhost-
 * Adresse im fertigen Newsletter wäre ein toter Link.
 */
export const OEFFENTLICHE_BASIS = (
  process.env.NEXT_PUBLIC_OEFFENTLICHE_BASIS ?? "https://briefgenerator.dwerk.net"
).replace(/\/+$/, "");

/** Volle Adresse eines Standardmotivs, so wie sie in der Mail stehen muss. */
export function stockPhotoOeffentlicheUrl(id: string): string {
  return `${OEFFENTLICHE_BASIS}${stockPhotoPublicPath(id)}`;
}
