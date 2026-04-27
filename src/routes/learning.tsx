import { useState } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import type { GameRow } from "@/hooks/useActiveGame";
import { LearningLobby } from "@/components/learning/LearningLobby";
import { LearningSetup } from "@/components/learning/LearningSetup";
import { ActiveLearningSession } from "@/components/learning/ActiveLearningSession";

export const Route = createFileRoute("/learning")({
  component: LearningLayout,
});

function LearningLayout() {
  const matches = useMatches();
  const isChildRoute = matches.some(
    (m) =>
      m.routeId !== "__root__" && m.routeId !== "/learning" && m.routeId.startsWith("/learning"),
  );
  return <ProtectedShell>{isChildRoute ? <Outlet /> : <LearningPage />}</ProtectedShell>;
}

function LearningPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeSession, setActiveSession] = useState<GameRow | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  if (!user) return null;

  if (activeSession) {
    return <ActiveLearningSession game={activeSession} />;
  }

  if (showSetup) {
    return (
      <LearningSetup
        onCancel={() => setShowSetup(false)}
        onCreated={(g) => {
          setShowSetup(false);
          setActiveSession(g);
        }}
      />
    );
  }

  return (
    <LearningLobby
      userId={user.id}
      onStart={() => setShowSetup(true)}
      onResume={(g) => setActiveSession(g)}
    />
  );
}
