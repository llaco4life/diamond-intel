import { Link } from "@tanstack/react-router";
import type { LineupSlot } from "@/hooks/usePitchLineup";
import { makeBatterKey } from "@/lib/pitchIntel/types";

interface Props {
  gameId: string;
  team: string;
  lineup: LineupSlot[];
  index: number;
  lastIndex?: number | null;
}

function label(slot?: LineupSlot) {
  if (!slot) return "—";
  return `#${slot.jersey}${slot.name ? ` ${slot.name}` : ""}`;
}

export function NextBatterBanner({ gameId, team, lineup, index, lastIndex }: Props) {
  if (lineup.length === 0) return null;
  const cur = lineup[index % lineup.length];
  const next = lineup[(index + 1) % lineup.length];
  const onDeck = lineup[(index + 2) % lineup.length];
  const last = lastIndex != null ? lineup[((lastIndex % lineup.length) + lineup.length) % lineup.length] : null;

  const slotKey = cur ? makeBatterKey(team, `slot:${cur.slotId}`) : "";

  return (
    <div className="mb-3 rounded-2xl border border-primary/40 bg-primary/5 p-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Row label="Last batter" value={label(last ?? undefined)} muted />
        <Link
          to="/pitch/$gameId/batter/$batterKey"
          params={{ gameId, batterKey: slotKey }}
          className="rounded-lg bg-primary/10 px-2 py-1 ring-1 ring-primary/30 active:opacity-70"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Current batter</div>
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
