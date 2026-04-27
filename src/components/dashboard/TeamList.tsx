import { ChevronRight, Users } from "lucide-react";
import type { TeamEntry } from "@/lib/teamIndex";

export function TeamList({
  teams,
  onPick,
}: {
  teams: TeamEntry[];
  onPick: (team: TeamEntry) => void;
}) {
  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Users className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold">No teams found</h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Once you scout a game, every team that appears (home or away) will
          show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {teams.map((t) => (
        <li key={t.key}>
          <button
            type="button"
            onClick={() => onPick(t)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-left shadow-card transition-transform active:scale-[0.99]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{t.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {t.sessionCount} session{t.sessionCount === 1 ? "" : "s"}
                {t.lastDate &&
                  ` · last ${new Date(t.lastDate).toLocaleDateString()}`}
                {t.lastTournament && ` · ${t.lastTournament}`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}
