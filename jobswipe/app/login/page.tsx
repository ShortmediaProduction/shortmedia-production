import { sendeLink } from "./actions";

const FEHLER: Record<string, string> = {
  account: "Dieser Account hat keinen Zugang.",
  link: "Der Link ist abgelaufen oder ungültig. Bitte neu anfordern.",
  senden: "Der Link konnte nicht verschickt werden.",
};

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams;
  return (
    <div className="app">
      <main className="inhalt" style={{ justifyContent: "center" }}>
        <div className="logo" style={{ fontSize: 28, marginBottom: 6 }}>
          <span className="logo-punkt" aria-hidden />
          jobswipe
        </div>
        <p style={{ color: "var(--mittel)", marginTop: 0 }}>Private App. Anmeldung per Link an deine E-Mail.</p>
        {p.fehler && <div className="warnung">{FEHLER[p.fehler] ?? "Anmeldung fehlgeschlagen."}</div>}
        {p.gesendet ? (
          <div className="block">
            <h2>Link ist unterwegs</h2>
            <p className="ohne-abstand" style={{ fontSize: 14 }}>Öffne den Link in der Mail auf diesem Gerät.</p>
          </div>
        ) : (
          <form action={sendeLink} className="block">
            <div className="feld">
              <label htmlFor="email">E-Mail</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="eingabe" />
            </div>
            <button className="knopf" type="submit" style={{ width: "100%" }}>Login-Link schicken</button>
          </form>
        )}
      </main>
    </div>
  );
}
