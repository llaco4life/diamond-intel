import { createFileRoute } from "@tanstack/react-router";
import { GameSummaryView } from "@/components/scout/GameSummaryView";

export const Route = createFileRoute("/scout/summary/$gameId")({
  component: SummaryRoute,
});

function SummaryRoute() {
  const { gameId } = Route.useParams();
  return <GameSummaryView gameId={gameId} />;
}
