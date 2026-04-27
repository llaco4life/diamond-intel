// Theme classification, alert detection, position-label filtering, and
// actionability-weighted scoring for raw scout notes.
//
// Goal: turn a pile of free-text key_play notes into coach-ready signals.
// A note that changes a coaching decision (run on passed balls, watch
// delayed steal, attack weak arm) outranks a merely interesting note.

import type { RawObs } from "./dashboardIntel";

// ---------- Position / context labels (NOT scouting reads) ----------

const POSITION_LABEL_LIST = [
  "batter", "runner", "pitcher", "catcher",
  "p", "c", "1b", "2b", "3b", "ss",
  "lf", "cf", "rf", "if", "of", "dh",
  "first base", "second base", "third base", "shortstop",
  "left field", "center field", "right field",
  "first baseman", "second baseman", "third baseman",
  "1 baseman", "2 baseman", "3 baseman",
  "1 basemen", "2 basemen", "3 basemen",
  "na", "n/a", "none", "",
];

const POSITION_LABELS = new Set(POSITION_LABEL_LIST);

export function isPositionLabel(tag: string | null | undefined): boolean {
  if (!tag) return true;
  const t = tag.trim().toLowerCase();
  if (t.length === 0) return true;
  return POSITION_LABELS.has(t);
}

/** Filter a tag list down to scouting-relevant tags only. */
export function cleanTags(tags: string[] | null | undefined): string[] {
  if (!tags) return [];
  return tags.filter((t) => !isPositionLabel(t));
}

// ---------- Theme dictionary ----------

export type ThemeId =
  | "catcher_blocking"
  | "weak_arm_lf"
  | "weak_arm_cf"
  | "weak_arm_rf"
  | "weak_arm_c"
  | "slow_to_plate"
  | "trick_plays"
  | "gives_up"
  | "aggressive_running"
  | "tipping"
  | "command_issues"
  | "no_communication"
  | "bunt_threat"
  | "first_pitch_strike"
  | "passed_balls";

export interface Theme {
  id: ThemeId;
  label: string;            // Human-readable theme name
  action: string;           // Coaching action (Attack Plan)
  bucket: "Offense" | "Defense" | "Baserunning" | "Our Pitching Plan";
  appliesToOpponent: boolean; // True for opponent reads, false for our team
  patterns: RegExp[];
  /** Actionability weight added to the note score (higher = more game-changing). */
  actionability: number;
}

