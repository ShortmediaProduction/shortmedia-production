import type { AlertParser } from "./util";
import { extrahiereNachLinks } from "./util";

// jobs.ch und jobup.ch gehören beide zu JobCloud und haben dieselbe URL-Struktur.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

function jobcloudParser(domain: "jobs.ch" | "jobup.ch"): AlertParser {
  const d = domain.replace(".", "\\.");
  const re = new RegExp(`${d}\\/(de|fr|en)\\/(stellenangebote|offres-emplois|vacancies)\\/detail\\/(${UUID})`, "i");
  return {
    quelle: `${domain} (Alert)`,
    erkennt: ({ from }) => new RegExp(`@([a-z0-9-]+\\.)?${d}`, "i").test(from),
    parse(html) {
      return extrahiereNachLinks(html, this.quelle, (url) => {
        const m = url.match(re);
        return m ? { id: m[3], url: `https://www.${domain}/${m[1]}/${m[2]}/detail/${m[3]}/` } : null;
      });
    },
  };
}

export const jobsChParser = jobcloudParser("jobs.ch");
export const jobupParser = jobcloudParser("jobup.ch");
