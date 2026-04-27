import { useCallback, useEffect, useState } from "react";

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

export function usePitchLineup(gameId: string | undefined, team: string | undefined) {
  const [lineup, setLineup] = useState<LineupSlot[]>([]);

  useEffect(() => {
    if (!gameId || !team) return;
    const raw = localStorage.getItem(key(gameId, team));
    setLineup(raw ? migrate(raw) : []);
  }, [gameId, team]);

  const persist = useCallback(
    (next: LineupSlot[]) => {
      if (!gameId || !team) return;
      setLineup(next);
      try {
        localStorage.setItem(key(gameId, team), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [gameId, team],
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
      const filtered = lineup.filter((s) => s.slotId !== slotId);
      persist(filtered.map((s, i) => ({ ...s, order: i + 1 })));
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

  return { lineup, add, update, remove, substitute };
}
