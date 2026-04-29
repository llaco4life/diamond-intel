import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, GraduationCap, Target, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-primary-soft), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 right-0 h-80 w-80 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-pink), transparent 70%)" }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-16 lg:grid-cols-2 lg:items-center lg:pt-20 lg:pb-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Built for travel ball
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your dugout should be <span className="text-primary">smarter</span> than the other side.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Scout opponents inning by inning, track live pitch sequences, and develop players with
            one platform built for competitive travel ball.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">
                Get started free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/signup">Join with Team Code</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free during beta · Mobile-first · Works in the dugout
          </p>
        </div>

        {/* Stylized app preview */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-transparent to-pink/40 blur-2xl" />
          <div className="relative rounded-[2rem] border border-border bg-card p-3 shadow-elevated">
            <div className="rounded-[1.5rem] bg-background p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">
                  Diamond <span className="text-primary">Intel</span>
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  Unity 12u
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">Hey Coach 👋</h3>
              <p className="mb-3 text-xs text-muted-foreground">Pick a mode to get started.</p>
              <div className="grid grid-cols-2 gap-2">
                <MockTile icon={<Eye className="h-4 w-4" />} label="Scout" tone="primary" />
                <MockTile icon={<GraduationCap className="h-4 w-4" />} label="Learning" tone="pink" />
                <MockTile icon={<Target className="h-4 w-4" />} label="Pitch Intel" tone="primary" />
                <MockTile icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" tone="muted" />
              </div>
              <div className="mt-3 rounded-xl border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                No active games · Start one from Scout
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockTile({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "primary" | "pink" | "muted";
}) {
  const styles =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "pink"
      ? "bg-pink text-pink-foreground"
      : "bg-secondary text-secondary-foreground";
  return (
    <div className={`flex flex-col gap-1.5 rounded-xl p-2.5 ${styles}`}>
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-background/20">
        {icon}
      </div>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}
