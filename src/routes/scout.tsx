import { useState } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useActiveGames, type GameRow } from "@/hooks/useActiveGame";
import { GameSetup } from "@/components/scout/GameSetup";
import { ActiveGame } from "@/components/scout/ActiveGame";
import { GameLobby } from "@/components/scout/GameLobby";

export const Route = createFileRoute("/scout")({
  component: ScoutLayout,
});

function ScoutLayout() {
  const matches = useMatches();
  const isChildRoute = matches.some(
    (m) => m.routeId !== "__root__" && m.routeId !== "/scout" && m.routeId.startsWith("/scout"),
  );

  return <ProtectedShell>{isChildRoute ? <Outlet /> : <ScoutPage />}</ProtectedShell>;
}

function ScoutPage() {
  const { org, role, loading: authLoading } = useAuth();
  const { games, loading } = useActiveGames(org?.id ?? null);
  const isCoach = role === "head_coach" || role === "assistant_coach";
  const [joinedGame, setJoinedGame] = useState<GameRow | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  if (joinedGame) {
    // Keep latest version of joined game from realtime list if available.
    const fresh = games.find((g) => g.id === joinedGame.id) ?? joinedGame;
    return <ActiveGame game={fresh} isCoach={isCoach} />;
  }

  if (showSetup) return <GameSetup onCancel={() => setShowSetup(false)} />;
  if (!org) return null;
  return (
    <GameLobby
      orgId={org.id}
      activeGames={games}
      onStart={() => setShowSetup(true)}
      onJoin={(g) => setJoinedGame(g)}
    />
  );
}
