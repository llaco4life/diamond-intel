import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
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

export function LearningSessionHeader({
  game,
  inning,
}: {
  game: GameRow;
  inning: number;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const swapTeams = async () => {
    if (swapping) return;
    setSwapping(true);
    const { error } = await supabase
      .from("games")
      .update({
        home_team: game.away_team,
        away_team: game.home_team,
        home_score: game.away_score,
        away_score: game.home_score,
      })
      .eq("id", game.id);
    setSwapping(false);
    if (error) {
      toast.error("Could not swap teams.");
      return;
    }
    toast.success("Home and away swapped");
  };

  const endSession = async () => {
    if (busy) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("games")
      .update({ status: "ended" })
      .eq("id", game.id)
      .select("id, status")
      .single();
    if (error || !data || data.status !== "ended") {
      setBusy(false);
      toast.error(error?.message ?? "Could not end session.");
      return;
    }
    toast.success("Session ended");
    navigate({ to: "/learning/summary/$sessionId", params: { sessionId: game.id } });
  };

  return (
    <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {game.tournament_name ?? "Learning"}
          </p>
          <p className="truncate text-sm font-semibold">
            {game.home_team} <span className="text-muted-foreground">vs</span> {game.away_team}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={swapping}
                aria-label="Swap home and away"
                title="Swap home/away"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Swap home and away?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will switch{" "}
                  <span className="font-medium text-foreground">{game.home_team}</span> and{" "}
                  <span className="font-medium text-foreground">{game.away_team}</span> (including
                  scores). Use this if you got home/away backwards when starting the session.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={swapTeams}>Swap</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Inning</p>
            <p className="text-xl font-bold tabular-nums">{inning}</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={busy}>
                {busy ? "Ending…" : "End"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll be taken to a summary of your observations and at-bat logs.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={endSession}>End session</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
