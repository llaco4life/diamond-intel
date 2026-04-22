export const PITCH_TYPES = [
  { slug: "fastball", label: "Fastball" },
  { slug: "change_up", label: "Change-up" },
  { slug: "rise_ball", label: "Rise ball" },
  { slug: "drop_curve", label: "Drop curve" },
  { slug: "curve", label: "Curve" },
  { slug: "screwball", label: "Screwball" },
  { slug: "drop_ball", label: "Drop ball" },
  { slug: "other", label: "Other" },
] as const;

export type PitchSlug = (typeof PITCH_TYPES)[number]["slug"];

export type PitchCounts = Partial<Record<PitchSlug, number>>;

const LABEL_BY_SLUG: Record<string, string> = Object.fromEntries(
  PITCH_TYPES.map((p) => [p.slug, p.label]),
);

export function pitchLabel(slug: string): string {
  return LABEL_BY_SLUG[slug] ?? slug;
}

export function nonZeroPitchCounts(counts: PitchCounts): PitchCounts {
  const out: PitchCounts = {};
  for (const [k, v] of Object.entries(counts)) {
    if (typeof v === "number" && v > 0) out[k as PitchSlug] = v;
  }
  return out;
}
