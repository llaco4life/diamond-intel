import { Target } from "lucide-react";

const MISSIONS = [
  "Watch the pitcher",
  "Study the catcher",
  "Defense positioning",
  "Base running",
  "Hitting approach",
  "Coaching decisions",
  "Pressure moments",
];

const HINTS: Record<string, string> = {
  "Watch the pitcher": "Pitch types, sequencing, tells, pace.",
  "Study the catcher": "Pop time, framing, blocking, pitch calls.",
  "Defense positioning": "Shifts, depth, communication, jumps.",
  "Base running": "Leads, secondary leads, reads on contact.",
  "Hitting approach": "Counts, zones, two-strike adjustments.",
  "Coaching decisions": "Bunts, steals, mound visits, subs.",
  "Pressure moments": "What changes when the game tightens up?",
};

export function MissionCard({ inning }: { inning: number }) {
  const mission = MISSIONS[(inning - 1) % MISSIONS.length];
  return (
    <section className="rounded-2xl border-2 border-primary/30 bg-primary-soft p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
        <Target className="h-3.5 w-3.5" />
        Inning {inning} mission
      </div>
      <p className="mt-1 text-lg font-bold text-foreground">{mission}</p>
      <p className="mt-1 text-xs text-muted-foreground">{HINTS[mission]}</p>
    </section>
  );
}
