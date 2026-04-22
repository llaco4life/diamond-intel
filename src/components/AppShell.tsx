import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { Logo } from "./Logo";

export function ProtectedShell({
  children,
  coachOnly = false,
}: {
  children: ReactNode;
  coachOnly?: boolean;
}) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Logo size="md" showWordmark={false} />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" search={{ redirect: location.href }} />;
  }

  if (coachOnly && role !== "head_coach" && role !== "assistant_coach") {
    return <Navigate to="/" search={{ restricted: "1" } as never} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
