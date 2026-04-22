import { createFileRoute } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/scout")({
  component: () => (
    <ProtectedShell>
      <StubPage
        icon={<Eye className="h-7 w-7" />}
        title="Scout Mode"
        phase="Phase 2"
        description="Game setup, inning-by-inning observations, pitcher tracking, and the Steal It wall — coming next."
      />
    </ProtectedShell>
  ),
});
