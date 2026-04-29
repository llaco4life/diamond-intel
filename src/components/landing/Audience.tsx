import { Shield, ClipboardList, User } from "lucide-react";

const audiences = [
  {
    icon: Shield,
    title: "Head Coaches",
    description: "Run scouting, call pitches, and own the program-wide view.",
  },
  {
    icon: ClipboardList,
    title: "Assistant Coaches",
    description: "Tag at-bats, log opponent tendencies, and feed the dashboard live.",
  },
  {
    icon: User,
    title: "Players",
    description: "Track at-bats, work focus tags, and see your own progress over time.",
  },
];

export function Audience() {
  return (
    <section className="border-t border-border bg-background py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for the whole dugout
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {audiences.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.title}
                className="rounded-2xl border border-border bg-card p-6 text-center shadow-card"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
