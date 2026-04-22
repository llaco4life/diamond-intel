interface ObsRow {
  id: string;
  inning: number;
  is_team_level: boolean;
  jersey_number: string | null;
  tags: string[] | null;
  key_play: string | null;
  steal_it: string | null;
  created_at: string;
}

export function ObservationList({ rows }: { rows: ObsRow[] }) {
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
            {byInning.get(inning)!.map((r) => (
              <li key={r.id} className="text-sm">
                {r.jersey_number && (
                  <span className="mr-1.5 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
                    #{r.jersey_number}
                  </span>
                )}
                {r.steal_it && <span className="font-semibold text-pink-foreground">🔥 {r.steal_it}</span>}
                {r.key_play && <span className="italic">"{r.key_play}"</span>}
                {r.tags && r.tags.length > 0 && (
                  <span>{r.tags.join(", ")}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
