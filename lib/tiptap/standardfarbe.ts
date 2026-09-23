import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Tiptap-Markierung "Standardfarbe": färbt ausgewählten Text in der Design-Farbe
 * aus Schritt 1.
 *
 * Im HTML steht bewusst KEIN Farbwert, sondern nur ein Merkmal
 * (`<span data-standardfarbe="">`). Die Farbe kommt erst beim Anzeigen dazu:
 *  - im Editor über eine CSS-Regel mit der Variablen --design-farbe
 *    (app/globals.css, gesetzt von components/RichTextEditor.tsx),
 *  - in der PDF über dieselbe Regel im Seiten-Stylesheet (lib/pdf/buildHtml.ts),
 *  - in der E-Mail als Inline-Style, weil E-Mail-Programme <style>-Regeln
 *    verwerfen (lib/email/buildEmailHtml.ts).
 *
 * Der Grund: "Standardfarbe" soll die Hausfarbe bleiben. Stünde der Hex-Wert im
 * Text, behielte einmal gefärbter Text die alte Farbe, sobald jemand in Schritt 1
 * die Design-Farbe ändert - und in einer gespeicherten Konfiguration schleppte
 * man die Farbe eines fremden Kunden mit.
 */

export const STANDARDFARBE_ATTRIBUT = "data-standardfarbe";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    standardfarbe: {
      /** Auswahl in der Design-Farbe färben bzw. die Färbung wieder aufheben */
      toggleStandardfarbe: () => ReturnType;
    };
  }
}

export const Standardfarbe = Mark.create({
  name: "standardfarbe",

  parseHTML() {
    return [{ tag: `span[${STANDARDFARBE_ATTRIBUT}]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { [STANDARDFARBE_ATTRIBUT]: "" }), 0];
  },

  addCommands() {
    return {
      toggleStandardfarbe:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});
