import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubRecord {
  jersey: string;
  name?: string;
  replacedAt: string; // ISO
  inning: number;
  note?: string;
}

export interface LineupSlot {
  slotId: string;
  order: number;
  jersey: string;
  name?: string;
  note?: string;
  /** Legacy jersey keys this slot used to be — for matching old pitch_entries. */
  legacyJerseys: string[];
  subs: SubRecord[];
}

function key(gameId: string, team: string) {
  return `pitch-lineup:${gameId}:${team}`;
}

function finalKey(gameId: string, team: string) {
  return `pitch-lineup-finalized:${gameId}:${team}`;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `slot_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function migrate(raw: string): LineupSlot[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      // legacy: string[] of jerseys
      return (parsed as string[]).map((j, i) => ({
        slotId: uuid(),
        order: i + 1,
        jersey: j,
        legacyJerseys: [j],
        subs: [],
      }));
    }
    if (Array.isArray(parsed)) {
      return (parsed as LineupSlot[]).map((s, i) => ({
        slotId: s.slotId ?? uuid(),
        order: s.order ?? i + 1,
        jersey: s.jersey,
        name: s.name,
        note: s.note,
        legacyJerseys: s.legacyJerseys ?? [s.jersey],
        subs: s.subs ?? [],
      }));
    }
  } catch {
    // ignore
  }
  return [];
}

function normalize(slots: LineupSlot[]): LineupSlot[] {
  return slots
    .filter((s) => typeof s.jersey === "string" && s.jersey.trim())
    .map((s, i) => ({
      ...s,
      slotId: s.slotId ?? uuid(),
      order: i + 1,
      jersey: s.jersey.trim(),
      name: s.name?.trim() || undefined,
      note: s.note?.trim() || undefined,
      legacyJerseys: s.legacyJerseys?.length ? s.legacyJerseys : [s.jersey],
      subs: s.subs ?? [],
    }));
}

async function saveRemote(gameId: string, team: string, lineup: LineupSlot[], finalized: boolean) {
  await (supabase as any).from("pitch_lineups").upsert(
    {
      game_id: gameId,
      team,
      lineup,
      finalized,
    },
    { onConflict: "game_id,team" },
  );
}

export function usePitchLineup(gameId: string | undefined, team: string | undefined) {
  const [lineup, setLineup] = useState<LineupSlot[]>([]);
  const [finalized, setFinalizedState] = useState(false);

  useEffect(() => {
    if (!gameId || !team) return;
    let cancelled = false;
    const raw = localStorage.getItem(key(gameId, team));
    const localLineup = raw ? normalize(migrate(raw)) : [];
    const localFinalized = localStorage.getItem(finalKey(gameId, team)) === "1";
    setLineup(localLineup);
    setFinalizedState(localFinalized);

    void (async () => {
      const { data } = await (supabase as any)
        .from("pitch_lineups")
        .select("lineup,finalized")
        .eq("game_id", gameId)
        .eq("team", team)
        .maybeSingle();
      if (cancelled) return;

      if (data?.lineup && Array.isArray(data.lineup)) {
        const remoteLineup = normalize(data.lineup as LineupSlot[]);
        if (remoteLineup.length === 0 && localLineup.length > 0) {
          await saveRemote(gameId, team, localLineup, localFinalized);
          return;
        }
        setLineup(remoteLineup);
        setFinalizedState(Boolean(data.finalized));
        try {
          localStorage.setItem(key(gameId, team), JSON.stringify(remoteLineup));
          localStorage.setItem(finalKey(gameId, team), data.finalized ? "1" : "0");
        } catch {
          // ignore
        }
      } else if (localLineup.length > 0 || localFinalized) {
        await saveRemote(gameId, team, localLineup, localFinalized);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId, team]);

  const persist = useCallback(
    (next: LineupSlot[]) => {
      if (!gameId || !team) return;
      const renumbered = normalize(next);
      setLineup(renumbered);
      try {
        localStorage.setItem(key(gameId, team), JSON.stringify(renumbered));
      } catch {
        // ignore
      }
      void saveRemote(gameId, team, renumbered, finalized);
    },
    [finalized, gameId, team],
  );

  const setFinalized = useCallback(
    (v: boolean) => {
      if (!gameId || !team) return;
      setFinalizedState(v);
      try {
        localStorage.setItem(finalKey(gameId, team), v ? "1" : "0");
      } catch {
        // ignore
      }
      void saveRemote(gameId, team, lineup, v);
    },
    [gameId, lineup, team],
  );

  const add = useCallback(
    (jersey: string, name?: string, note?: string) => {
      const j = jersey.trim();
      if (!j) return;
      const slot: LineupSlot = {
        slotId: uuid(),
        order: lineup.length + 1,
        jersey: j,
        name: name?.trim() || undefined,
        note: note?.trim() || undefined,
        legacyJerseys: [j],
        subs: [],
      };
      persist([...lineup, slot]);
    },
    [lineup, persist],
  );

  const update = useCallback(
    (slotId: string, patch: { jersey?: string; name?: string; note?: string }) => {
      persist(
        lineup.map((s) =>
          s.slotId === slotId
            ? {
                ...s,
                jersey: patch.jersey?.trim() || s.jersey,
                name: patch.name !== undefined ? patch.name.trim() || undefined : s.name,
                note: patch.note !== undefined ? patch.note.trim() || undefined : s.note,
              }
            : s,
        ),
      );
    },
    [lineup, persist],
  );

  const remove = useCallback(
    (slotId: string) => {
      persist(lineup.filter((s) => s.slotId !== slotId));
    },
    [lineup, persist],
  );

  const reorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      const next = lineup.slice();
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      persist(next);
    },
    [lineup, persist],
  );

  const substitute = useCallback(
    (slotId: string, opts: { jersey: string; name?: string; inning: number; note?: string }) => {
      persist(
        lineup.map((s) => {
          if (s.slotId !== slotId) return s;
          const newJersey = opts.jersey.trim();
          if (!newJersey) return s;
          const sub: SubRecord = {
            jersey: s.jersey,
            name: s.name,
            replacedAt: new Date().toISOString(),
            inning: opts.inning,
            note: opts.note?.trim() || undefined,
          };
          const legacy = s.legacyJerseys.includes(s.jersey)
            ? s.legacyJerseys
            : [...s.legacyJerseys, s.jersey];
          return {
            ...s,
            jersey: newJersey,
            name: opts.name?.trim() || undefined,
            subs: [...s.subs, sub],
            legacyJerseys: legacy,
          };
        }),
      );
    },
    [lineup, persist],
  );

  return { lineup, add, update, remove, substitute, reorder, finalized, setFinalized };
}

