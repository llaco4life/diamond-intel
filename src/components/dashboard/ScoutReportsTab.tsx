import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpponentList } from "./OpponentList";
import { OpponentSessionList } from "./OpponentSessionList";
import { ScoutingReportView } from "./ScoutingReportView";

type View =
  | { kind: "list" }
  | { kind: "sessions"; opponentId: string | null; opponentName: string }
  | { kind: "report"; gameId: string; opponentId: string | null; opponentName: string };

export function ScoutReportsTab() {
  const [view, setView] = useState<View>({ kind: "list" });

  if (view.kind === "list") {
    return (
      <OpponentList
        onPickOpponent={(opponentId, opponentName) =>
          setView({ kind: "sessions", opponentId, opponentName })
        }
      />
    );
  }

  if (view.kind === "sessions") {
    return (
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView({ kind: "list" })}
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          All opponents
        </Button>
        <OpponentSessionList
          opponentId={view.opponentId}
          opponentName={view.opponentName}
          onPickGame={(gameId) =>
            setView({
              kind: "report",
              gameId,
              opponentId: view.opponentId,
              opponentName: view.opponentName,
            })
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          setView({
            kind: "sessions",
            opponentId: view.opponentId,
            opponentName: view.opponentName,
          })
        }
        className="-ml-2 h-8 px-2 text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {view.opponentName}
      </Button>
      <ScoutingReportView gameId={view.gameId} />
    </div>
  );
}
