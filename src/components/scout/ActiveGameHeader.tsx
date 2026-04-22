import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GameRow } from "@/hooks/useActiveGame";

export function ActiveGameHeader({
  game,
  isCoach,
  onRefresh,
}: {
  game: GameRow;
  isCoach: boolean;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const updateScore = async (side: "home" | "away", delta: number) => {
    const next = Math.max(0, (side === "home" ? game.home_score : game.away_score) + delta);
    const patch = side === "home" ? { home_score: next } : { away_score: next };
    const { error } = await supabase.from("games").update(patch).eq("id", game.id);
    if (error) toast.error(error.message);
    else onRefresh();
  };

  const endGame = async () => {
    setBusy(true);
    const { error } = await supabase.from("games").update({ status: "ended" }).eq("id", game.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Game ended");
    navigate({ to: "/scout/summary/$gameId", params: { gameId: game.id } });
  };

  return (
    <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <ScoreCol
            label={game.home_team}
            score={game.home_score}
            isCoach={isCoach}
            onPlus={() => updateScore("home", 1)}
            onMinus={() => updateScore("home", -1)}
          />
          <span className="text-sm font-semibold text-muted-foreground">vs</span>
          <ScoreCol
            label={game.away_team}
            score={game.away_score}
            isCoach={isCoach}
            onPlus={() => updateScore("away", 1)}
            onMinus={() => updateScore("away", -1)}
          />
        </div>
        {isCoach && (
          <div className="mt-3 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={busy}>
                  End Game
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End this game?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will close the game and take everyone to the summary.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={endGame}>End game</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCol({
  label,
  score,
  isCoach,
  onPlus,
  onMinus,
}: {
  label: string;
  score: number;
  isCoach: boolean;
  onPlus: () => void;
  onMinus: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center gap-2">
      <div className="text-center">
        <p className="truncate text-xs font-medium text-muted-foreground max-w-32">{label}</p>
        <p className="text-3xl font-bold tabular-nums">{score}</p>
      </div>
      {isCoach && (
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={onPlus}>
            <Plus className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={onMinus}>
            <Minus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
