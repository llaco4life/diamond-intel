import { Logo } from "./Logo";

interface StubPageProps {
  icon: React.ReactNode;
  title: string;
  phase: string;
  description: string;
}

export function StubPage({ icon, title, phase, description }: StubPageProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <div className="mt-6 rounded-2xl border bg-card p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          {icon}
        </div>
        <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
          {phase}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
