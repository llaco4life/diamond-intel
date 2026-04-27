import { ChevronRight, CalendarDays } from "lucide-react";
import type { GameEntry } from "@/lib/teamIndex";

export function GameList({
  games,
  onPick,
}: {
  games: GameEntry[];
  onPick: (game: GameEntry) => void;
}) {
  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold">No scouted games yet</h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Start a Scout game from the Scout tab. Each game will appear here as
          a matchup card.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {games.map((g) => (
        <li key={g.id}>
          <button
            type="button"
            onClick={() => onPick(g)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-left shadow-card transition-transform active:scale-[0.99]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {g.home_team}{" "}
                <span className="text-muted-foreground">vs</span> {g.away_team}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {new Date(g.game_date).toLocaleDateString()}
                {g.tournament_name && ` · ${g.tournament_name}`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}
