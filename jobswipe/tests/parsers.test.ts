import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { linkedinParser } from "@/lib/sources/parsers/linkedin";
import { jobsChParser, jobupParser } from "@/lib/sources/parsers/jobcloud";
import { indeedParser } from "@/lib/sources/parsers/indeed";
import { parserFuer } from "@/lib/sources/parsers";
import { entpackeUrl } from "@/lib/sources/parsers/util";

const fixture = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");

describe("Parser-Auswahl", () => {
  it("erkennt Absender", () => {
    expect(parserFuer({ from: "LinkedIn Job Alerts <jobalerts-noreply@linkedin.com>", subject: "" })?.quelle).toBe("LinkedIn (Alert)");
    expect(parserFuer({ from: "jobs.ch <noreply@mail.jobs.ch>", subject: "" })?.quelle).toBe("jobs.ch (Alert)");
    expect(parserFuer({ from: "jobup.ch <alert@jobup.ch>", subject: "" })?.quelle).toBe("jobup.ch (Alert)");
    expect(parserFuer({ from: "Indeed <alert@indeed.com>", subject: "" })?.quelle).toBe("Indeed (Alert)");
    expect(parserFuer({ from: "someone@example.com", subject: "" })).toBeNull();
  });
});

describe("LinkedIn", () => {
  it("liest Titel, Firma, Ort und kanonische URL", () => {
    const jobs = linkedinParser.parse(fixture("linkedin-alert.html"), "");
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      titel: "Kamera-Assistent:in (2nd AC)",
      firma: "Beispiel Film AG",
      ort: "Basel, Basel-Stadt, Schweiz",
      url: "https://www.linkedin.com/jobs/view/4012345678/",
    });
    expect(jobs[1]).toMatchObject({ titel: "Junior Videograf", firma: "Nordlicht Studios", ort: "Zürich, Schweiz" });
  });
});

describe("jobs.ch", () => {
  it("löst Tracking-Links auf und ignoriert Button-Texte", () => {
    const jobs = jobsChParser.parse(fixture("jobsch-alert.html"), "");
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      titel: "Produktionsassistent/in 80-100%",
      firma: "Grade Lab AG",
      ort: "Basel",
      url: "https://www.jobs.ch/de/stellenangebote/detail/1b2c3d4e-1111-2222-3333-444455556666/",
    });
    expect(jobs[1]).toMatchObject({ titel: "Praktikant Postproduktion (m/w/d)", firma: "Lichtblick Rental GmbH", ort: "Zürich" });
  });

  it("jobup.ch nutzt dieselbe Logik", () => {
    const html = fixture("jobsch-alert.html").replaceAll("jobs.ch/de/stellenangebote", "jobup.ch/fr/offres-emplois").replaceAll("jobs.ch%2Fde%2Fstellenangebote", "jobup.ch%2Ffr%2Foffres-emplois");
    const jobs = jobupParser.parse(html, "");
    expect(jobs).toHaveLength(2);
    expect(jobs[0].url).toBe("https://www.jobup.ch/fr/offres-emplois/detail/1b2c3d4e-1111-2222-3333-444455556666/");
  });
});

describe("Indeed", () => {
  it("liest jk-Parameter", () => {
    const html = `<div><a href="https://ch.indeed.com/rc/clk?jk=a1b2c3d4e5f60718&amp;from=ja">Videograf/in</a><span>Agentur Flimmer</span><span>Bern</span></div>`;
    const jobs = indeedParser.parse(html, "");
    expect(jobs).toEqual([
      { quelle: "Indeed (Alert)", url: "https://ch.indeed.com/viewjob?jk=a1b2c3d4e5f60718", titel: "Videograf/in", firma: "Agentur Flimmer", ort: "Bern" },
    ]);
  });
});

describe("entpackeUrl", () => {
  it("folgt verschachtelten Redirect-Parametern", () => {
    const inner = encodeURIComponent("https://www.jobs.ch/de/stellenangebote/detail/x/");
    expect(entpackeUrl(`https://a.example/r?u=${encodeURIComponent(`https://b.example/r?url=${inner}`)}`)).toBe(
      "https://www.jobs.ch/de/stellenangebote/detail/x/",
    );
  });
});
