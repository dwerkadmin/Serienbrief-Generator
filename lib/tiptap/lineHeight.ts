import { Extension } from "@tiptap/core";

/**
 * Tiptap-Erweiterung für den Zeilenabstand, nach dem Muster von
 * @tiptap/extension-text-align gebaut (dort: addGlobalAttributes + Commands).
 *
 * Der Wert landet als Inline-Style am Absatz bzw. an der Überschrift
 * (`style="line-height: 1.15"`). Das ist Absicht: der Brieftext wird beim
 * PDF-Bau unverändert in `.letter-body` eingesetzt (siehe lib/pdf/buildHtml.ts),
 * Inline-Styles überleben den Weg also - genauso wie die Textausrichtung schon
 * heute. Ohne gesetzten Wert wird kein Style geschrieben, dann gilt der
 * Standard aus dem Stylesheet (Editor 1.55, PDF 1.3).
 */

/** Auswahl in der Symbolleiste. Leerer Wert = kein Inline-Style, Standard gilt. */
export const LINE_HEIGHTS: { value: string; label: string }[] = [
  { value: "", label: "Standard" },
  { value: "1", label: "1,0 – sehr kompakt" },
  { value: "1.15", label: "1,15 – kompakt" },
  { value: "1.3", label: "1,3" },
  { value: "1.5", label: "1,5" },
  { value: "1.8", label: "1,8 – luftig" },
];

const ERLAUBTE_WERTE = LINE_HEIGHTS.map((h) => h.value).filter((v) => v !== "");

/**
 * Setzt den Zeilenabstand auf alle Absätze eines HTML-Strings. Gebraucht, um
 * eine Standardvorlage mit einem bestimmten Abstand zu laden (siehe
 * vorlageUebernehmen in components/StepText.tsx) - der Wert steht danach als
 * Inline-Style im Text, wird von parseHTML oben wieder eingelesen und erscheint
 * daher korrekt im Regler der Symbolleiste.
 */
export function setzeZeilenabstandInHtml(html: string, wert: string): string {
  return html.replace(/<p\b([^>]*)>/g, (_treffer, attribute: string) => {
    const ohneAlten = attribute.replace(/\s*line-height\s*:[^;"']*;?/g, "");
    const style = ohneAlten.match(/\sstyle\s*=\s*"([^"]*)"/);
    if (style) {
      const vorhandene = style[1].trim().replace(/;$/, "");
      const neu = vorhandene === "" ? `line-height: ${wert}` : `${vorhandene}; line-height: ${wert}`;
      return `<p${ohneAlten.replace(style[0], ` style="${neu}"`)}>`;
    }
    return `<p${ohneAlten} style="line-height: ${wert}">`;
  });
}

export type LineHeightOptions = {
  /** Knotentypen, die das Attribut tragen dürfen */
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lineHeight: {
      /** Zeilenabstand für die Auswahl setzen */
      setLineHeight: (value: string) => ReturnType;
      /** Zeilenabstand entfernen, es gilt wieder der Standard aus dem Stylesheet */
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const LineHeight = Extension.create<LineHeightOptions>({
  name: "lineHeight",

  addOptions() {
    return { types: [] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => {
              const wert = element.style.lineHeight;
              return ERLAUBTE_WERTE.includes(wert) ? wert : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (value) =>
        ({ commands }) => {
          if (!ERLAUBTE_WERTE.includes(value)) return false;
          return this.options.types
            .map((type) => commands.updateAttributes(type, { lineHeight: value }))
            .some((ok) => ok);
        },
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types
            .map((type) => commands.resetAttributes(type, "lineHeight"))
            .some((ok) => ok),
    };
  },
});
