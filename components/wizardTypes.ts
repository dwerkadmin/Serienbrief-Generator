import type { AnredezeileConfig, ColumnMapping } from "@/lib/csv/parseAddresses";
import { DEFAULT_FONT_ID } from "@/lib/fonts";
import { getStandardText } from "@/lib/templates/standardTexts";
import type { StandardTextVariant } from "@/lib/templates/standardTexts";
import type { DuSieMode } from "@/lib/pdf/buildHtml";
import { DEFAULT_BERATUNGSLINK_DOMAIN } from "@/lib/beratungslink";

export type LogoPosition = "left" | "center" | "right";

export const DEFAULT_DESIGN_COLOR = "#1E6FA6";

export type WizardState = {
  // Schritt 1: Briefbogen / Logo / Design-Farbe
  // "logoUrl" ist rein client-seitig (UI-Auswahl "Logo von Webseite holen") -
  // nach erfolgreichem Laden landet das Logo genau wie bei "logo" in logoFile,
  // fürs Backend wird logoUrl beim Absenden zu "logo" (siehe Wizard.tsx).
  letterheadMode: "image" | "logo" | "logoUrl";
  letterheadFile: File | null;
  logoFile: File | null;
  logoPosition: LogoPosition;
  designColor: string;
  absenderUnternehmensname: string;
  absenderStrasse: string;
  absenderPlz: string;
  absenderOrt: string;
  /** Wenn true: Straße/PLZ/Ort der Absenderzeile kommen je Empfänger aus der
   * CSV (Arbeitgeber-Adresse, siehe EMPLOYER_FIELDS) statt aus den Feldern
   * oben - für Kampagnen mit mehreren Arbeitgeber-Standorten in einer Liste. */
  absenderAusCsv: boolean;

  // Schritt 2: Anschreibentext — entweder unverändert aus einer Vorlage (b)
  // oder frei bearbeitet/individuell (c); technisch dasselbe Feld, die
  // Vorlagen-Buttons in StepText befüllen es nur initial.
  bodyHtml: string;
  /**
   * Welche Standardvorlage als Ausgangspunkt gewählt wurde, damit der
   * zugehörige Knopf in Schritt 2 markiert bleibt. Rein informativ - der Text
   * in bodyHtml ist danach frei bearbeitbar und kann längst abweichen; null
   * nach "Leer beginnen". Absichtlich keine Ableitung durch Textvergleich:
   * die Markierung soll die Wahl anzeigen und nicht beim ersten Tastendruck
   * verschwinden.
   */
  standardTextId: StandardTextVariant | null;
  showHeadline: boolean;
  headlineText: string;
  showDate: boolean;
  dateMonthOffset: 0 | 1 | 2;
  duSieMode: DuSieMode;
  fontId: string;
  /** Nur relevant wenn fontId === CUSTOM_FONT_ID (siehe lib/fonts.ts) */
  customFontFile: File | null;
  fontSizePt: number;
  ansprechpartnerAnrede: "Herr" | "Frau";
  ansprechpartnerName: string;
  ansprechpartnerTelefon: string;
  ansprechpartnerEmail: string;

  // Schritt 3: Seite 2 (Headerfoto + Beratungslink)
  photoMode: "upload" | "stock";
  photoFile: File | null;
  stockPhotoId: string;
  beratungslinkSubdomain: string;
  beratungslinkDomain: string;

  // Schritt 4: Adressliste
  csvFile: File | null;
  csvHeaders: string[];
  csvRows: Record<string, string>[];
  mapping: ColumnMapping;
  anredezeileConfig: AnredezeileConfig;
};

const initialStandardText = getStandardText("j-sie");

export const initialWizardState: WizardState = {
  letterheadMode: "logo",
  letterheadFile: null,
  logoFile: null,
  logoPosition: "left",
  designColor: DEFAULT_DESIGN_COLOR,
  absenderUnternehmensname: "",
  absenderStrasse: "",
  absenderPlz: "",
  absenderOrt: "",
  absenderAusCsv: false,

  bodyHtml: initialStandardText.bodyHtml,
  standardTextId: "j-sie",
  showHeadline: initialStandardText.defaultHeadline !== "",
  headlineText: initialStandardText.defaultHeadline,
  showDate: true,
  dateMonthOffset: 0,
  duSieMode: initialStandardText.duSie,
  fontId: DEFAULT_FONT_ID,
  customFontFile: null,
  fontSizePt: 10.5,
  ansprechpartnerAnrede: "Frau",
  ansprechpartnerName: "",
  ansprechpartnerTelefon: "",
  ansprechpartnerEmail: "",

  photoMode: "stock",
  photoFile: null,
  stockPhotoId: "1",
  beratungslinkSubdomain: "",
  beratungslinkDomain: DEFAULT_BERATUNGSLINK_DOMAIN,

  csvFile: null,
  csvHeaders: [],
  csvRows: [],
  mapping: {},
  anredezeileConfig: { mode: "column", column: "" },
};

export type StepProps = {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
};
