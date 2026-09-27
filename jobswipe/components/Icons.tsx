/** Schlichte Linien-Icons (24er Raster). */
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };

export const IconX = (p: P) => (<svg {...base} strokeWidth={2.6} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const IconHerz = (p: P) => (<svg {...base} {...p} fill="currentColor" stroke="none"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" /></svg>);
export const IconStern = (p: P) => (<svg {...base} {...p} fill="currentColor" stroke="none"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" /></svg>);
export const IconZurueck = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></svg>);
export const IconKarten = (p: P) => (<svg {...base} {...p}><rect x="6" y="3" width="13" height="17" rx="3" /><path d="M3.5 7.5v10A3.5 3.5 0 007 21h8" /></svg>);
export const IconMappe = (p: P) => (<svg {...base} {...p}><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3 12.5h18" /></svg>);
export const IconRegler = (p: P) => (<svg {...base} {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>);
export const IconOrt = (p: P) => (<svg {...base} {...p}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>);
export const IconUhr = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const IconKalender = (p: P) => (<svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>);
export const IconExtern = (p: P) => (<svg {...base} {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" /></svg>);
export const IconHaken = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
export const IconAchtung = (p: P) => (<svg {...base} {...p}><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17.5v.01" /></svg>);
export const IconInfo = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></svg>);
export const IconPfeilLinks = (p: P) => (<svg {...base} {...p}><path d="M15 5l-7 7 7 7" /></svg>);
