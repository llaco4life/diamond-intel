import { NotebookPen, Link2, History, Layers } from "lucide-react";

const reasons = [
  {
    icon: NotebookPen,
    title: "Stop flipping through paper notebooks",
    description: "Your scouting lives in your pocket — searchable, sortable, and always with you.",
  },
  {
    icon: Link2,
    title: "Keep scouting notes connected by game",
    description: "Every note ties back to the opponent, inning, and pitcher — not a loose page.",
  },
  {
    icon: History,
    title: "See what worked last at-bat before she steps in again",
    description: "Pull up a hitter's last AB, last pitch sequence, and last result in one tap.",
  },
  {
    icon: Layers,
    title: "Manage multiple teams without mixing data",
    description: "Each team gets its own roster, scouting, and join code. Switch in one click.",
  },
];

export function WhyCoachesSwitch() {
  return (
    <section className="border-t border-border bg-secondary/40 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Why coaches switch
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Real coaching problems, finally solved.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built from the dugout — not a boardroom. Diamond Intel removes the friction so you can
            actually coach.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {reasons.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{r.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
