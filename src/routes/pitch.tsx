import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ProtectedShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Target, Settings, Plus } from "lucide-react";

interface PitchGame {
  id: string;
  home_team: string;
  away_team: string;
  game_date: string;
  status: string;
  created_at: string;
}

export const Route = createFileRoute("/pitch")({
  component: PitchLobby,
});

function PitchLobby() {
  return (
    <ProtectedShell>
      <PitchLobbyContent />
    </ProtectedShell>
  );
}

function PitchLobbyContent() {
  const { org, user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<PitchGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!org) return;
    void (async () => {
      const { data } = await supabase
        .from("games")
        .select("id,home_team,away_team,game_date,status,created_at")
        .eq("org_id", org.id)
        .eq("game_type", "pitch")
        .order("created_at", { ascending: false })
        .limit(20);
      setGames((data ?? []) as PitchGame[]);
      setLoading(false);
    })();
  }, [org]);

  useEffect(() => {
    if (org && !home) setHome(org.name);
  }, [org, home]);

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
      navigate({ to: "/pitch/$gameId", params: { gameId: g.id } });
    } catch (e) {
      toast.error((e as Error).message ?? "Could not start game");
    } finally {
      setSubmitting(false);
    }
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

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Recent games
      </h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No Pitch Intel games yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => (
            <li key={g.id}>
              <Link
                to="/pitch/$gameId"
                params={{ gameId: g.id }}
                className="block rounded-xl border border-border bg-card p-3 transition hover:border-primary/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {g.home_team} vs {g.away_team}
                    </div>
                    <div className="text-xs text-muted-foreground">{g.game_date}</div>
                  </div>
                  <Badge variant={g.status === "active" ? "default" : "secondary"}>{g.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
