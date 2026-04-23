import { Pencil, Trash2 } from "lucide-react";

interface ObsRow {
  id: string;
  inning: number;
  is_team_level: boolean;
  jersey_number: string | null;
  tags: string[] | null;
  key_play: string | null;
  steal_it: string | null;
  applies_to_team?: string | null;
  offensive_team?: string | null;
  created_at: string;
}

export function ObservationList({
  rows,
  offenseTeam,
  onDelete,
  onEdit,
}: {
  rows: ObsRow[];
  offenseTeam?: string;
  onDelete?: (id: string) => void;
  onEdit?: (row: ObsRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No observations yet.
      </div>
    );
  }

  const byInning = new Map<number, ObsRow[]>();
  for (const r of rows) {
    const list = byInning.get(r.inning) ?? [];
    list.push(r);
    byInning.set(r.inning, list);
  }
  const innings = Array.from(byInning.keys()).sort((a, b) => b - a);

  return (
    <div className="space-y-3">
      {innings.map((inning) => (
        <div key={inning} className="rounded-xl border bg-card p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inning {inning}
          </p>
          <ul className="space-y-1.5">
            {byInning.get(inning)!.map((r) => {
              const team = r.applies_to_team ?? null;
              // "self" is the Learning Mode self-evaluation sentinel — hide the team badge.
              const isSelf = team === "self";
              const isOffense =
                team && offenseTeam ? team === offenseTeam : null;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-1.5 text-sm">
                  {isSelf ? null : team ? (
                    <span
                      className={
                        isOffense === false
                          ? "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          : "rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
                      }
                    >
                      {team}
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      —
                    </span>
                  )}
                  {r.jersey_number && (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
                      #{r.jersey_number}
                    </span>
                  )}
                  {r.steal_it && <span className="font-semibold text-pink-foreground">🔥 {r.steal_it}</span>}
                  {r.key_play && <span className="italic">"{r.key_play}"</span>}
                  {r.tags && r.tags.length > 0 && <span>{r.tags.join(", ")}</span>}
                  {(onEdit || onDelete) && (
                    <span className="ml-auto flex items-center gap-1">
                      {onEdit && r.key_play && (
                        <button
                          type="button"
                          aria-label="Edit note"
                          onClick={() => onEdit(r)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          aria-label="Delete observation"
                          onClick={() => {
                            if (confirm("Delete this observation?")) onDelete(r.id);
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
