import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { buildAbsenderzeile } from "@/lib/absenderzeile";
import { buildBeratungslinkUrl } from "@/lib/beratungslink";
import {
  applyMapping,
  decodeCsvBytes,
  MAX_RECIPIENTS,
  parseCsv,
  type AnredezeileConfig,
  type ColumnMapping,
} from "@/lib/csv/parseAddresses";
import { buildCustomFontFaceCss, buildFontFaceCss, CUSTOM_FONT_ID } from "@/lib/fonts";
import { buildFullHtml, type DuSieMode, type LetterheadConfig } from "@/lib/pdf/buildHtml";
import { renderFirstPdfPageToPng } from "@/lib/pdf/letterheadToImage";
import { renderHtmlToPdf } from "@/lib/pdf/render";
import { generateQrDataUrl } from "@/lib/qr";
import { istBeratungQrUrlGueltig, normalisiereBeratungQrUrl } from "@/lib/beratungQr";
import { STOCK_PHOTOS } from "@/lib/stockPhotos";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function fileToDataUrl(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buf.toString("base64")}`;
}

async function resolveLetterhead(form: FormData): Promise<LetterheadConfig | { error: string }> {
  const mode = form.get("letterheadMode");

  if (mode === "logo") {
    const logo = form.get("logoFile");
    const position = form.get("logoPosition");
    if (!(logo instanceof File) || logo.size === 0) {
      return { error: "Bitte ein Logo hochladen." };
    }
    if (!SUPPORTED_IMAGE_TYPES.has(logo.type)) {
      return { error: "Logo muss PNG, JPEG oder WebP sein." };
    }
    const pos = position === "left" || position === "center" || position === "right" ? position : "center";
    return { mode: "logo", dataUrl: await fileToDataUrl(logo), position: pos };
  }

  if (mode === "image") {
    const letterhead = form.get("letterheadFile");
    if (!(letterhead instanceof File) || letterhead.size === 0) {
      return { error: "Bitte einen Firmen-Briefbogen hochladen." };
    }
    if (letterhead.type === "application/pdf") {
      try {
        const pdfBuf = Buffer.from(await letterhead.arrayBuffer());
        const png = await renderFirstPdfPageToPng(pdfBuf);
        return { mode: "image", dataUrl: `data:image/png;base64,${png.toString("base64")}` };
      } catch (e) {
        console.error("PDF-Briefbogen-Konvertierung fehlgeschlagen:", e);
        return {
          error:
            "Der PDF-Briefbogen konnte nicht gelesen werden. Bitte als Bild (PNG/JPEG) hochladen oder eine andere PDF versuchen.",
        };
      }
    }
    if (SUPPORTED_IMAGE_TYPES.has(letterhead.type)) {
      return { mode: "image", dataUrl: await fileToDataUrl(letterhead) };
    }
    return {
      error:
        "Nicht unterstütztes Format für den Briefbogen. Bitte PDF, PNG, JPEG oder WebP hochladen (Word-Dateien bitte vorher als PDF exportieren).",
    };
  }

  return { error: "Ungültiger Briefbogen-Modus." };
}

async function resolvePage2Photo(form: FormData): Promise<string | { error: string }> {
  const mode = form.get("photoMode");
  if (mode === "upload") {
    const photo = form.get("photoFile");
    if (!(photo instanceof File) || photo.size === 0) {
      return { error: "Bitte ein Headerfoto hochladen." };
    }
    if (!SUPPORTED_IMAGE_TYPES.has(photo.type)) {
      return { error: "Headerfoto muss PNG, JPEG oder WebP sein." };
    }
    return fileToDataUrl(photo);
  }
  if (mode === "stock") {
    const id = String(form.get("stockPhotoId") ?? "");
    const found = STOCK_PHOTOS.find((p) => p.id === id);
    if (!found) return { error: "Ungültiges Standardmotiv." };
    const filePath = path.join(process.cwd(), "public", "stock-photos", `${id}.${found.ext}`);
    const buf = fs.readFileSync(filePath);
    const mime = found.ext === "jpg" ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  }
  return { error: "Ungültiger Foto-Modus." };
}

function readPublicFile(relPath: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), "public", relPath));
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err(
      "Die Anfrage war zu groß oder ungültig. Bitte kleinere Dateien verwenden (Briefbogen/Fotos möglichst < 2 MB)."
    );
  }

  const letterhead = await resolveLetterhead(form);
  if ("error" in letterhead) return err(letterhead.error);

  const page2PhotoDataUrl = await resolvePage2Photo(form);
  if (typeof page2PhotoDataUrl !== "string") return err(page2PhotoDataUrl.error);

  const bodyHtmlRaw = form.get("bodyHtml");
  if (typeof bodyHtmlRaw !== "string" || bodyHtmlRaw.trim() === "") {
    return err("Bitte einen Anschreibentext eingeben oder eine Vorlage wählen.");
  }
  const bodyHtml = bodyHtmlRaw;

  const designColor = String(form.get("designColor") ?? "");
  if (!HEX_COLOR_RE.test(designColor)) {
    return err("Bitte eine gültige Design-Farbe als Hex-Wert angeben (z.B. #1E6FA6).");
  }

  const showHeadline = form.get("showHeadline") === "true";
  const headlineText = String(form.get("headlineText") ?? "");
  if (showHeadline && headlineText.trim() === "") {
    return err("Bitte einen Text für die Überschrift eingeben oder sie deaktivieren.");
  }

  const absenderUnternehmensname = String(form.get("absenderUnternehmensname") ?? "");
  const absenderStrasse = String(form.get("absenderStrasse") ?? "");
  const absenderPlz = String(form.get("absenderPlz") ?? "");
  const absenderOrt = String(form.get("absenderOrt") ?? "");
  const absenderAusCsv = form.get("absenderAusCsv") === "true";
  const absenderzeile = buildAbsenderzeile(absenderUnternehmensname, absenderStrasse, absenderPlz, absenderOrt);
  const showDate = form.get("showDate") === "true";
  const dateMonthOffsetRaw = Number(form.get("dateMonthOffset") ?? 0);
  const dateMonthOffset = [0, 1, 2].includes(dateMonthOffsetRaw) ? dateMonthOffsetRaw : 0;

  const duSieModeRaw = form.get("duSieMode");
  const duSieMode: DuSieMode = duSieModeRaw === "du" ? "du" : "sie";

  const beratungslinkSubdomain = String(form.get("beratungslinkSubdomain") ?? "");
  const beratungslinkDomain = String(form.get("beratungslinkDomain") ?? "");
  if (!beratungslinkSubdomain.trim()) {
    return err("Bitte die Subdomain für den Beratungslink angeben.");
  }
  const beratungslinkUrl = buildBeratungslinkUrl(beratungslinkSubdomain, beratungslinkDomain);

  const fontId = String(form.get("fontId") ?? "carlito");
  const fontSizePt = Number(form.get("fontSizePt") ?? 10.5) || 10.5;

  let customFontFaceCss = "";
  if (fontId === CUSTOM_FONT_ID) {
    const customFontFile = form.get("customFontFile");
    if (!(customFontFile instanceof File) || customFontFile.size === 0) {
      return err("Bitte eine eigene Schriftart-Datei (TTF oder OTF) hochladen.");
    }
    if (!/\.(ttf|otf)$/i.test(customFontFile.name)) {
      return err("Die eigene Schriftart muss eine TTF- oder OTF-Datei sein.");
    }
    const customFontBuf = Buffer.from(await customFontFile.arrayBuffer());
    customFontFaceCss = buildCustomFontFaceCss(customFontBuf, customFontFile.name);
  }

  const ansprechpartnerAnredeRaw = String(form.get("ansprechpartnerAnrede") ?? "Frau");
  const ansprechpartnerAnrede = ansprechpartnerAnredeRaw === "Herr" ? "Herr" : "Frau";
  const ansprechpartnerName = String(form.get("ansprechpartnerName") ?? "");
  const ansprechpartnerTelefon = String(form.get("ansprechpartnerTelefon") ?? "");
  const ansprechpartnerEmail = String(form.get("ansprechpartnerEmail") ?? "");
  const usesAnsprechpartner = /\{\{\s*Ansprechpartner(Name|Telefon|Email)\s*\}\}/.test(bodyHtml);
  if (usesAnsprechpartner && (!ansprechpartnerName.trim() || !ansprechpartnerTelefon.trim() || !ansprechpartnerEmail.trim())) {
    return err(
      "Der Brieftext verwendet die Ansprechpartner-Platzhalter - bitte Name, Telefonnummer und E-Mail des bAV-Ansprechpartners angeben."
    );
  }

  const csvFile = form.get("csvFile");
  const mappingRaw = form.get("mapping");
  const anredezeileConfigRaw = form.get("anredezeileConfig");
  if (!(csvFile instanceof File) || csvFile.size === 0) {
    return err("Bitte eine CSV-Adressliste hochladen.");
  }
  if (typeof mappingRaw !== "string") {
    return err("Spalten-Zuordnung fehlt.");
  }
  if (typeof anredezeileConfigRaw !== "string") {
    return err("Einstellung für die Briefanredezeile fehlt.");
  }

  let mapping: ColumnMapping;
  let anredezeileConfig: AnredezeileConfig;
  try {
    mapping = JSON.parse(mappingRaw);
    anredezeileConfig = JSON.parse(anredezeileConfigRaw);
  } catch {
    return err("Spalten-Zuordnung ist ungültig.");
  }

  let recipients;
  try {
    const csvText = decodeCsvBytes(new Uint8Array(await csvFile.arrayBuffer()));
    const { rows } = parseCsv(csvText);
    recipients = applyMapping(rows, mapping, anredezeileConfig, {
      requireEmployerFields: absenderAusCsv,
      requireChartFields: /\{\{\s*Beitragsgrafik\s*\}\}/.test(bodyHtml),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "CSV konnte nicht verarbeitet werden.");
  }

  if (recipients.length === 0) {
    return err("Die Adressliste enthält keine gültigen Zeilen.");
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return err(
      `Die Adressliste enthält ${recipients.length} Empfänger. Aktuell sind maximal ${MAX_RECIPIENTS} pro Lauf unterstützt (Zeitlimit der Plattform) - bitte in mehreren Läufen aufteilen.`
    );
  }

  const fontFaceCss = buildFontFaceCss((relPath) => readPublicFile(relPath)) + customFontFaceCss;

  let qrCodeDataUrl: string;
  try {
    qrCodeDataUrl = await generateQrDataUrl(beratungslinkUrl, "#000000");
  } catch (e) {
    console.error("QR-Code-Erzeugung fehlgeschlagen:", e);
    return err("Der QR-Code konnte nicht erzeugt werden. Bitte die Beratungslink-URL prüfen.", 500);
  }

  // Optionaler zweiter QR-Code am Fuß von Seite 2 (persönliche Beratung).
  const beratungQrAktiv = form.get("beratungQrAktiv") === "true";
  const beratungQrUeberschrift = String(form.get("beratungQrUeberschrift") ?? "");
  // Kontaktzeile: Vorgabe "an", damit ältere Aufrufe ohne diese Felder sich
  // weiter wie bisher verhalten.
  const beratungQrKontaktZeigen = form.get("beratungQrKontaktZeigen") !== "false";
  const beratungQrKontaktTelefon = form.get("beratungQrKontaktTelefon") !== "false";
  const beratungQrKontaktEmail = form.get("beratungQrKontaktEmail") !== "false";
  let beratungQrDataUrl = "";
  if (beratungQrAktiv) {
    const eingabe = String(form.get("beratungQrUrl") ?? "");
    if (!istBeratungQrUrlGueltig(eingabe)) {
      return err(
        "Bitte eine gültige Adresse für den Beratungs-QR-Code angeben (Schritt 3) oder die Option abwählen."
      );
    }
    try {
      beratungQrDataUrl = await generateQrDataUrl(normalisiereBeratungQrUrl(eingabe), "#000000");
    } catch (e) {
      console.error("Beratungs-QR-Code fehlgeschlagen:", e);
      return err("Der Beratungs-QR-Code konnte nicht erzeugt werden. Bitte die Adresse prüfen.", 500);
    }
  }

  const html = buildFullHtml(
    {
      fontId,
      fontSizePt,
      designColor,
      bodyHtml,
      showHeadline,
      headlineText,
      absenderzeile,
      absenderAusCsv,
      unternehmensname: absenderUnternehmensname,
      ansprechpartnerAnrede,
      ansprechpartnerName,
      ansprechpartnerTelefon,
      ansprechpartnerEmail,
      showDate,
      dateMonthOffset,
      letterhead,
      page2PhotoDataUrl,
      duSieMode,
      beratungslinkUrl,
      qrCodeDataUrl,
      beratungQrDataUrl,
      beratungQrUeberschrift,
      beratungQrKontaktZeigen,
      beratungQrKontaktTelefon,
      beratungQrKontaktEmail,
    },
    recipients,
    fontFaceCss
  );

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderHtmlToPdf(html);
  } catch (e) {
    console.error("PDF-Rendering fehlgeschlagen:", e);
    return err("Die PDF-Erzeugung ist fehlgeschlagen. Bitte erneut versuchen.", 500);
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Serienbriefe.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
