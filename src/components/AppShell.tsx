import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { Logo } from "./Logo";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Logo size="md" showWordmark={false} />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

export function ProtectedShell({
  children,
  coachOnly = false,
}: {
  children: ReactNode;
  coachOnly?: boolean;
}) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isCoach = role === "head_coach" || role === "assistant_coach";
  const needsLogin = !loading && !user;
  const needsCoach = !loading && !!user && coachOnly && !isCoach;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({
        to: "/login",
        search: { redirect: location.pathname },
        replace: true,
      });
    } else if (coachOnly && !isCoach) {
      navigate({
        to: "/",
        search: { restricted: "1" },
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, role, coachOnly]);

  if (loading || needsLogin || needsCoach) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
