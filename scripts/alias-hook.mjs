// Loest die "@/..."-Schreibweise fuer die Testskripte auf.
//
// Im Projekt zeigt "@/" auf das Projektverzeichnis (siehe tsconfig.json). Next
// kennt das, das blanke Node nicht - ein Testskript, das eine lib-Datei laedt,
// scheiterte deshalb, sobald diese Datei ihrerseits "@/lib/..." importiert.
//
// Einbinden beim Aufruf:
//   node --import ./scripts/alias-hook.mjs scripts/test-xyz.mjs
import { pathToFileURL } from "node:url";
import path from "node:path";
import { register } from "node:module";

const wurzel = pathToFileURL(path.resolve(process.cwd()) + path.sep).href;

// Die Endung fehlt in den Importen ("@/lib/farbpalette"), weil TypeScript sie
// selbst ergaenzt. Node braucht sie - deshalb ".ts" anhaengen, wenn keine da ist.
register(
  `data:text/javascript,
   export async function resolve(spezifizierer, kontext, naechster) {
     if (spezifizierer.startsWith("@/")) {
       let pfad = ${JSON.stringify(wurzel)} + spezifizierer.slice(2);
       if (!/\\.[a-z]+$/i.test(pfad)) pfad += ".ts";
       return naechster(pfad, kontext);
     }
     return naechster(spezifizierer, kontext);
   }`,
  import.meta.url
);
