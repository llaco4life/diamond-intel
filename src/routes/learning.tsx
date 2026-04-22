import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/learning")({
  component: () => (
    <ProtectedShell>
      <StubPage
        icon={<GraduationCap className="h-7 w-7" />}
        title="Learning Mode"
        phase="Phase 3"
        description="Mission cards, at-bat self-ratings, and steal-it notes that flow into your development log."
      />
    </ProtectedShell>
  ),
});
