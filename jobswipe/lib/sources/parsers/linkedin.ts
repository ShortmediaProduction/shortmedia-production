import type { AlertParser } from "./util";
import { extrahiereNachLinks } from "./util";

// LinkedIn wird NIE direkt abgerufen (AGB). Wir lesen nur die Alert-Mails, die LinkedIn selbst verschickt.
export const linkedinParser: AlertParser = {
  quelle: "LinkedIn (Alert)",
  erkennt: ({ from }) => /@(e\.)?linkedin\.com/i.test(from),
  parse(html) {
    return extrahiereNachLinks(html, this.quelle, (url) => {
      const m = url.match(/linkedin\.com\/(?:comm\/)?jobs\/view\/(?:[^/?#]*?-)?(\d{6,})/i);
      return m ? { id: m[1], url: `https://www.linkedin.com/jobs/view/${m[1]}/` } : null;
    });
  },
};
