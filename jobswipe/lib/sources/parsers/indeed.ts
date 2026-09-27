import type { AlertParser } from "./util";
import { extrahiereNachLinks } from "./util";

// Indeed wird nicht abgerufen, nur die Alert-Mails werden gelesen.
export const indeedParser: AlertParser = {
  quelle: "Indeed (Alert)",
  erkennt: ({ from }) => /@([a-z0-9-]+\.)?indeed\.(com|ch)/i.test(from),
  parse(html) {
    return extrahiereNachLinks(html, this.quelle, (url) => {
      if (!/indeed\./i.test(url)) return null;
      const m = url.match(/[?&](?:jk|vjk)=([0-9a-f]{10,20})/i);
      return m ? { id: m[1], url: `https://ch.indeed.com/viewjob?jk=${m[1]}` } : null;
    });
  },
};
