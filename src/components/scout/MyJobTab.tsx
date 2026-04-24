import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASSIGNMENT_OPTIONS, getAssignmentChips } from "@/lib/scoutTags";
import { toast } from "sonner";

interface JobObs {
  id: string;
  inning: number;
  tags: string[] | null;
  key_play: string | null;
  applies_to_team: string | null;
  created_at: string;
}

export function MyJobTab({
  gameId,
  defaultInning,
}: {
  gameId: string;
  defaultInning?: number;
  onGoToObserve?: () => void;
}) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [entries, setEntries] = useState<JobObs[]>([]);
  const [note, setNote] = useState("");
  const [editMode, setEditMode] = useState(false);

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

  const loadEntries = useCallback(async () => {
    if (!user || !assignment) {
      setEntries([]);
      return;
    }
    const { data } = await supabase
      .from("scout_observations")
      .select("id, inning, tags, key_play, applies_to_team, created_at")
      .eq("game_id", gameId)
      .eq("player_id", user.id)
      .eq("applies_to_team", `job:${assignment}`)
      .order("created_at", { ascending: false })
      .limit(20);
    setEntries(((data ?? []) as JobObs[]));
  }, [gameId, user, assignment]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Realtime updates for this player's job entries
  useEffect(() => {
    if (!user || !assignment) return;
    const channel = supabase
      .channel(`job-${gameId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scout_observations",
          filter: `game_id=eq.${gameId}`,
        },
        () => loadEntries(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, user, assignment, loadEntries]);

  const pick = async (a: string) => {
    if (!user) return;
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

  const logChip = async (chip: string) => {
    if (!user || !assignment) return;
    const inning = defaultInning ?? 1;
    const { data, error } = await supabase
      .from("scout_observations")
      .insert({
        game_id: gameId,
        player_id: user.id,
        inning,
        is_team_level: true,
        tags: [chip],
        applies_to_team: `job:${assignment}`,
      })
      .select("id")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(chip, {
      action: data
        ? {
            label: "Undo",
            onClick: async () => {
              await supabase.from("scout_observations").delete().eq("id", data.id);
              loadEntries();
            },
          }
        : undefined,
    });
    loadEntries();
  };

  const saveNote = async () => {
    if (!user || !assignment) return;
    const text = note.trim();
    if (!text) return;
    const inning = defaultInning ?? 1;
    const { error } = await supabase.from("scout_observations").insert({
      game_id: gameId,
      player_id: user.id,
      inning,
      is_team_level: true,
      tags: [],
      key_play: text,
      applies_to_team: `job:${assignment}`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNote("");
    toast.success("Note saved");
    loadEntries();
  };

  const removeEntry = async (id: string) => {
    const { error } = await supabase.from("scout_observations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    loadEntries();
  };

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl bg-muted/50" />;
  }

  // Picker view (no assignment yet, or changing)
  if (!assignment || picking) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {picking
            ? "Pick a different assignment. Previous data is preserved."
            : "Pick what you'll watch this game. Each role gets its own tracking chips."}
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

  const chips = getAssignmentChips(assignment);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between rounded-2xl border-2 border-primary/30 bg-primary-soft p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Your assignment
          </p>
          <p className="mt-1 text-xl font-bold">{assignment}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPicking(true)}
          className="text-xs"
        >
          Change job
        </Button>
      </div>

      {/* Quick chips */}
      {chips.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick tags · tap to log
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => logChip(c)}
                className="rounded-full border bg-card px-3 py-1.5 text-sm transition-transform active:scale-95 hover:bg-muted"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
          No quick chips defined — use the pattern note below.
        </p>
      )}

      {/* Pattern note */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pattern note
        </p>
        <div className="flex gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. touches belt before steal"
            onKeyDown={(e) => {
              if (e.key === "Enter") saveNote();
            }}
          />
          <Button onClick={saveNote} disabled={!note.trim()}>
            Save
          </Button>
        </div>
      </div>

      {/* Recent entries */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent · this game
          </p>
          {entries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 text-xs"
              onClick={() => setEditMode((v) => !v)}
            >
              {editMode ? "Done" : "Edit"}
            </Button>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nothing logged yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    I{e.inning}
                  </span>
                  {e.tags && e.tags.length > 0 && <span>{e.tags.join(", ")}</span>}
                  {e.key_play && (
                    <span className="italic text-muted-foreground">
                      {e.tags && e.tags.length > 0 ? " — " : ""}"{e.key_play}"
                    </span>
                  )}
                </span>
                {editMode && (
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="rounded px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10"
                    aria-label="Delete entry"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
