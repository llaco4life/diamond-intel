import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/AppShell";
import { LearningSummaryView } from "@/components/learning/LearningSummaryView";

export const Route = createFileRoute("/learning/summary/$sessionId")({
  component: SummaryRoute,
});

function SummaryRoute() {
  const { sessionId } = Route.useParams();
  return (
    <ProtectedShell>
      <LearningSummaryView sessionId={sessionId} />
    </ProtectedShell>
  );
}
