// Kuratierte Schriftarten-Liste für die Anschreiben.
// Dateien liegen lokal unter public/fonts/<id>/{regular,bold,italic,bolditalic}.woff2
// (siehe scripts/fetch-fonts.mjs) — dadurch braucht Puppeteer beim PDF-Rendern
// keinen Internetzugriff, was auf Vercel-Serverless zuverlässiger und schneller ist.

export type FontDef = {
  id: string;
  label: string;
  /** Womit der Nutzer die Schrift intuitiv verbindet */
  hint: string;
  cssFamily: string;
};

export const FONTS: FontDef[] = [
  { id: "arimo", label: "Arimo", hint: "wie Arial", cssFamily: "Arimo" },
  { id: "carlito", label: "Carlito", hint: "wie Calibri", cssFamily: "Carlito" },
  { id: "tinos", label: "Tinos", hint: "wie Times New Roman", cssFamily: "Tinos" },
  { id: "roboto", label: "Roboto", hint: "modern, klar", cssFamily: "Roboto" },
  { id: "open-sans", label: "Open Sans", hint: "freundlich, gut lesbar", cssFamily: "Open Sans" },
  { id: "lato", label: "Lato", hint: "zurückhaltend, seriös", cssFamily: "Lato" },
  { id: "montserrat", label: "Montserrat", hint: "markant, für Überschriften", cssFamily: "Montserrat" },
  { id: "merriweather", label: "Merriweather", hint: "Serifenschrift, klassisch", cssFamily: "Merriweather" },
];

export const DEFAULT_FONT_ID = "carlito";

// Sonderfall "eigene Schriftart": kein Eintrag in FONTS (keine lokal
// mitgelieferte Datei) - der Nutzer lädt in Schritt 2 eine TTF/OTF-Datei hoch,
// die dann request-spezifisch eingebettet wird (siehe buildCustomFontFaceCss).
export const CUSTOM_FONT_ID = "custom";
const CUSTOM_FONT_CSS_FAMILY = "Eigene Schriftart";

export function getFont(id: string): FontDef {
  if (id === CUSTOM_FONT_ID) {
    return { id: CUSTOM_FONT_ID, label: "Eigene Schriftart", hint: "hochgeladen", cssFamily: CUSTOM_FONT_CSS_FAMILY };
  }
  return FONTS.find((f) => f.id === id) ?? FONTS.find((f) => f.id === DEFAULT_FONT_ID)!;
}

/**
 * Baut die @font-face-Deklaration für eine vom Nutzer hochgeladene TTF/OTF-Datei
 * (Schritt 2, "Eigene Schriftart") - genau wie bei den kuratierten Schriften als
 * data:-URI eingebettet, damit Puppeteer sie ohne Dateizugriff rendern kann. Da
 * nur eine einzelne Datei hochgeladen wird (kein separater Fett-/Kursiv-Schnitt),
 * erzeugt der Browser fett/kursiv bei Bedarf synthetisch aus dieser einen Schrift.
 */
export function buildCustomFontFaceCss(buf: Buffer, filename: string): string {
  const isOtf = /\.otf$/i.test(filename);
  const format = isOtf ? "opentype" : "truetype";
  const mime = isOtf ? "font/otf" : "font/ttf";
  return `
@font-face {
  font-family: "${CUSTOM_FONT_CSS_FAMILY}";
  font-style: normal;
  font-weight: 400;
  src: url(data:${mime};base64,${buf.toString("base64")}) format("${format}");
  font-display: block;
}`;
}

/**
 * Baut die @font-face-Deklarationen für alle kuratierten Schriften als CSS-String.
 * `baseDir` ist der absolute Pfad zum public/fonts-Ordner auf dem Server, die
 * Dateien werden als data:-URIs eingebettet, damit Puppeteer sie unabhängig von
 * einem laufenden HTTP-Server rendern kann (wichtig für die Serverless-Function).
 */
export function buildFontFaceCss(readFile: (relPath: string) => Buffer): string {
  const styles: { style: string; weight: number; file: string }[] = [
    { style: "normal", weight: 400, file: "regular.woff2" },
    { style: "normal", weight: 700, file: "bold.woff2" },
    { style: "italic", weight: 400, file: "italic.woff2" },
    { style: "italic", weight: 700, file: "bolditalic.woff2" },
  ];

  let css = "";
  for (const font of FONTS) {
    for (const s of styles) {
      const relPath = `fonts/${font.id}/${s.file}`;
      let base64: string;
      try {
        base64 = readFile(relPath).toString("base64");
      } catch {
        continue; // Datei fehlt (z.B. Schriftschnitt nicht verfügbar) -> überspringen
      }
      css += `
@font-face {
  font-family: "${font.cssFamily}";
  font-style: ${s.style};
  font-weight: ${s.weight};
  src: url(data:font/woff2;base64,${base64}) format("woff2");
  font-display: block;
}`;
    }
  }
  return css;
}
