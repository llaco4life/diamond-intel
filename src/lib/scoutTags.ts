export type AppliesTo = "offense" | "defense" | "ask";

export interface TagCategory {
  id: string;
  label: string;
  defaultAppliesTo: AppliesTo;
  tags: string[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    id: "pitching",
    label: "Pitching",
    defaultAppliesTo: "defense",
    tags: [
      "Strong command",
      "Lost command",
      "Wild pitch",
      "Tipping pitches",
      "Same motion all pitches",
      "Fastball heavy",
      "Works high",
      "Works low",
      "Off-speed used",
      "Slow to plate",
      "Weak first move",
    ],
  },
  {
    id: "defense",
    label: "Defense",
    defaultAppliesTo: "defense",
    tags: [
      "Smart shift",
      "Covered the gap",
      "Great communication",
      "Cut-off perfect",
      "Weak arm in left",
      "Weak arm in center",
      "Weak arm in right",
      "Slow corners",
      "Diving stop",
      "Missed assignment",
    ],
  },
  {
    id: "offense",
    label: "Offense",
    defaultAppliesTo: "offense",
    tags: [
      "Patient at-bat",
      "First pitch hacker",
      "2-strike adjustment",
      "Pulls everything",
      "Goes oppo",
      "Bunt threat",
      "Slapper",
      "Free swinger",
      "K looking",
      "Good two-strike approach",
    ],
  },
  {
    id: "baserunning",
    label: "Base running",
    defaultAppliesTo: "offense",
    tags: [
      "Aggressive jumps",
      "Conservative baserunner",
      "Great reads",
      "Picked off",
      "Overran base",
      "Tagged up correctly",
      "Scores on wild pitches",
      "Soft on contact reads",
    ],
  },
  {
    id: "coaching",
    label: "Coaching",
    defaultAppliesTo: "ask",
    tags: [
      "Bunt-heavy coach",
      "Steal-happy",
      "Hit-and-run",
      "Frequent mound visits",
      "Aggressive pinch running",
      "Conservative substitutions",
      "Strong defensive adjustments",
    ],
  },
];

export function getCategory(id: string): TagCategory | undefined {
  return TAG_CATEGORIES.find((c) => c.id === id);
}

/** Set of tag strings belonging to the Pitching category. Used by Learning summary
 * to filter pitcher-attributed observations without re-walking TAG_CATEGORIES. */
export const PITCHING_TAG_SET: Set<string> = new Set(
  TAG_CATEGORIES.find((c) => c.id === "pitching")?.tags ?? [],
);

/** Quick-tap tags rendered on the active pitcher card in Pitcher tab. */
export const PITCHER_QUICK_TAGS: string[] = [
  "Strong command",
  "Lost command",
  "Wild pitch",
  "Tipping pitches",
  "Same motion all pitches",
  "Fastball heavy",
  "Works high",
  "Works low",
  "Off-speed used",
  "Slow to plate",
  "Weak first move",
];

/**
 * Resolves which team a tag belongs to given its category and the current
 * offense/defense pair. Returns null when the category requires user choice.
 */
export function resolveAppliesTo(
  categoryId: string | null,
  offenseTeam: string,
  defenseTeam: string,
): string | null {
  if (!categoryId) return offenseTeam;
  const cat = getCategory(categoryId);
  if (!cat) return offenseTeam;
  if (cat.defaultAppliesTo === "offense") return offenseTeam;
  if (cat.defaultAppliesTo === "defense") return defenseTeam;
  return null;
}

export const ASSIGNMENT_OPTIONS = [
  "1B coach signs",
  "3B coach signs",
  "Catcher pop time",
  "Outfield arms",
  "Defensive shifts",
  "Batting order",
  "Bench chatter",
];

/** Role-specific quick-tap chips for each My Job assignment. */
export const ASSIGNMENT_TAG_CATALOG: Record<string, string[]> = {
  "1B coach signs": [
    "steal sign",
    "bunt sign",
    "fake bunt",
    "delayed steal",
    "hit and run",
    "straight steal",
    "take sign",
    "slash",
  ],
  "3B coach signs": [
    "squeeze",
    "bunt",
    "hold runner",
    "green light",
    "delay",
    "steal",
    "hit and run",
  ],
  "Catcher pop time": [
    "steal attempt",
    "runner safe",
    "runner out",
    "slow exchange",
    "weak arm",
    "strong throw",
    "high throw",
    "tailing throw",
  ],
  "Outfield arms": [
    "weak arm LF",
    "weak arm CF",
    "weak arm RF",
    "strong arm",
    "slow transfer",
    "accurate throw",
    "overthrow tendency",
  ],
  "Defensive shifts": [
    "middle shaded",
    "corners up",
    "left side heavy",
    "right side heavy",
    "slap defense",
    "bunt defense weak",
  ],
  "Batting order": [
    "leadoff aggressive",
    "auto-take first pitch",
    "free swinger",
    "power pocket 3-5",
    "bottom weak",
    "lineup flipped",
  ],
  "Bench chatter": [
    "sign-stealing chatter",
    "coach yelling location",
    "decoy calls",
  ],
};

export function getAssignmentChips(assignment: string | null): string[] {
  if (!assignment) return [];
  return ASSIGNMENT_TAG_CATALOG[assignment] ?? [];
}
