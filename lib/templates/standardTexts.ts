// Die 4 Standardtexte aus "Mitarbeiteranschreiben-Muster-4-Versionen.pdf"
// (Stand 13.11.2025), als editierbares Rich-Text-HTML mit Seriendruck-Platzhaltern.
//
// Verfügbare Platzhalter (werden pro CSV-Zeile ersetzt, siehe lib/pdf/buildHtml.ts):
//   {{Anredezeile}}  - die komplette Anrede-Zeile, z.B. "Lieber Max," oder
//                       "Sehr geehrter Herr Mustermann," (kommt fertig aus der CSV)
//   {{Vorname}}      - Vorname
//   {{Nachname}}     - Nachname
//   {{Freischaltcode}} - persönlicher Freischaltcode (auf Seite 2 verwendet)
//   {{Unternehmensname}}, {{AnsprechpartnerAnrede}}, {{AnsprechpartnerName}},
//   {{AnsprechpartnerTelefon}}, {{AnsprechpartnerEmail}} - kampagnenweite
//   Felder (gelten für alle Empfänger gleich, werden in Schritt 2 gepflegt)
//   {{Beitragsgrafik}} - Donut-Diagramm (Variante C), wird je Empfänger aus
//   den in Schritt 4 zugeordneten Beitragsdaten-Spalten generiert (siehe
//   lib/beitragsgrafik.ts)

export type StandardTextVariant = "j-du" | "j-sie" | "f-du" | "f-sie" | "c-du" | "c-sie";

export type StandardText = {
  id: StandardTextVariant;
  label: string;
  duSie: "du" | "sie";
  /** Vorbelegung für die optionale Überschrift über der Anredezeile (Schritt 2). */
  defaultHeadline: string;
  bodyHtml: string;
};

