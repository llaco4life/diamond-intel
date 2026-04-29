const steps = [
  {
    n: "01",
    title: "Head coach signs up",
    description: "Your organization and first team are created automatically.",
  },
  {
    n: "02",
    title: "Share the team join code",
    description: "Send a 6-character code to players and assistants; they're in instantly.",
  },
  {
    n: "03",
    title: "Make better decisions faster",
    description: "Scouting reports, hitter tendencies, and live pitch history; ready when it matters.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-border bg-background py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            From signup to first scouting report in under five minutes.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="text-sm font-bold tracking-widest text-primary">{s.n}</span>
              <h3 className="mt-3 text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
