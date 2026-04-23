// Diamond Decisions — situational prompts mapped to inning missions.
// Mirrors the mission cycle in MissionCard.tsx so prompts align with the
// mission shown for the current inning.

export interface DiamondPrompt {
  /** Stable key, e.g. "watch_the_pitcher:0". Inning is NOT embedded — it is a
   * separate column in diamond_decision_responses and part of the unique
   * constraint, so the same prompt_key is reused across every inning that
   * cycles back to this mission. */
  key: string;
  text: string;
}

const MISSIONS_IN_ORDER = [
  "Watch the pitcher",
  "Study the catcher",
  "Defense positioning",
  "Base running",
  "Hitting approach",
  "Coaching decisions",
  "Pressure moments",
] as const;

const slugify = (m: string) => m.toLowerCase().replace(/\s+/g, "_");

const PROMPTS_BY_MISSION: Record<string, string[]> = {
  "Watch the pitcher": [
    "What pitch is she leaning on in pressure counts?",
    "If you were up next, what pitch would you look for first?",
    "Any tell before her off-speed?",
  ],
  "Study the catcher": [
    "Would you try to steal on her? Why or why not?",
    "How is she calling the game — patterns?",
    "Strongest part of her game right now?",
  ],
  "Defense positioning": [
    "Where is the defense cheating?",
    "If you were hitting, where's the hole?",
    "One positioning mistake you saw?",
  ],
  "Base running": [
    "Last runner — aggressive enough or too cautious?",
    "On a ball in the dirt with a runner on 2nd, go or stay?",
    "What read would you make on a line drive to the gap?",
  ],
  "Hitting approach": [
    "What's their two-strike approach?",
    "If you were hitting now, what's your plan?",
    "Best AB you've seen this inning — why?",
  ],
  "Coaching decisions": [
    "Last coaching call — agree or disagree, why?",
    "If you were coach right now, what would you say in the dugout?",
    "Bunt, steal, or swing away here?",
  ],
  "Pressure moments": [
    "What changed when the game tightened?",
    "Who looked rattled — pitcher, catcher, or defense?",
    "What would you do to slow the game down?",
  ],
};

export function missionForInning(inning: number): string {
  return MISSIONS_IN_ORDER[(inning - 1) % MISSIONS_IN_ORDER.length];
}

export function getPromptsForInning(inning: number): DiamondPrompt[] {
  const mission = missionForInning(inning);
  const slug = slugify(mission);
  const texts = PROMPTS_BY_MISSION[mission] ?? [];
  return texts.map((text, i) => ({ key: `${slug}:${i}`, text }));
}

// V2: Pre-game priming prompts (rendered in PrepView, stored at inning=0).
export const PREP_PROMPTS: DiamondPrompt[] = [
  { key: "prep:focus_why", text: "Why is your focus important for today's game?" },
  { key: "prep:matchup_read", text: "What do you know about today's opponent or matchup?" },
  { key: "prep:mindset", text: "How do you want to feel in the box / on the field today?" },
];

// V2: Post-game reflection prompts (rendered in ReflectView, stored at inning=99).
export const REFLECT_PROMPTS: DiamondPrompt[] = [
  { key: "reflect:steal", text: "What's the one read or habit you'll steal from today?" },
  { key: "reflect:focus_break", text: "Where did your focus break — and what triggered it?" },
  { key: "reflect:next_game", text: "What would you do differently in your next game?" },
];
