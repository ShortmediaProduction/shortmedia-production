import type { AlertParser } from "./util";
import { extrahiereNachLinks } from "./util";

export const jobscout24Parser: AlertParser = {
  quelle: "JobScout24 (Alert)",
  erkennt: ({ from }) => /@([a-z0-9-]+\.)?jobscout24\.ch/i.test(from),
  parse(html) {
    return extrahiereNachLinks(html, this.quelle, (url) => {
      const m = url.match(/jobscout24\.ch\/(de|fr|en)\/job\/([a-z0-9-]+)/i);
      return m ? { id: m[2], url: `https://www.jobscout24.ch/${m[1]}/job/${m[2]}/` } : null;
    });
  },
};
