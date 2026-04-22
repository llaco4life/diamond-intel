import { useState, useEffect } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
  const [hydrating, setHydrating] = useState(true);

  // On mount, auto-resume the user's most recent active learning session.
  useEffect(() => {
    if (!user) {
      setHydrating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("created_by", user.id)
        .eq("game_type", "learning")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) setActiveSession(data as GameRow);
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || hydrating) {
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
