export default function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/dwerk-logo.jpg" alt="dWERK" className="h-11 w-auto" />
        {/* Zielplatz für die Konfigurations-Knöpfe. Sie brauchen den Zustand des
            Wizards, dieser Header liegt aber im Layout - der Wizard rendert sie
            deshalb per Portal hier hinein (siehe Wizard.tsx). Bleibt leer, bis
            der Wizard im Browser läuft. */}
        <div id="kopf-aktionen" className="flex flex-wrap items-center justify-end gap-2" />
      </div>
    </header>
  );
}
