import { createFileRoute } from "@tanstack/react-router";
import { Sprout } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/development")({
  component: () => (
    <ProtectedShell>
      <StubPage
        icon={<Sprout className="h-7 w-7" />}
        title="Development Log"
        phase="Phase 4"
        description="Working On / Got It items, coach notes, and assigned drills."
      />
    </ProtectedShell>
  ),
});
