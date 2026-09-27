import { SwipeDeck } from "@/components/SwipeDeck";
import { TabBar } from "@/components/TabBar";

export default function Home() {
  return (
    <div className="app">
      <SwipeDeck />
      <TabBar />
    </div>
  );
}
