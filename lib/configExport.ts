"use client";

import type { WizardState } from "@/components/wizardTypes";

/**
 * Export/Import der Wizard-Konfiguration als JSON-Datei ("Kampagne
 * speichern/laden"), damit wiederkehrende Kampagnen (gleicher Kunde, gleicher
 * Briefbogen/Text/Ansprechpartner) nicht jedes Mal neu eingetippt werden
 * müssen. Enthält bewusst NICHT die Adressliste (CSV) - die ist pro Lauf
 * unterschiedlich und wird separat hochgeladen.
 *
 * Datei-Uploads (Briefbogen, Logo, Foto) werden als data:-URI eingebettet,
 * damit die komplette Kampagne in einer einzigen Datei steckt.
 */

const CONFIG_FILE_TYPE = "serienbrief-generator-konfiguration";
const CONFIG_FILE_VERSION = 1;

type SerializedFile = { name: string; type: string; dataUrl: string };

// Alle Felder aus WizardState, die in die Export-Datei aufgenommen werden -
// File-Felder werden zu SerializedFile, csvFile/csvHeaders/csvRows fehlen
// bewusst (siehe oben).
type ExportedConfig = {
  letterheadMode: WizardState["letterheadMode"];
  letterheadFile: SerializedFile | null;
  logoFile: SerializedFile | null;
  logoPosition: WizardState["logoPosition"];
  designColor: string;
  absenderUnternehmensname: string;
  absenderStrasse: string;
  absenderPlz: string;
  absenderOrt: string;
  absenderAusCsv: boolean;

  bodyHtml: string;
  showHeadline: boolean;
  headlineText: string;
  showDate: boolean;
  dateMonthOffset: WizardState["dateMonthOffset"];
  duSieMode: WizardState["duSieMode"];
  fontId: string;
  customFontFile: SerializedFile | null;
  fontSizePt: number;
  ansprechpartnerAnrede: WizardState["ansprechpartnerAnrede"];
  ansprechpartnerName: string;
  ansprechpartnerTelefon: string;
  ansprechpartnerEmail: string;

  photoMode: WizardState["photoMode"];
  photoFile: SerializedFile | null;
  stockPhotoId: string;
  beratungslinkSubdomain: string;
  beratungslinkDomain: string;

  mapping: WizardState["mapping"];
  anredezeileConfig: WizardState["anredezeileConfig"];
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

async function serializeFile(file: File | null): Promise<SerializedFile | null> {
  if (!file) return null;
  return { name: file.name, type: file.type, dataUrl: await fileToDataUrl(file) };
}

function deserializeFile(f: SerializedFile | null): File | null {
  if (!f) return null;
  const [, base64] = f.dataUrl.split(",", 2);
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], f.name, { type: f.type });
}

/** Baut die JSON-Textdatei zum Download aus dem aktuellen Wizard-State. */
export async function buildConfigExport(state: WizardState): Promise<string> {
  const config: ExportedConfig = {
    letterheadMode: state.letterheadMode,
    letterheadFile: await serializeFile(state.letterheadFile),
    logoFile: await serializeFile(state.logoFile),
    logoPosition: state.logoPosition,
    designColor: state.designColor,
    absenderUnternehmensname: state.absenderUnternehmensname,
    absenderStrasse: state.absenderStrasse,
    absenderPlz: state.absenderPlz,
    absenderOrt: state.absenderOrt,
    absenderAusCsv: state.absenderAusCsv,

    bodyHtml: state.bodyHtml,
    showHeadline: state.showHeadline,
    headlineText: state.headlineText,
    showDate: state.showDate,
    dateMonthOffset: state.dateMonthOffset,
    duSieMode: state.duSieMode,
    fontId: state.fontId,
    customFontFile: await serializeFile(state.customFontFile),
    fontSizePt: state.fontSizePt,
    ansprechpartnerAnrede: state.ansprechpartnerAnrede,
    ansprechpartnerName: state.ansprechpartnerName,
    ansprechpartnerTelefon: state.ansprechpartnerTelefon,
    ansprechpartnerEmail: state.ansprechpartnerEmail,

    photoMode: state.photoMode,
    photoFile: await serializeFile(state.photoFile),
    stockPhotoId: state.stockPhotoId,
    beratungslinkSubdomain: state.beratungslinkSubdomain,
    beratungslinkDomain: state.beratungslinkDomain,

    mapping: state.mapping,
    anredezeileConfig: state.anredezeileConfig,
  };

  return JSON.stringify(
    { type: CONFIG_FILE_TYPE, version: CONFIG_FILE_VERSION, savedAt: new Date().toISOString(), config },
    null,
    2
  );
}

/** Parst eine zuvor exportierte JSON-Datei zurück in ein Partial<WizardState> zum Anwenden per update(). */
export function parseConfigImport(jsonText: string): Partial<WizardState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Die Datei ist keine gültige JSON-Datei.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>).type !== CONFIG_FILE_TYPE ||
    typeof (parsed as Record<string, unknown>).config !== "object"
  ) {
    throw new Error("Diese Datei ist keine gültige Serienbrief-Generator-Konfiguration.");
  }
  const config = (parsed as { config: ExportedConfig }).config;

  return {
    letterheadMode: config.letterheadMode,
    letterheadFile: deserializeFile(config.letterheadFile),
    logoFile: deserializeFile(config.logoFile),
    logoPosition: config.logoPosition,
    designColor: config.designColor,
    absenderUnternehmensname: config.absenderUnternehmensname,
    absenderStrasse: config.absenderStrasse,
    absenderPlz: config.absenderPlz,
    absenderOrt: config.absenderOrt,
    absenderAusCsv: config.absenderAusCsv ?? false,

    bodyHtml: config.bodyHtml,
    showHeadline: config.showHeadline,
    headlineText: config.headlineText,
    showDate: config.showDate,
    dateMonthOffset: config.dateMonthOffset,
    duSieMode: config.duSieMode,
    fontId: config.fontId,
    customFontFile: deserializeFile(config.customFontFile ?? null),
    fontSizePt: config.fontSizePt,
    ansprechpartnerAnrede: config.ansprechpartnerAnrede,
    ansprechpartnerName: config.ansprechpartnerName,
    ansprechpartnerTelefon: config.ansprechpartnerTelefon,
    ansprechpartnerEmail: config.ansprechpartnerEmail,

    photoMode: config.photoMode,
    photoFile: deserializeFile(config.photoFile),
    stockPhotoId: config.stockPhotoId,
    beratungslinkSubdomain: config.beratungslinkSubdomain,
    beratungslinkDomain: config.beratungslinkDomain,

    mapping: config.mapping,
    anredezeileConfig: config.anredezeileConfig,
  };
}
