import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ScoutingReportView } from "./ScoutingReportView";
import { TeamList } from "./TeamList";
import { GameList } from "./GameList";
import { TeamReportView } from "./TeamReportView";
import {
  buildGameIndex,
  buildTeamIndex,
  filterGames,
  filterTeams,
  type ScoutGameRow,
  type TeamEntry,
} from "@/lib/teamIndex";
import { cn } from "@/lib/utils";

type Mode = "team" | "game";

type View =
  | { kind: "list" }
  | { kind: "team"; team: TeamEntry }
  | { kind: "game"; gameId: string; from: "team" | "game"; team?: TeamEntry };

export function ScoutReportsTab() {
  const { org } = useAuth();
  const [mode, setMode] = useState<Mode>("team");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>({ kind: "list" });
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<ScoutGameRow[]>([]);
  const [opponents, setOpponents] = useState<
    Array<{ id: string; team_name: string }>
  >([]);

  useEffect(() => {
    if (!org?.id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ data: g }, { data: opps }] = await Promise.all([
        supabase
          .from("games")
          .select(
            "id, game_date, tournament_name, home_team, away_team, home_score, away_score, opponent_id",
          )
          .eq("org_id", org.id)
          .eq("game_type", "scout")
          .order("game_date", { ascending: false }),
        supabase.from("opponents").select("id, team_name").eq("org_id", org.id),
      ]);
      if (cancel) return;
      setGames((g as ScoutGameRow[] | null) ?? []);
      setOpponents(opps ?? []);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [org?.id]);

  const teams = useMemo(() => buildTeamIndex(games, opponents), [games, opponents]);
  const gameIndex = useMemo(() => buildGameIndex(games), [games]);
  const filteredTeams = useMemo(() => filterTeams(teams, query), [teams, query]);
  const filteredGames = useMemo(
    () => filterGames(gameIndex, query),
    [gameIndex, query],
  );

  if (view.kind === "team") {
    return (
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView({ kind: "list" })}
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          All teams
        </Button>
        <TeamReportView
          team={view.team}
          onOpenGame={(gameId) =>
            setView({ kind: "game", gameId, from: "team", team: view.team })
          }
        />
      </div>
    );
  }

  if (view.kind === "game") {
    return (
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (view.from === "team" && view.team) {
              setView({ kind: "team", team: view.team });
            } else {
              setView({ kind: "list" });
            }
          }}
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {view.from === "team" && view.team ? `Back to ${view.team.name}` : "All games"}
        </Button>
        <ScoutingReportView gameId={view.gameId} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="grid grid-cols-2 rounded-xl border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("team")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "team"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          By Team
        </button>
        <button
          type="button"
          onClick={() => setMode("game")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "game"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          By Game
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search team or game..."
          className="w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted/50" />
      ) : mode === "team" ? (
        <TeamList
          teams={filteredTeams}
          onPick={(team) => setView({ kind: "team", team })}
        />
      ) : (
        <GameList
          games={filteredGames}
          onPick={(g) => setView({ kind: "game", gameId: g.id, from: "game" })}
        />
      )}
    </div>
  );
}
