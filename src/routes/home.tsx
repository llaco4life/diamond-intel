import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Eye, GraduationCap, Sprout, LayoutDashboard, ArrowRight, Target } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/home")({
  validateSearch: (s: Record<string, unknown>) => ({
    restricted: typeof s.restricted === "string" ? s.restricted : undefined,
  }),
  component: HomePage,
});

function HomePage() {
  const { restricted } = Route.useSearch();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (restricted) toast.error("Access restricted — coaches only");
  }, [restricted]);

  // If signed in but not yet onboarded, send to /onboarding.
  useEffect(() => {
    if (loading) return;
    if (user && !profile?.org_id) {
      navigate({ to: "/onboarding" });
    }
  }, [user, profile, loading, navigate]);

  return (
    <ProtectedShell>
      <HomeContent />
    </ProtectedShell>
  );
}

function HomeContent() {
  const { profile, org, role } = useAuth();
  const isCoach = role === "head_coach" || role === "assistant_coach";
  const firstName = profile?.full_name?.split(" ")[0] ?? "Player";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo size="md" />
        {org && (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {org.name}
          </span>
        )}
      </header>

      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Hey {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a mode to get started, or jump into your {isCoach ? "dashboard" : "development log"}.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModeCard
          to="/scout"
          title="Scout Mode"
          description="Track opponents inning by inning. Build a real game plan."
          icon={<Eye className="h-6 w-6" />}
          tone="primary"
        />
        <ModeCard
          to="/learning"
          title="Learning Mode"
          description="Study the game, log at-bats, grow your eye."
          icon={<GraduationCap className="h-6 w-6" />}
          tone="pink"
        />
        <ModeCard
          to="/pitch"
          title="Pitch Intel"
          description="Live pitch calling: codes, count, fatigue, and recommendations."
          icon={<Target className="h-6 w-6" />}
          tone="primary"
        />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Active games today
        </h2>
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No active games yet. Start one from Scout or Learning mode.
          </p>
        </div>
      </section>

      <section>
        {isCoach ? (
          <ShortcutCard
            to="/dashboard"
            title="Coach Dashboard"
            description="Scouting reports, player insights, at-bat trends."
            icon={<LayoutDashboard className="h-5 w-5" />}
          />
        ) : (
          <ShortcutCard
            to="/development"
            title="My Development Log"
            description="Track what you're working on and what you've got."
            icon={<Sprout className="h-5 w-5" />}
          />
        )}
      </section>
    </div>
  );
}

function ModeCard({
  to,
  title,
  description,
  icon,
  tone,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: "primary" | "pink";
}) {
  const styles =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : "bg-pink text-pink-foreground";
  return (
    <Link
      to={to}
      className={`group flex flex-col gap-3 rounded-2xl p-5 shadow-card transition-all hover:shadow-elevated active:scale-[0.99] ${styles}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/20">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm opacity-90">{description}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold">
        Open
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function ShortcutCard({
  to,
  title,
  description,
  icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/40 hover:shadow-elevated"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}
