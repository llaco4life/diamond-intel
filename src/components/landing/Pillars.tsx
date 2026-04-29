import { Eye, GraduationCap, Target } from "lucide-react";

const pillars = [
  {
    icon: Eye,
    title: "Scout Mode",
    description:
      "Track opponents inning by inning. Tag tendencies. Build a real game plan your bench can read at a glance.",
    tone: "primary" as const,
  },
  {
    icon: GraduationCap,
    title: "Learning Mode",
    description:
      "Players log at-bats, work focus tags, and grow their eye between games — not just on game day.",
    tone: "pink" as const,
  },
  {
    icon: Target,
    title: "Pitch Intel",
    description:
      "Live pitch calling: codes, count, fatigue, and recommendations from the dugout in real time.",
    tone: "primary" as const,
  },
];

export function Pillars() {
  return (
    <section className="border-t border-border bg-background py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Scout it. Teach it. Win it.
          </h2>
          <p className="mt-3 text-muted-foreground whitespace-pre-line">
            Scout the opponent, develop your players, and make better decisions{"\n\n"}
            when the game is on the line.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => {
            const Icon = p.icon;
            const tone =
              p.tone === "primary"
                ? "bg-primary text-primary-foreground"
                : "bg-pink text-pink-foreground";
            return (
              <div
                key={p.title}
                className={`flex flex-col gap-4 rounded-2xl p-6 shadow-card ${tone}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/20">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">{p.title}</h3>
                <p className="text-sm opacity-90">{p.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
