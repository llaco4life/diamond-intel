import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetStats } from "@/server/admin.functions";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const fn = useServerFn(adminGetStats);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminGetStats>> | null>(null);

  useEffect(() => {
    fn({}).then(setStats).catch(() => setStats(null));
  }, [fn]);

  const cards = [
    { label: "Total users", value: stats?.users },
    { label: "Organizations", value: stats?.orgs },
    { label: "Teams", value: stats?.teams },
    { label: "Games", value: stats?.games },
    { label: "Signups (7d)", value: stats?.signups7 },
    { label: "Signups (30d)", value: stats?.signups30 },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Overview</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-3xl font-bold">{c.value ?? "—"}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
