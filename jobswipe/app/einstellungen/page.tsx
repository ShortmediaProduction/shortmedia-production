import { Suspense } from "react";
import { Einstellungen } from "@/components/Einstellungen";
import { Kopfzeile, TabBar } from "@/components/TabBar";

export default function Seite() {
  return (
    <div className="app">
      <Kopfzeile />
      <main className="inhalt">
        <Suspense>
          <Einstellungen />
        </Suspense>
      </main>
      <TabBar />
    </div>
  );
}
