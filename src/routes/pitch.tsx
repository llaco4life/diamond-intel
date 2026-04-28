import { createFileRoute, Link, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ProtectedShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTeam } from "@/hooks/useActiveTeam";
import { toast } from "sonner";
import { Target, Settings, Plus, AlertCircle } from "lucide-react";
import { DeleteGameButton } from "@/components/DeleteGameButton";
import type { GameRow } from "@/hooks/useActiveGame";

export const Route = createFileRoute("/pitch")({
  component: PitchLayout,
});

function PitchLayout() {
  const matches = useMatches();
  const isChildRoute = matches.some(
    (m) => m.routeId !== "__root__" && m.routeId !== "/pitch" && m.routeId.startsWith("/pitch"),
  );
  return <ProtectedShell>{isChildRoute ? <Outlet /> : <PitchLobbyContent />}</ProtectedShell>;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function PitchLobbyContent() {
  const { org, user } = useAuth();
  const { activeTeam, activeTeamId } = useActiveTeam();
  const navigate = useNavigate();
  const [active, setActive] = useState<GameRow[]>([]);
  const [recent, setRecent] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    let cancelled = false;
    void (async () => {
      const baseActive = supabase
        .from("games")
        .select("*")
        .eq("org_id", org.id)
        .eq("game_type", "pitch")
        .eq("status", "active");
      const baseRecent = supabase
        .from("games")
        .select("*")
        .eq("org_id", org.id)
        .eq("game_type", "pitch")
        .eq("status", "ended");
      const aQ = activeTeamId ? baseActive.eq("team_id", activeTeamId) : baseActive;
      const rQ = activeTeamId ? baseRecent.eq("team_id", activeTeamId) : baseRecent;
      const [{ data: a }, { data: r }] = await Promise.all([
        aQ.order("created_at", { ascending: false }),
        rQ.order("created_at", { ascending: false }).limit(3),
      ]);
      if (cancelled) return;
      setActive((a as GameRow[] | null) ?? []);
      setRecent((r as GameRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [org, activeTeamId]);

  useEffect(() => {
    if (activeTeam && !home) setHome(activeTeam.name);
    else if (!activeTeam && org && !home) setHome(org.name);
  }, [org, activeTeam, home]);

  const start = async () => {
    if (!org || !user) return;
    if (!home.trim() || !away.trim()) {
      toast.error("Both team names are required");
      return;
    }
    setSubmitting(true);
    try {
      const opponentName = away.trim();
      let opponentId: string | null = null;
      const { data: existing } = await supabase
        .from("opponents")
        .select("id")
        .eq("org_id", org.id)
        .eq("team_name", opponentName)
        .maybeSingle();
      if (existing?.id) opponentId = existing.id;
      else {
        const { data: created, error } = await supabase
          .from("opponents")
          .insert({ org_id: org.id, team_name: opponentName })
          .select("id")
          .single();
        if (error) throw error;
        opponentId = created.id;
      }
      const { data: g, error: gErr } = await supabase
        .from("games")
        .insert({
          org_id: org.id,
          opponent_id: opponentId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          game_type: "pitch" as any,
          home_team: home.trim(),
          away_team: away.trim(),
          created_by: user.id,
        })
        .select("id")
        .single();
      if (gErr) throw gErr;
      toast.success("Game started");
      navigate({ to: "/pitch/$gameId", params: { gameId: g.id } });
    } catch (e) {
      toast.error((e as Error).message ?? "Could not start game");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (game: GameRow) => {
    setDeletingId(game.id);
    const { error } = await supabase.from("games").delete().eq("id", game.id);
    setDeletingId(null);
    if (error) {
      toast.error("Could not delete game.");
      return;
    }
    setActive((prev) => prev.filter((g) => g.id !== game.id));
    setRecent((prev) => prev.filter((g) => g.id !== game.id));
    toast.success("Game deleted.");
  };

  const handleResume = async (game: GameRow) => {
    setResumingId(game.id);
    const { error } = await supabase
      .from("games")
      .update({ status: "active" })
      .eq("id", game.id);
    setResumingId(null);
    if (error) {
      toast.error("Could not resume game.");
      return;
    }
    setRecent((prev) => prev.filter((g) => g.id !== game.id));
    setActive((prev) => [{ ...game, status: "active" }, ...prev]);
    toast.success("Game resumed.");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-6">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pitch Intel</h1>
            <p className="text-xs text-muted-foreground">Live pitch calling for the dugout</p>
          </div>
        </div>
        <Link to="/pitch/codes">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings className="h-4 w-4" /> Codes
          </Button>
        </Link>
      </header>

      {!creating ? (
        <Button onClick={() => setCreating(true)} className="mb-5 h-12 w-full gap-2 text-base">
          <Plus className="h-5 w-5" />
          Start a Pitch Intel game
        </Button>
      ) : (
        <div className="mb-5 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div>
            <Label htmlFor="home">Your team (home)</Label>
            <Input id="home" value={home} onChange={(e) => setHome(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="away">Opponent (away)</Label>
            <Input id="away" value={away} onChange={(e) => setAway(e.target.value)} placeholder="e.g. Lady Rebels" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreating(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={start} disabled={submitting} className="flex-1">
              {submitting ? "Starting…" : "Start game"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active games ({active.length})
              </h2>
              <ul className="space-y-3">
                {active.map((g) => (
                  <ActivePitchGameRow
                    key={g.id}
                    game={g}
                    onDelete={() => handleDelete(g)}
                    deleting={deletingId === g.id}
                  />
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent games
            </h2>
            {recent.length === 0 && active.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No Pitch Intel games yet.
              </div>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed games yet.</p>
            ) : (
              <ul className="space-y-2">
                {recent.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {g.home_team} <span className="text-muted-foreground">vs</span> {g.away_team}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(g.game_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Link
                        to="/pitch/$gameId"
                        params={{ gameId: g.id }}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleResume(g)}
                        disabled={resumingId === g.id}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        {resumingId === g.id ? "Resuming…" : "Resume"}
                      </button>
                      <DeleteGameButton
                        game={g}
                        busy={deletingId === g.id}
                        onConfirm={() => handleDelete(g)}
                        iconOnly
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ActivePitchGameRow({
  game,
  onDelete,
  deleting,
}: {
  game: GameRow;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [pitchCount, setPitchCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [profile, pitches] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", game.created_by).maybeSingle(),
        supabase
          .from("pitch_entries")
          .select("id", { count: "exact", head: true })
          .eq("game_id", game.id),
      ]);
      if (cancelled) return;
      setCreatorName(profile.data?.full_name ?? null);
      setPitchCount(pitches.count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [game.id, game.created_by]);

  return (
    <li className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">
            {game.home_team} <span className="text-muted-foreground">vs</span> {game.away_team}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Started {relativeTime(game.created_at)} by {creatorName ?? "a teammate"}
          </p>
        </div>
        <Badge>Active</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {pitchCount === null
            ? "Loading…"
            : `${pitchCount} pitch${pitchCount === 1 ? "" : "es"} logged`}
        </p>
        <div className="flex items-center gap-2">
          <DeleteGameButton
            game={game}
            busy={deleting}
            onConfirm={onDelete}
            iconOnly
          />
          <Link to="/pitch/$gameId" params={{ gameId: game.id }}>
            <Button size="sm">Join Game</Button>
          </Link>
        </div>
      </div>
    </li>
  );
}
