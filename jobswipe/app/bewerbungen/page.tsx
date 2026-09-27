import { Bewerbungen } from "@/components/Bewerbungen";
import { Kopfzeile, TabBar } from "@/components/TabBar";

export default function Seite() {
  return (
    <div className="app">
      <Kopfzeile />
      <main className="inhalt">
        <Bewerbungen />
      </main>
      <TabBar />
    </div>
  );
}
