import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useActiveGame } from "@/hooks/useActiveGame";
import { GameSetup } from "@/components/scout/GameSetup";
import { ActiveGame } from "@/components/scout/ActiveGame";

export const Route = createFileRoute("/scout")({
  component: () => (
    <ProtectedShell>
      <ScoutPage />
    </ProtectedShell>
  ),
});

function ScoutPage() {
  const { org, role, loading: authLoading } = useAuth();
  const { game, loading } = useActiveGame(org?.id ?? null);
  const isCoach = role === "head_coach" || role === "assistant_coach";

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  if (game) {
    return <ActiveGame game={game} isCoach={isCoach} />;
  }

  return <GameSetup />;
}
