"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconKarten, IconMappe, IconRegler } from "./Icons";

const TABS = [
  { href: "/", label: "Swipen", Icon: IconKarten },
  { href: "/bewerbungen", label: "Bewerbungen", Icon: IconMappe },
  { href: "/einstellungen", label: "Einstellungen", Icon: IconRegler },
];

export function TabBar() {
  const pfad = usePathname();
  return (
    <div className="tabbar">
      <nav aria-label="Hauptnavigation">
        {TABS.map(({ href, label, Icon }) => {
          const aktiv = href === "/" ? pfad === "/" : pfad.startsWith(href);
          return (
            <Link key={href} href={href} className="tab" aria-current={aktiv ? "page" : undefined}>
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Kopfzeile({ rechts }: { rechts?: React.ReactNode }) {
  return (
    <header className="kopfzeile">
      <div className="logo">
        <span className="logo-punkt" aria-hidden />
        jobswipe
      </div>
      <div className="kopf-info">{rechts}</div>
    </header>
  );
}
