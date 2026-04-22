import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedShell coachOnly>
      <StubPage
        icon={<LayoutDashboard className="h-7 w-7" />}
        title="Coach Dashboard"
        phase="Phase 5"
        description="Scout reports, learning insights, development overview, and at-bat trends — coaches only."
      />
    </ProtectedShell>
  ),
});
