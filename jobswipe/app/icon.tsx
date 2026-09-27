import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** App-Icon: zwei versetzte Karten in der CI. */
export default function Icon() {
  return new ImageResponse(<Marke groesse={512} />, size);
}

export function Marke({ groesse }: { groesse: number }) {
  const k = groesse / 512;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F2F2F0" }}>
      <div style={{ position: "relative", width: 300 * k, height: 360 * k, display: "flex" }}>
        <div style={{ position: "absolute", left: 40 * k, top: 0, width: 220 * k, height: 300 * k, borderRadius: 34 * k, background: "#D8D8D4", transform: "rotate(-8deg)" }} />
        <div style={{ position: "absolute", left: 40 * k, top: 40 * k, width: 220 * k, height: 300 * k, borderRadius: 34 * k, background: "#FFFFFF", border: `${6 * k}px solid #232323`, display: "flex", alignItems: "flex-end", padding: 30 * k }}>
          <div style={{ width: 70 * k, height: 14 * k, borderRadius: 7 * k, background: "#F5551E" }} />
        </div>
      </div>
    </div>
  );
}