export const THEMES: Theme[] = [
  {
    id: "catcher_blocking",
    label: "Catcher blocking weakness",
    action: "Run on balls in the dirt",
    bucket: "Baserunning",
    appliesToOpponent: true,
    patterns: [/pass(ed)?\s*ball/i, /block(ing)?/i, /in the dirt/i, /missed catch/i, /can'?t block/i],
    actionability: 5,
  },
  {
    id: "passed_balls",
    label: "Frequent passed balls",
    action: "Aggressive secondary leads — score on PB/WP",
    bucket: "Baserunning",
    appliesToOpponent: true,
    patterns: [/wild pitch/i, /pb\b/i, /wp\b/i],
    actionability: 5,
  },
  {
    id: "weak_arm_lf",
    label: "Weak arm — LF",
    action: "First-to-third on any ball to LF",
    bucket: "Baserunning",
    appliesToOpponent: true,
    patterns: [/weak arm.*lf/i, /lf.*weak arm/i, /no arm.*left/i, /left.*weak arm/i],
    actionability: 5,
  },
  {
    id: "weak_arm_cf",
    label: "Weak arm — CF",
    action: "Tag from second on flies to CF",
    bucket: "Baserunning",
    appliesToOpponent: true,
    patterns: [/weak arm.*cf/i, /cf.*weak arm/i, /center.*weak arm/i],
    actionability: 5,
  },
  {
    id: "weak_arm_rf",
    label: "Weak arm — RF",
    action: "Score from second on singles to RF",
    bucket: "Baserunning",
    appliesToOpponent: true,
    patterns: [/weak arm.*rf/i, /rf.*weak arm/i, /right.*weak arm/i],
    actionability: 5,
  },
  {
    id: "weak_arm_c",
    label: "Catcher weak arm / slow exchange",
    action: "Run on the catcher",
    bucket: "Baserunning",
    appliesToOpponent: true,
    patterns: [/slow exchange/i, /catcher.*weak/i, /weak.*catcher/i, /can'?t throw.*2nd/i],
    actionability: 5,
  },
  {
    id: "slow_to_plate",
    label: "Pitcher slow to plate",
    action: "Green light — go on first move",
    bucket: "Baserunning",
    appliesToOpponent: true,
    patterns: [/slow to (the )?plate/i, /1\.[5-9]\d?/, /long leg kick/i, /big leg kick/i],
    actionability: 5,
  },
  {
    id: "trick_plays",
    label: "Trick play threat",
    action: "Hold runners — watch 1st/3rd & delayed steal",
    bucket: "Baserunning",
    appliesToOpponent: true,
    patterns: [/trick/i, /fake bunt/i, /delayed steal/i, /sneak/i, /1st.?and.?3rd/i, /first.?and.?third/i],
    actionability: 5,
  },
  {
    id: "gives_up",
    label: "Folds after mistakes",
    action: "Pressure them after errors — keep the line moving",
    bucket: "Offense",
    appliesToOpponent: true,
    patterns: [/gives? up/i, /deflated/i, /head down/i, /quits/i, /no fight/i, /shut down after/i],
    actionability: 4,
  },
  {
    id: "aggressive_running",
    label: "Aggressive baserunners",
    action: "Control the run game — pitchouts & slide step",
    bucket: "Defense",
    appliesToOpponent: true,
    patterns: [/aggressive runner/i, /first to third/i, /takes? the extra/i, /steal happy/i, /steal.?happy/i],
    actionability: 4,
  },
  {
    id: "tipping",
    label: "Pitcher tipping pitches",
    action: "Pick the tells — call pitches from dugout",
    bucket: "Offense",
    appliesToOpponent: true,
    patterns: [/tip(ping)?/i, /tells?\b/i, /pitch.*tell/i],
    actionability: 5,
  },
  {
    id: "command_issues",
    label: "Pitcher lost command",
    action: "Take until strike — make her throw it",
    bucket: "Offense",
    appliesToOpponent: true,
    patterns: [/lost command/i, /can'?t find/i, /walks?\b/i, /all over the place/i, /no command/i],
    actionability: 4,
  },
  {
    id: "no_communication",
    label: "Defense miscommunication",
    action: "Push the extra base — they don't communicate",
    bucket: "Baserunning",
    appliesToOpponent: true,
    patterns: [/no comm/i, /miscomm/i, /both went/i, /no one called/i, /poor comm/i],
    actionability: 4,
  },
  {
    id: "bunt_threat",
    label: "Bunt-heavy",
    action: "Corners crash, anticipate bunt with runners on",
    bucket: "Defense",
    appliesToOpponent: true,
    patterns: [/bunt heavy/i, /bunt-heavy/i, /loves to bunt/i, /squeeze/i],
    actionability: 4,
  },
  {
    id: "first_pitch_strike",
    label: "Auto-take first pitch",
    action: "Free strike one — fastball middle",
    bucket: "Our Pitching Plan",
    appliesToOpponent: true,
    patterns: [/auto.?take/i, /takes? first pitch/i, /never swings? first/i],
    actionability: 4,
  },
];

// ---------- Alerts ----------

export const ALERT_KEYWORDS: { label: string; pattern: RegExp }[] = [
  { label: "Trick play", pattern: /trick|fake bunt|sneak|1st.?and.?3rd|first.?and.?third/i },
  { label: "Delayed steal", pattern: /delayed steal/i },
  { label: "Passed balls", pattern: /pass(ed)?\s*ball|wild pitch|in the dirt|block/i },
  { label: "Weak arm", pattern: /weak arm|no arm|can'?t throw/i },
  { label: "Slow exchange", pattern: /slow exchange/i },
  { label: "No hustle", pattern: /no hustle|loaf|jog(ging)? it out/i },
  { label: "Gives up", pattern: /gives? up|deflated|head down|quits/i },
  { label: "Poor communication", pattern: /no comm|miscomm|both went|no one called/i },
];

export interface Alert {
  label: string;
  text: string;
  inning: number;
  jersey: string | null;
  observationId: string;
}

export function detectAlerts(obs: RawObs[]): Alert[] {
  const alerts: Alert[] = [];
  const seen = new Set<string>();
  for (const o of obs) {
    if (!o.key_play) continue;
    const text = o.key_play;
    for (const a of ALERT_KEYWORDS) {
      if (a.pattern.test(text)) {
        const dedupKey = `${a.label}::${text.toLowerCase().trim()}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);
        alerts.push({
          label: a.label,
          text,
          inning: o.inning,
          jersey: o.jersey_number,
          observationId: o.id,
        });
        break;
      }
    }
  }
  return alerts;
}

// ---------- Note classification & clustering ----------

export interface NoteCluster {
  themeId: ThemeId;
  theme: Theme;
  notes: RawObs[];
  observers: Set<string>;     // distinct player_ids who logged a matching note
  innings: number[];
}

export function classifyNote(text: string): ThemeId[] {
  const hits: ThemeId[] = [];
  for (const t of THEMES) {
    if (t.patterns.some((p) => p.test(text))) hits.push(t.id);
  }
  return hits;
}

export function clusterByTheme(obs: RawObs[]): NoteCluster[] {
  const map = new Map<ThemeId, NoteCluster>();
  for (const o of obs) {
    if (!o.key_play) continue;
    const themes = classifyNote(o.key_play);
    for (const id of themes) {
      let c = map.get(id);
      if (!c) {
        const theme = THEMES.find((t) => t.id === id)!;
        c = { themeId: id, theme, notes: [], observers: new Set(), innings: [] };
        map.set(id, c);
      }
      c.notes.push(o);
      c.observers.add(o.player_id);
      if (!c.innings.includes(o.inning)) c.innings.push(o.inning);
    }
  }
  for (const c of map.values()) c.innings.sort((a, b) => a - b);
  return Array.from(map.values());
}

// ---------- Note scoring (actionability-weighted) ----------

export interface ScoredNote {
  obs: RawObs;
  score: number;
  themeIds: ThemeId[];
  observerCount: number;     // distinct players who logged a note in the same theme
  isAlert: boolean;
}

export function scoreNotes(obs: RawObs[]): ScoredNote[] {
  const clusters = clusterByTheme(obs);
  // Map note id → max actionability of its themes + observer count
  const noteThemeScore = new Map<string, { actionability: number; observers: number; themes: ThemeId[] }>();
  for (const c of clusters) {
    for (const n of c.notes) {
      const cur = noteThemeScore.get(n.id) ?? { actionability: 0, observers: 0, themes: [] };
      cur.actionability = Math.max(cur.actionability, c.theme.actionability);
      cur.observers = Math.max(cur.observers, c.observers.size);
      cur.themes.push(c.themeId);
      noteThemeScore.set(n.id, cur);
    }
  }

  const alerts = new Set(detectAlerts(obs).map((a) => a.observationId));

  const out: ScoredNote[] = [];
  for (const o of obs) {
    if (!o.key_play) continue;
    const text = o.key_play.trim();
    if (text.length < 4) continue;

    const themeInfo = noteThemeScore.get(o.id);
    const actionability = themeInfo?.actionability ?? 0;
    const observerCount = themeInfo?.observers ?? 1;
    const themeIds = themeInfo?.themes ?? [];

    // Length penalty for ultra-short
    let score = 0;
    score += actionability;                       // 0–5: actionability is the dominant signal
    score += observerCount > 1 ? observerCount : 0; // trust bonus
    score += alerts.has(o.id) ? 2 : 0;            // alert bonus
    score += o.steal_it ? 3 : 0;                  // already player-flagged
    if (text.length < 8) score -= 1;

    out.push({
      obs: o,
      score,
      themeIds,
      observerCount,
      isAlert: alerts.has(o.id),
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Top-N highest-signal notes, but skip notes whose theme is already shown
 * as a cluster (avoid the "same idea three times" problem). Tie-break by
 * actionability (via theme) → observerCount → score. */
export function pickConfirmedReads(
  scored: ScoredNote[],
  clusters: NoteCluster[],
  limit = 5,
): ScoredNote[] {
  const clusteredThemes = new Set(
    clusters.filter((c) => c.notes.length >= 2).map((c) => c.themeId),
  );

  // Re-rank with explicit actionability emphasis.
  const themeActionability = new Map<ThemeId, number>(
    clusters.map((c) => [c.themeId, c.theme.actionability]),
  );
  const ranked = [...scored].sort((a, b) => {
    const aAct = Math.max(0, ...a.themeIds.map((t) => themeActionability.get(t) ?? 0));
    const bAct = Math.max(0, ...b.themeIds.map((t) => themeActionability.get(t) ?? 0));
    if (bAct !== aAct) return bAct - aAct;
    if (b.observerCount !== a.observerCount) return b.observerCount - a.observerCount;
    return b.score - a.score;
  });

  const result: ScoredNote[] = [];
  const seenThemes = new Set<ThemeId>();
  for (const s of ranked) {
    const overlap = s.themeIds.find((t) => clusteredThemes.has(t));
    if (overlap) {
      if (seenThemes.has(overlap)) continue;
      seenThemes.add(overlap);
    }
    result.push(s);
    if (result.length >= limit) break;
  }
  return result;
}
