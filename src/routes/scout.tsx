import { useState } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useActiveGame } from "@/hooks/useActiveGame";
import { GameSetup } from "@/components/scout/GameSetup";
import { ActiveGame } from "@/components/scout/ActiveGame";
import { ActiveGameCard } from "@/components/scout/ActiveGameCard";
import { GameLobby } from "@/components/scout/GameLobby";

export const Route = createFileRoute("/scout")({
  component: ScoutLayout,
});

function ScoutLayout() {
  const matches = useMatches();
  // If a child route (e.g. /scout/summary/$gameId) is matched, render it instead of the lobby.
  const isChildRoute = matches.some((m) => m.routeId !== "__root__" && m.routeId !== "/scout" && m.routeId.startsWith("/scout"));

  return (
    <ProtectedShell>
      {isChildRoute ? <Outlet /> : <ScoutPage />}
    </ProtectedShell>
  );
}

function ScoutPage() {
  const { org, role, loading: authLoading } = useAuth();
  const { game, loading } = useActiveGame(org?.id ?? null);
  const isCoach = role === "head_coach" || role === "assistant_coach";
  const [joined, setJoined] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  if (game) {
    if (joined) return <ActiveGame game={game} isCoach={isCoach} />;
    return <ActiveGameCard game={game} onJoin={() => setJoined(true)} />;
  }

  if (showSetup) return <GameSetup />;
  if (!org) return null;
  return <GameLobby orgId={org.id} onStart={() => setShowSetup(true)} />;
}
