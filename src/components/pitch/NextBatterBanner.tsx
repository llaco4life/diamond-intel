import { Link } from "@tanstack/react-router";
import type { LineupSlot } from "@/hooks/usePitchLineup";
import { makeBatterKey } from "@/lib/pitchIntel/types";

interface Props {
  gameId: string;
  team: string;
  lineup: LineupSlot[];
  index: number;
}

function label(slot?: LineupSlot) {
  if (!slot) return "—";
  return `#${slot.jersey}${slot.name ? ` ${slot.name}` : ""}`;
}

export function NextBatterBanner({ gameId, team, lineup, index }: Props) {
  if (lineup.length === 0) return null;
  const cur = lineup[index % lineup.length];
  const next = lineup[(index + 1) % lineup.length];
  const onDeck = lineup[(index + 2) % lineup.length];

  const slotKey = cur ? makeBatterKey(team, `slot:${cur.slotId}`) : "";

  return (
    <div className="mb-3 rounded-2xl border border-primary/40 bg-primary/5 p-3">
      <Link
        to="/pitch/$gameId/batter/$batterKey"
        params={{ gameId, batterKey: encodeURIComponent(slotKey) }}
        className="flex items-center justify-between active:opacity-70"
      >
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary">At bat</div>
          <div className="text-lg font-black">{label(cur)}</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>
            <span className="font-semibold uppercase">Next:</span> {label(next)}
          </div>
          <div>
            <span className="font-semibold uppercase">On deck:</span> {label(onDeck)}
          </div>
        </div>
      </Link>
    </div>
  );
}
