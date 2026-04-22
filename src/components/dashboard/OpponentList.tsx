import { useEffect, useState } from "react";
import { ChevronRight, Users, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface OpponentBucket {
  opponentId: string;
  displayName: string;
  sessionCount: number;
  lastDate: string | null;
  lastTournament: string | null;
}

interface OrphanGame {
  id: string;
  game_date: string;
  tournament_name: string | null;
  home_team: string;
  away_team: string;
}

export function OpponentList({
  onPickOpponent,
}: {
  onPickOpponent: (opponentId: string | null, opponentName: string) => void;
}) {
  const { org } = useAuth();
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<OpponentBucket[]>([]);
  const [orphans, setOrphans] = useState<OrphanGame[]>([]);
  const [showOrphans, setShowOrphans] = useState(false);

  useEffect(() => {
    if (!org?.id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ data: opps }, { data: games }] = await Promise.all([
        supabase.from("opponents").select("id, team_name").eq("org_id", org.id),
        supabase
          .from("games")
          .select("id, opponent_id, game_date, tournament_name, home_team, away_team, created_at")
          .eq("org_id", org.id)
          .eq("game_type", "scout")
          .order("game_date", { ascending: false }),
      ]);

      if (cancel) return;

      const oppMap = new Map<string, string>(
        (opps ?? []).map((o) => [o.id, o.team_name]),
      );

      const groups = new Map<string, OpponentBucket>();
      const orphanList: OrphanGame[] = [];

      for (const g of games ?? []) {
        if (!g.opponent_id) {
          orphanList.push({
            id: g.id,
            game_date: g.game_date,
            tournament_name: g.tournament_name,
            home_team: g.home_team,
            away_team: g.away_team,
          });
          continue;
        }
        const existing = groups.get(g.opponent_id);
        if (existing) {
          existing.sessionCount += 1;
          if (!existing.lastDate || g.game_date > existing.lastDate) {
            existing.lastDate = g.game_date;
            existing.lastTournament = g.tournament_name;
          }
        } else {
          groups.set(g.opponent_id, {
            opponentId: g.opponent_id,
            displayName: oppMap.get(g.opponent_id) ?? "Unknown opponent",
            sessionCount: 1,
            lastDate: g.game_date,
            lastTournament: g.tournament_name,
          });
        }
      }

      const sorted = Array.from(groups.values()).sort((a, b) =>
        (b.lastDate ?? "").localeCompare(a.lastDate ?? ""),
      );

      setBuckets(sorted);
      setOrphans(orphanList);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [org?.id]);

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl bg-muted/50" />;
  }

  if (buckets.length === 0 && orphans.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Users className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold">No scout reports yet</h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Start a Scout game from the Scout tab. Reports will appear here, grouped by opponent.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {buckets.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-4 text-center text-sm text-muted-foreground">
          No opponents linked to scout games yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {buckets.map((b) => (
            <li key={b.opponentId}>
              <button
                type="button"
                onClick={() => onPickOpponent(b.opponentId, b.displayName)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-left shadow-card active:scale-[0.99] transition-transform"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.displayName}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {b.sessionCount} session{b.sessionCount === 1 ? "" : "s"}
                    {b.lastDate && ` · last ${new Date(b.lastDate).toLocaleDateString()}`}
                    {b.lastTournament && ` · ${b.lastTournament}`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {orphans.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowOrphans((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {orphans.length} session{orphans.length === 1 ? "" : "s"} missing opponent link
          </button>
          {showOrphans && (
            <ul className="mt-2 space-y-1.5">
              {orphans.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => onPickOpponent(null, "Unknown opponent")}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-left text-xs"
                  >
                    <span className="truncate text-muted-foreground">
                      {new Date(o.game_date).toLocaleDateString()} · {o.home_team} vs {o.away_team}
                      {o.tournament_name && ` · ${o.tournament_name}`}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
