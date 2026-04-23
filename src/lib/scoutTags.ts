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
      "Fastball only",
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
  "Pitcher tendencies",
  "1B coach signs",
  "3B coach signs",
  "Catcher pop time",
  "Batting order",
  "Defensive shifts",
  "Bench chatter",
  "Outfield arms",
];
