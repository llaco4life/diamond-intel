/**
 * Learning Mode V2 — focus-driven self-evaluation tag sets.
 *
 * The player picks 1–2 focuses in Prep. LiveQuickView surfaces only the tags
 * for those focuses, so logging during a session reflects "how did I do?"
 * rather than "what did the opponent do?" (Scout Mode handles the latter.)
 *
 * Self-evaluation sentinel
 * ------------------------
 * When a tag is logged from LiveQuickView in Learning Mode V2 we write to
 * `scout_observations` with:
 *
 *   applies_to_team = "self"
 *   is_team_level   = false
 *   offensive_team  = null
 *
 * The string `"self"` is the documented Learning Mode self-evaluation
 * sentinel. It distinguishes self-reflection rows from Scout Mode rows
 * (which always carry a real team name), so downstream views (ReflectView,
 * LearningSummaryView, ObservationList) can treat them differently — e.g.
 * hide the OFF/DEF team badge — without a schema change.
 *
 * Tone semantics
 * --------------
 * Tones are developmental, not punitive:
 *   - "positive" — moments to celebrate / reinforce
 *   - "growth"   — coaching opportunities, framed as "next time" not failure
 *   - "neutral"  — observational, no judgement
 *
 * Styling lives in FocusTagPicker. Growth tags use a soft accent (not red /
 * destructive) so the picker reads like coaching, not blame.
 */

export type FocusTagTone = "positive" | "growth" | "neutral";

export interface FocusTag {
  label: string;
  tone: FocusTagTone;
}

/**
 * Keys are the lowercased + trimmed focus label. Keep in sync with
 * PRESET_FOCUSES in `src/components/learning/LearningSetup.tsx`.
 * Custom (player-typed) focuses fall back to CUSTOM_FOCUS_TAGS.
 */
export const FOCUS_TAG_SETS: Record<string, FocusTag[]> = {
  "two-strike discipline": [
    { label: "Protected the zone", tone: "positive" },
    { label: "Trusted my approach", tone: "positive" },
    { label: "Good two-strike AB", tone: "positive" },
    { label: "Chased high pitch", tone: "growth" },
    { label: "Expanded too much", tone: "growth" },
  ],
  "pitch recognition": [
    { label: "Recognized off-speed early", tone: "positive" },
    { label: "Took a borderline pitch", tone: "positive" },
    { label: "Stayed back on breaking", tone: "positive" },
    { label: "Late on fastball", tone: "growth" },
    { label: "Fooled by spin", tone: "growth" },
  ],
  "confidence after mistakes": [
    { label: "Reset quickly", tone: "positive" },
    { label: "Stayed engaged", tone: "positive" },
    { label: "Carried last mistake", tone: "growth" },
    { label: "Pressed too much", tone: "growth" },
  ],
  "aggressive baserunning": [
    { label: "Took the extra base", tone: "positive" },
    { label: "Strong secondary lead", tone: "positive" },
    { label: "Good first step", tone: "positive" },
    { label: "Hesitated at contact", tone: "growth" },
    { label: "Got picked / tagged", tone: "growth" },
  ],
  leadership: [
    { label: "Strong dugout energy", tone: "positive" },
    { label: "Picked up a teammate", tone: "positive" },
    { label: "Called it early", tone: "positive" },
    { label: "Stayed quiet when needed loud", tone: "growth" },
  ],
  "situational awareness": [
    { label: "Knew the situation", tone: "positive" },
    { label: "Took the extra base", tone: "positive" },
    { label: "Good first step", tone: "positive" },
    { label: "Wrong read off contact", tone: "growth" },
    { label: "Lost track of outs", tone: "growth" },
    { label: "Missed baserunning read", tone: "growth" },
  ],
  "defensive communication": [
    { label: "Called it early", tone: "positive" },
    { label: "Strong leadership", tone: "positive" },
    { label: "Late communication", tone: "growth" },
    { label: "Missed assignment", tone: "growth" },
  ],
};

/** Fallback set for player-typed custom focuses we don't have a curated list for. */
export const CUSTOM_FOCUS_TAGS: FocusTag[] = [
  { label: "Did it well", tone: "positive" },
  { label: "Made progress", tone: "positive" },
  { label: "Need to keep working", tone: "growth" },
  { label: "Missed the moment", tone: "growth" },
];

export function tagsForFocus(focus: string): FocusTag[] {
  return FOCUS_TAG_SETS[focus.toLowerCase().trim()] ?? CUSTOM_FOCUS_TAGS;
}

/** Sentinel used in scout_observations.applies_to_team for Learning Mode self-eval rows. */
export const SELF_EVAL_SENTINEL = "self" as const;
