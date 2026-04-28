import { useCallback, useEffect, useState } from "react";

function curKey(gameId: string, team: string) {
  return `pitch-current-batter:${gameId}:${team}`;
}
function lastKey(gameId: string, team: string) {
  return `pitch-last-batter:${gameId}:${team}`;
}

export function useCurrentBatter(
  gameId: string | undefined,
  team: string | undefined,
  lineupLength: number,
) {
  const [index, setIndexState] = useState(0);
  const [lastIndex, setLastIndexState] = useState<number | null>(null);

  useEffect(() => {
    if (!gameId || !team) return;
    const cur = localStorage.getItem(curKey(gameId, team));
    const last = localStorage.getItem(lastKey(gameId, team));
    const n = cur ? Number(cur) : 0;
    setIndexState(Number.isFinite(n) ? n : 0);
    if (last !== null && last !== "") {
      const ln = Number(last);
      setLastIndexState(Number.isFinite(ln) ? ln : null);
    } else {
      setLastIndexState(null);
    }
  }, [gameId, team]);

  const wrap = useCallback(
    (i: number) => (lineupLength > 0 ? ((i % lineupLength) + lineupLength) % lineupLength : 0),
    [lineupLength],
  );

  const setIndex = useCallback(
    (i: number) => {
      if (!gameId || !team) return;
      const safe = wrap(i);
      setIndexState(safe);
      try {
        localStorage.setItem(curKey(gameId, team), String(safe));
      } catch {
        // ignore
      }
    },
    [gameId, team, wrap],
  );

  const setLastIndex = useCallback(
    (i: number | null) => {
      if (!gameId || !team) return;
      setLastIndexState(i);
      try {
        if (i === null) localStorage.removeItem(lastKey(gameId, team));
        else localStorage.setItem(lastKey(gameId, team), String(i));
      } catch {
        // ignore
      }
    },
    [gameId, team],
  );

  const advance = useCallback(() => {
    setLastIndex(index);
    setIndex(index + 1);
  }, [index, setIndex, setLastIndex]);

  return { index, setIndex, advance, lastIndex, setLastIndex };
}
