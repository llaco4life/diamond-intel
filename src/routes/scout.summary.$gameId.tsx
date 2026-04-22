import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/AppShell";
import { GameSummaryView } from "@/components/scout/GameSummaryView";

export const Route = createFileRoute("/scout/summary/$gameId")({
  component: SummaryRoute,
});

function SummaryRoute() {
  const { gameId } = Route.useParams();
  return (
    <ProtectedShell>
      <GameSummaryView gameId={gameId} />
    </ProtectedShell>
  );
}
