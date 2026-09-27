import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { absender } from "@/lib/config";

// CI: Poppins, Akzent #F5551E, Text #232323, Mittelgrau #5C5C58, Hellgrau #9A9A96, Linien #D8D8D4
const CI = { akzent: "#F5551E", text: "#232323", mittel: "#5C5C58", hell: "#9A9A96", linie: "#D8D8D4" };

let fontsRegistriert = false;
function registriereFonts() {
  if (fontsRegistriert) return;
  const f = (w: number) => path.join(process.cwd(), "assets", "fonts", `Poppins-${w}.woff`);
  Font.register({
    family: "Poppins",
    fonts: [
      { src: f(400), fontWeight: 400 },
      { src: f(500), fontWeight: 500 },
      { src: f(600), fontWeight: 600 },
      { src: f(700), fontWeight: 700 },
    ],
  });
  // Keine automatische Silbentrennung, Wörter bleiben ganz.
  Font.registerHyphenationCallback((w) => [w]);
  fontsRegistriert = true;
}

const s = StyleSheet.create({
  page: { fontFamily: "Poppins", fontSize: 9.5, color: CI.text, paddingTop: 48, paddingBottom: 56, paddingHorizontal: 56, lineHeight: 1.5 },
  kopf: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: 30, fontWeight: 700, lineHeight: 0.95, letterSpacing: -0.5 },
  kontakt: { fontSize: 8.5, color: CI.mittel, textAlign: "right", lineHeight: 1.45 },
  akzentLinie: { width: 36, height: 3, backgroundColor: CI.akzent, marginTop: 14, marginBottom: 26 },
  adressZeile: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  adresse: { fontSize: 9.5, lineHeight: 1.45 },
  datum: { fontSize: 9, color: CI.mittel },
  titel: { fontSize: 15, fontWeight: 600, marginBottom: 2 },
  untertitel: { fontSize: 10, color: CI.akzent, fontWeight: 500, marginBottom: 18 },
  absatz: { marginBottom: 9, textAlign: "left" },
  gruss: { marginTop: 8 },
  unterschrift: { marginTop: 22, fontWeight: 600 },
  fuss: { position: "absolute", bottom: 28, left: 56, right: 56, borderTopWidth: 0.6, borderTopColor: CI.linie, paddingTop: 6, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: CI.hell },
});

export interface BriefDaten {
  firma: string;
  kontakt?: string | null;
  ort?: string | null;
  untertitel: string;
  anrede: string;
  text: string;
  datum?: Date;
}

export function formatiereDatum(d: Date): string {
  return new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" }).format(d);
}

function Brief({ d }: { d: BriefDaten }) {
  const [vor, ...nach] = absender.name.split(" ");
  const absaetze = d.text.split(/\n\s*\n/).map((a) => a.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  return (
    <Document title={`Motivationsschreiben ${absender.name}, ${d.firma}`} author={absender.name}>
      <Page size="A4" style={s.page}>
        <View style={s.kopf}>
          <View>
            <Text style={s.name}>{vor.toUpperCase()}</Text>
            <Text style={s.name}>{nach.join(" ").toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.kontakt}>{absender.name}</Text>
            {absender.telefon ? <Text style={s.kontakt}>{absender.telefon}</Text> : null}
            {absender.email ? <Text style={s.kontakt}>{absender.email}</Text> : null}
            {absender.web ? <Text style={s.kontakt}>{absender.web}</Text> : null}
          </View>
        </View>
        <View style={s.akzentLinie} />
        <View style={s.adressZeile}>
          <View>
            <Text style={s.adresse}>{d.firma}</Text>
            {d.kontakt ? <Text style={s.adresse}>{d.kontakt}</Text> : null}
            {d.ort ? <Text style={s.adresse}>{d.ort}</Text> : null}
          </View>
          <Text style={s.datum}>
            {absender.ort}, {formatiereDatum(d.datum ?? new Date())}
          </Text>
        </View>
        <Text style={s.titel}>Motivationsschreiben</Text>
        <Text style={s.untertitel}>{d.untertitel}</Text>
        <Text style={s.absatz}>{d.anrede}</Text>
        {absaetze.map((a, i) => (
          <Text key={i} style={s.absatz}>
            {a}
          </Text>
        ))}
        <Text style={s.gruss}>Freundliche Grüsse</Text>
        <Text style={s.unterschrift}>{absender.name}</Text>
        <View style={s.fuss} fixed>
          <Text>{absender.name}</Text>
          <Text>{absender.web}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderBrief(d: BriefDaten): Promise<Buffer> {
  registriereFonts();
  return renderToBuffer(<Brief d={d} />);
}
