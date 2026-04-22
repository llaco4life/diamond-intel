import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/AppShell";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedShell coachOnly>
      <DashboardPage />
    </ProtectedShell>
  ),
});
