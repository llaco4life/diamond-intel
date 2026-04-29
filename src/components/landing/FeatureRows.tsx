import { LayoutDashboard, Sprout, Users } from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Coach Dashboard",
    description:
      "Scouting reports, opponent breakdowns, and player insights — organized by team and game so you can prep in minutes, not hours.",
    tone: "primary" as const,
  },
  {
    icon: Sprout,
    title: "Player Development Log",
    description:
      "Every player has their own log: focus tags, at-bat reflections, and progress over time. Players own their growth, coaches see the trend.",
    tone: "pink" as const,
  },
  {
    icon: Users,
    title: "Multi-team support",
    description:
      "Running 12U, 14U, and 16U? Each team gets its own roster, join code, and isolated data — switch with one tap from the header.",
    tone: "primary" as const,
  },
];

export function FeatureRows() {
  return (
    <section className="border-t border-border bg-secondary/40 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl space-y-12 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A platform that grows with your program
          </h2>
        </div>

        {features.map((f, i) => {
          const Icon = f.icon;
          const reverse = i % 2 === 1;
          const tone =
            f.tone === "primary"
              ? "bg-primary text-primary-foreground"
              : "bg-pink text-pink-foreground";
          return (
            <div
              key={f.title}
              className={`grid items-center gap-8 lg:grid-cols-2 ${
                reverse ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-3 text-muted-foreground">{f.description}</p>
              </div>
              <div className={`rounded-2xl p-8 shadow-elevated ${tone}`}>
                <div className="rounded-xl bg-background/20 p-6">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-semibold">{f.title}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-2 w-3/4 rounded-full bg-background/30" />
                    <div className="h-2 w-1/2 rounded-full bg-background/30" />
                    <div className="h-2 w-2/3 rounded-full bg-background/30" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="h-12 rounded-lg bg-background/30" />
                    <div className="h-12 rounded-lg bg-background/30" />
                    <div className="h-12 rounded-lg bg-background/30" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
