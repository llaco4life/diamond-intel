import { createFileRoute } from "@tanstack/react-router";
import { Eye } from "lucide-react";
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

  if (isCoach) {
    return <GameSetup />;
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Eye className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold">No active game</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your coach will start one when the game begins.
      </p>
    </div>
  );
}
