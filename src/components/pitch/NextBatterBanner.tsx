import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import type { LineupSlot } from "@/hooks/usePitchLineup";
import { makeBatterKey, type PitchEntryRow } from "@/lib/pitchIntel/types";

interface Props {
  gameId: string;
  team: string;
  lineup: LineupSlot[];
  index: number;
  lastIndex?: number | null;
  entries?: PitchEntryRow[];
}

function label(slot?: LineupSlot) {
  if (!slot) return "—";
  return `#${slot.jersey}${slot.name ? ` ${slot.name}` : ""}`;
}

function lastContact(slot: LineupSlot | undefined, team: string, entries: PitchEntryRow[]): string | null {
  if (!slot) return null;
  const keys = new Set<string>([
    makeBatterKey(team, `slot:${slot.slotId}`),
    makeBatterKey(team, slot.jersey),
    ...slot.legacyJerseys.map((j) => makeBatterKey(team, j)),
  ]);
  const mine = entries.filter((e) => keys.has(e.batter_key));
  // group by ab
  const byAb = new Map<number, PitchEntryRow[]>();
  for (const e of mine) {
    const arr = byAb.get(e.at_bat_seq) ?? [];
    arr.push(e);
    byAb.set(e.at_bat_seq, arr);
  }
  const seqs = Array.from(byAb.keys()).sort((a, b) => b - a);
  for (const s of seqs) {
    const arr = byAb.get(s)!;
    const term = arr.find((p) => p.ab_result);
    if (term) return term.contact_quality ?? null;
  }
  return null;
}

export function NextBatterBanner({ gameId, team, lineup, index, lastIndex, entries = [] }: Props) {
  if (lineup.length === 0) return null;
  const cur = lineup[index % lineup.length];
  const next = lineup[(index + 1) % lineup.length];
  const onDeck = lineup[(index + 2) % lineup.length];
  const last = lastIndex != null ? lineup[((lastIndex % lineup.length) + lineup.length) % lineup.length] : null;

  const slotKey = cur ? makeBatterKey(team, `slot:${cur.slotId}`) : "";
  const curContact = lastContact(cur, team, entries);
  const curHard = curContact === "hard" || curContact === "barrel";

  return (
    <div className="mb-3 rounded-2xl border border-primary/40 bg-primary/5 p-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Row label="Last batter" value={label(last ?? undefined)} muted />
        <Link
          to="/pitch/$gameId/batter/$batterKey"
          params={{ gameId, batterKey: slotKey }}
          className="rounded-lg bg-primary/10 px-2 py-1 ring-1 ring-primary/30 active:opacity-70"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Current batter</div>
            {curHard && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700 dark:text-red-300">
                <AlertTriangle className="h-2.5 w-2.5" /> hard
              </span>
            )}
          </div>
          <div className="text-sm font-black text-foreground">{label(cur)}</div>
          <div className="text-[10px] text-muted-foreground">Tap to track pitches →</div>
        </Link>
        <Row label="Next batter" value={label(next)} />
        <Row label="On deck" value={label(onDeck)} muted />
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-1 ${muted ? "bg-secondary/50" : "bg-secondary"}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
