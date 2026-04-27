import type { PitchEntryRow } from "./types";

export type FatigueLevel = "ok" | "yellow" | "red" | "critical";

export interface FatigueState {
  level: FatigueLevel;
  pitchCount: number;
  message: string;
}

export function computeFatigue(pitchCount: number): FatigueState {
  if (pitchCount >= 85) return { level: "critical", pitchCount, message: `${pitchCount} pitches — strong warning, consider relief` };
  if (pitchCount >= 70) return { level: "red", pitchCount, message: `${pitchCount} pitches — getting deep` };
  if (pitchCount >= 50) return { level: "yellow", pitchCount, message: `${pitchCount} pitches — monitor` };
  return { level: "ok", pitchCount, message: `${pitchCount} pitches` };
}

export interface HardContactStreak {
  hardCount: number;
  battersFaced: number;
  warn: boolean;
  message: string;
}

export function computeHardContactStreak(
  entries: PitchEntryRow[],
  pitcherId: string,
  windowBatters = 6,
): HardContactStreak {
  const pitchersOnly = entries
    .filter((e) => e.pitcher_id === pitcherId)
    .slice()
    .sort((a, b) => (a.created_at > b.created_at ? 1 : -1));

  const seen: { key: string; hard: boolean }[] = [];
  for (let i = pitchersOnly.length - 1; i >= 0; i--) {
    const e = pitchersOnly[i];
    const key = `${e.batter_key}#${e.at_bat_seq}`;
    let entry = seen.find((s) => s.key === key);
    if (!entry) {
      if (seen.length >= windowBatters) break;
      entry = { key, hard: false };
      seen.push(entry);
    }
    if (e.contact_quality === "hard" || e.contact_quality === "barrel") {
      entry.hard = true;
    }
  }
  const hardCount = seen.filter((s) => s.hard).length;
  const warn = hardCount >= 3;
  return {
    hardCount,
    battersFaced: seen.length,
    warn,
    message: warn
      ? `${hardCount} hard contact in last ${seen.length} hitters`
      : `${hardCount} hard / ${seen.length} hitters`,
  };
}
