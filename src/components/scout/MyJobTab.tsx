import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ASSIGNMENT_OPTIONS } from "@/lib/scoutTags";
import { toast } from "sonner";

export function MyJobTab({
  gameId,
  onGoToObserve,
}: {
  gameId: string;
  onGoToObserve: () => void;
}) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("game_assignments")
      .select("assignment")
      .eq("game_id", gameId)
      .eq("player_id", user.id)
      .maybeSingle();
    setAssignment(data?.assignment ?? null);
    setLoading(false);
  }, [gameId, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const [picking, setPicking] = useState(false);

  const pick = async (a: string) => {
    if (!user) return;
    // If we already have an assignment, update it; otherwise insert.
    // (game_assignments has no DELETE policy, so we change in place.)
    const { error } = assignment
      ? await supabase
          .from("game_assignments")
          .update({ assignment: a })
          .eq("game_id", gameId)
          .eq("player_id", user.id)
      : await supabase
          .from("game_assignments")
          .insert({ game_id: gameId, player_id: user.id, assignment: a });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Assigned: ${a}`);
    setAssignment(a);
    setPicking(false);
  };

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl bg-muted/50" />;
  }

  if (assignment && !picking) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-primary/30 bg-primary-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Your assignment
          </p>
          <p className="mt-1 text-2xl font-bold">{assignment}</p>
          <p className="mt-3 text-sm text-foreground/70">
            Focus on this all game. Log everything you see in the Observe tab.
          </p>
        </div>
        <Button onClick={onGoToObserve} className="w-full" size="lg">
          Go to Observe
        </Button>
        <Button
          onClick={() => setPicking(true)}
          variant="ghost"
          className="w-full text-muted-foreground"
        >
          Change job
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {picking
          ? "Pick a different assignment. Your previous one will be replaced."
          : "Pick what you'll watch this game. Each assignment helps the team build a complete picture."}
      </p>
      {ASSIGNMENT_OPTIONS.map((a) => {
        const isCurrent = a === assignment;
        return (
          <button
            key={a}
            onClick={() => pick(a)}
            disabled={isCurrent}
            className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            <span className="font-medium">
              {a}
              {isCurrent && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (current)
                </span>
              )}
            </span>
            <span className="text-muted-foreground">→</span>
          </button>
        );
      })}
      {picking && (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => setPicking(false)}
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
