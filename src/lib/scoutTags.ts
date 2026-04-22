export interface TagCategory {
  id: string;
  label: string;
  tags: string[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    id: "pitching",
    label: "Pitching",
    tags: [
      "Rise ball",
      "Drop curve",
      "Change-up",
      "Fastball only",
      "Lost command",
      "Strong command",
      "Wild pitch",
      "Tipping pitches",
      "Same motion all pitches",
      "Effective change-up",
    ],
  },
  {
    id: "defense",
    label: "Defense",
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