export const STANDARD_TEXTS: StandardText[] = [
  {
    id: "j-du",
    label: "Variante „A“ – Du-Anrede",
    duSie: "du",
    defaultHeadline: "Warum Geld verschenken?\nSpare Steuern und Sozialabgaben mit unserer Hilfe!",
    bodyHtml: `
<p>{{Anredezeile}}</p>
<p>hast du dir schon Gedanken über deine finanzielle Situation im Rentenalter gemacht? Vielleicht ist dir die betriebliche Altersversorgung (bAV) oder Betriebsrente ein Begriff. Aber wusstest du, dass du durch die bAV Geld, das sonst in Form von Steuer- und Sozialabgaben abfließen würde, für deine zukünftige Rente verwenden könntest? Und das Monat für Monat?</p>
<p>Nutze die Chance, deine Zukunft zu sichern und gleichzeitig Steuern und Sozialabgaben zu sparen!</p>
<p>Uns liegt es am Herzen, dass jede:r Mitarbeiter:in die Möglichkeit bekommt, sich mit einer bAV ein zweites oder sogar drittes Standbein für den Ruhestand aufzubauen. Um einen weiteren Anreiz zu schaffen, unterstützen wir dies mit einem zusätzlichen attraktiven Arbeitgeberzuschuss.</p>
<p><strong>Möchtest du mehr erfahren oder dir unverbindlich deine Betriebsrente berechnen lassen?</strong></p>
<p>Logge dich mit deinen persönlichen Zugangsdaten ein und lasse dich von unserem virtuellen Berater zur Betriebsrente informieren. Deinen persönlichen Freischaltcode findest du auf der nächsten Seite.</p>
<p>Egal wie du dich entscheidest, <strong>bestätige uns bitte die Kenntnisnahme dieser Informationen.</strong> Dies geschieht ganz einfach während der virtuellen Information und dauert nur fünf Minuten.</p>
<p>Solltest du Fragen zur betrieblichen Altersvorsorge haben, die nicht im Rahmen der Beratung geklärt werden können, steht dir {{AnsprechpartnerAnrede}} {{AnsprechpartnerName}} gerne zur Verfügung. Du erreichst {{AnsprechpartnerName}} unter der Telefonnummer {{AnsprechpartnerTelefon}} oder per E-Mail an {{AnsprechpartnerEmail}}.</p>
<p>Wir wünschen dir viel Spaß mit dieser neuartigen bAV-Beratung.</p>
<p>Deine Geschäftsführung</p>`.trim(),
  },
  {
    id: "j-sie",
    label: "Variante „A“ – Sie-Anrede",
    duSie: "sie",
    defaultHeadline: "Warum Geld verschenken?\nSparen Sie Steuern und Sozialabgaben mit unserer Hilfe!",
    bodyHtml: `
<p>{{Anredezeile}}</p>
<p>haben Sie sich schon Gedanken über Ihre finanzielle Situation im Rentenalter gemacht? Vielleicht ist Ihnen die betriebliche Altersversorgung (bAV) oder Betriebsrente ein Begriff. Aber wussten Sie, dass Sie durch die bAV Geld, das sonst in Form von Steuer- und Sozialabgaben abfließen würde, für Ihre zukünftige Rente verwenden könnten? Und das Monat für Monat?</p>
<p>Nutzen Sie die Chance, Ihre Zukunft zu sichern und gleichzeitig Steuern und Sozialabgaben zu sparen!</p>
<p>Uns liegt es am Herzen, dass jede:r Mitarbeiter:in die Möglichkeit bekommt, sich mit einer bAV ein zweites oder sogar drittes Standbein für den Ruhestand aufzubauen. Um einen weiteren Anreiz zu schaffen, unterstützen wir dies mit einem zusätzlichen attraktiven Arbeitgeberzuschuss.</p>
<p><strong>Sie möchten mehr erfahren oder sich unverbindlich Ihre Betriebsrente berechnen lassen?</strong></p>
<p>Loggen Sie sich mit Ihren persönlichen Zugangsdaten ein und lassen Sie sich von unserem virtuellen Berater zur Betriebsrente informieren. Ihren persönlichen Freischaltcode finden Sie auf der nächsten Seite.</p>
<p>Egal wie Sie sich entscheiden, <strong>bestätigen Sie uns bitte die Kenntnisnahme dieser Informationen.</strong> Dies geschieht ganz einfach während der virtuellen Information und dauert nur fünf Minuten.</p>
<p>Sollten Sie Fragen zur betrieblichen Altersvorsorge haben, die nicht im Rahmen der Beratung geklärt werden können, steht Ihnen {{AnsprechpartnerAnrede}} {{AnsprechpartnerName}} gerne zur Verfügung. Sie erreichen {{AnsprechpartnerName}} unter der Telefonnummer {{AnsprechpartnerTelefon}} oder per E-Mail an {{AnsprechpartnerEmail}}.</p>
<p>Wir wünschen Ihnen viel Spaß mit dieser neuartigen bAV-Beratung.</p>
<p>Ihre Geschäftsführung</p>`.trim(),
  },
  {
    id: "f-du",
    label: "Variante „B“ – Du-Anrede",
    duSie: "du",
    defaultHeadline: "",
    bodyHtml: `
<p>{{Anredezeile}}</p>
<p>wie du sicher weißt, sinkt das Niveau der gesetzlichen Rente stetig. Deshalb ist es unumstritten, dass zusätzliche private Vorsorgemaßnahmen für deine finanzielle Sicherheit im Ruhestand von großer Bedeutung sind.</p>
<p>Daher liegt es uns am Herzen, dass alle unsere Mitarbeitende die Chance haben, durch eine betriebliche Altersvorsorge für die Zukunft vorzusorgen.</p>
<p>Im Jahr 2026 kannst du monatlich bis zu 338 Euro (das entspricht 4 % der Beitragsbemessungsgrenze der Rentenversicherung West) steuer- und sozialversicherungsfrei in deine betriebliche Altersvorsorge einbringen. Wir als dein Arbeitgeber unterstützen deinen monatlichen Beitrag, je nach Betriebszugehörigkeit, mit einem Zuschuss von bis zu [0,00] Euro.</p>
<p>Um die Beratung so angenehm und verständlich wie möglich zu machen, nutzen wir einen innovativen Videoplayer. So kannst du dich bequem von zu Hause aus über die Vorteile dieser von uns geförderten Vorsorgeoption informieren. Deinen persönlichen Freischaltcode findest du auf der nächsten Seite.</p>
<p>Bitte nimm dir die Zeit, das Informationsvideo anzuschauen und zu entscheiden, ob du die betriebliche Altersvorsorge in Anspruch nehmen möchtest. Deine Entscheidung hat keinen Einfluss auf bereits bestehende Verträge; eine bereits abgeschlossene betriebliche Altersvorsorge bleibt davon unberührt und wird fortgeführt.</p>
<p>Solltest du Fragen zur betrieblichen Altersvorsorge haben, die nicht im Rahmen der Beratung geklärt werden können, steht dir {{AnsprechpartnerAnrede}} {{AnsprechpartnerName}} gerne zur Verfügung. Du erreichst {{AnsprechpartnerName}} unter der Telefonnummer {{AnsprechpartnerTelefon}} oder per E-Mail an {{AnsprechpartnerEmail}}.</p>
<p>Wir würden uns freuen, wenn du das Angebot zur betrieblichen Altersvorsorge positiv aufnimmst.</p>
<p>Mit freundlichen Grüßen, deine Geschäftsleitung</p>`.trim(),
  },
  {
    id: "f-sie",
    label: "Variante „B“ – Sie-Anrede",
    duSie: "sie",
    defaultHeadline: "",
    bodyHtml: `
<p>{{Anredezeile}}</p>
<p>wie Sie sicher wissen, sinkt das Niveau der gesetzlichen Rente stetig. Deshalb ist es unumstritten, dass zusätzliche private Vorsorgemaßnahmen für Ihre finanzielle Sicherheit im Ruhestand von großer Bedeutung sind.</p>
<p>Daher liegt es uns am Herzen, dass alle unsere Mitarbeiterinnen und Mitarbeiter die Chance haben, durch eine betriebliche Altersvorsorge für die Zukunft vorzusorgen.</p>
<p>Im Jahr 2026 können Sie monatlich bis zu 338 Euro (das entspricht 4 % der Beitragsbemessungsgrenze der Rentenversicherung West) steuer- und sozialversicherungsfrei in Ihre betriebliche Altersvorsorge einbringen. Wir als Ihr Arbeitgeber unterstützen Ihren monatlichen Beitrag, je nach Betriebszugehörigkeit, mit einem Zuschuss von bis zu [0,00] Euro.</p>
<p>Um die Beratung so angenehm und verständlich wie möglich zu gestalten, nutzen wir einen innovativen Videoplayer. So können Sie sich bequem von zu Hause aus über die Vorteile dieser von uns geförderten Vorsorgeoption informieren. Ihren persönlichen Freischaltcode finden Sie auf der nächsten Seite.</p>
<p>Bitte nehmen Sie sich die Zeit, das Informationsvideo anzuschauen und zu entscheiden, ob Sie die betriebliche Altersvorsorge in Anspruch nehmen möchten. Ihre Entscheidung hat keinen Einfluss auf bereits bestehende Verträge; eine bereits abgeschlossene betriebliche Altersvorsorge bleibt davon unberührt und wird fortgeführt.</p>
<p>Sollten Sie Fragen zur betrieblichen Altersvorsorge haben, die nicht im Rahmen der Beratung geklärt werden können, steht Ihnen {{AnsprechpartnerAnrede}} {{AnsprechpartnerName}} gerne zur Verfügung. Sie erreichen {{AnsprechpartnerName}} unter der Telefonnummer {{AnsprechpartnerTelefon}} oder per E-Mail an {{AnsprechpartnerEmail}}.</p>
<p>Wir würden uns freuen, wenn Sie das Angebot zur betrieblichen Altersvorsorge positiv aufnehmen würden.</p>
<p>Mit freundlichen Grüßen, Ihre Geschäftsleitung</p>`.trim(),
  },
  {
    id: "c-du",
    label: "Variante „C“ – Du-Anrede",
    duSie: "du",
    defaultHeadline: "Warum Geld verschenken?\nSpare Steuern und Sozialabgaben mit unserer Hilfe!",
    bodyHtml: `
<p>{{Anredezeile}}</p>
<p>die gesetzliche Rente allein wird für viele Menschen nicht ausreichen, um den gewohnten Lebensstandard im Alter zu sichern. Umso wichtiger ist es, heute auf den effizientesten Weg der Altersvorsorge zu setzen.</p>
<p>Die betriebliche Altersvorsorge (bAV) bietet genau das:</p>
<ul>
<li><p>Steuer- und Sozialabgabenersparnis durch Entgeltumwandlung</p></li>
<li><p>Arbeitgeberzuschüsse, die dein Vorsorgekapital direkt erhöhen</p></li>
<li><p>Automatischer Vermögensaufbau ohne spürbare Mehrbelastung</p></li>
<li><p>Hohe Effizienz, da ein großer Teil deiner Altersvorsorge nicht aus deinem eigenen Netto stammt</p></li>
</ul>
<p>{{Beitragsgrafik}}</p>
<p><strong>Fazit:</strong> Mit der betrieblichen Altersvorsorge nutzt du einen Vorsorgeweg, bei dem mehr für deine Rente arbeitet, als du selbst einzahlst.</p>
<p>Logge dich mit deinen persönlichen Zugangsdaten in den bAV-Videoplayer ein und lass dich zur {{Unternehmensname}}-Betriebsrente informieren.</p>
<p>Dieses Video zeigt dir anschaulich und verständlich alle wichtigen Grundlagen zur betrieblichen Altersvorsorge. Danach erhältst du dein Angebot und erfährst centgenau, wie hoch dein persönlicher Förderanteil ausfällt.</p>
<p>Solltest du ein persönliches Gespräch wünschen, ruf uns an. {{AnsprechpartnerAnrede}} {{AnsprechpartnerName}} steht dir gerne zur Verfügung. Tel: {{AnsprechpartnerTelefon}} oder E-Mail: {{AnsprechpartnerEmail}}.</p>
<p>Spielt die bAV in deiner Rentenplanung derzeit keine Rolle? Kein Problem – bestätige einfach die Kenntnisnahme im Video und nimm die Beratung gerne jederzeit zu einem späteren Zeitpunkt erneut auf.</p>
<p>Wir wünschen dir viel Spaß mit deiner betrieblichen Altersvorsorge.</p>
<p>Deine Geschäftsleitung</p>`.trim(),
  },
  {
    id: "c-sie",
    label: "Variante „C“ – Sie-Anrede",
    duSie: "sie",
    defaultHeadline: "Warum Geld verschenken?\nSparen Sie Steuern und Sozialabgaben mit unserer Hilfe!",
    bodyHtml: `
<p>{{Anredezeile}}</p>
<p>die gesetzliche Rente allein wird für viele Menschen nicht ausreichen, um den gewohnten Lebensstandard im Alter zu sichern. Umso wichtiger ist es, heute auf den effizientesten Weg der Altersvorsorge zu setzen.</p>
<p>Die betriebliche Altersvorsorge (bAV) bietet genau das:</p>
<ul>
<li><p>Steuer- und Sozialabgabenersparnis durch Entgeltumwandlung</p></li>
<li><p>Arbeitgeberzuschüsse, die Ihr Vorsorgekapital direkt erhöhen</p></li>
<li><p>Automatischer Vermögensaufbau ohne spürbare Mehrbelastung</p></li>
<li><p>Hohe Effizienz, da ein großer Teil Ihrer Altersvorsorge nicht aus Ihrem eigenen Netto stammt</p></li>
</ul>
<p>{{Beitragsgrafik}}</p>
<p><strong>Fazit:</strong> Mit der betrieblichen Altersvorsorge nutzen Sie einen Vorsorgeweg, bei dem mehr für Ihre Rente arbeitet, als Sie selbst einzahlen.</p>
<p>Loggen Sie sich mit Ihren persönlichen Zugangsdaten in den bAV-Videoplayer ein und lassen Sie sich zur {{Unternehmensname}}-Betriebsrente informieren.</p>
<p>Dieses Video zeigt Ihnen anschaulich und verständlich alle wichtigen Grundlagen zur betrieblichen Altersvorsorge. Danach erhalten Sie Ihr Angebot und erfahren centgenau, wie hoch Ihr persönlicher Förderanteil ausfällt.</p>
<p>Sollten Sie ein persönliches Gespräch wünschen, rufen Sie uns an. {{AnsprechpartnerAnrede}} {{AnsprechpartnerName}} steht Ihnen gerne zur Verfügung. Tel: {{AnsprechpartnerTelefon}} oder E-Mail: {{AnsprechpartnerEmail}}.</p>
<p>Spielt die bAV in Ihrer Rentenplanung derzeit keine Rolle? Kein Problem – bestätigen Sie einfach die Kenntnisnahme im Video und nehmen Sie die Beratung gerne jederzeit zu einem späteren Zeitpunkt erneut auf.</p>
<p>Wir wünschen Ihnen viel Spaß mit Ihrer betrieblichen Altersvorsorge.</p>
<p>Ihre Geschäftsleitung</p>`.trim(),
  },
];

export function getStandardText(id: StandardTextVariant): StandardText {
  return STANDARD_TEXTS.find((t) => t.id === id) ?? STANDARD_TEXTS[0];
}
