import { BewerbungDetail } from "@/components/BewerbungDetail";
import { TabBar } from "@/components/TabBar";

export default async function Seite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="app">
      <BewerbungDetail id={id} />
      <TabBar />
    </div>
  );
}
