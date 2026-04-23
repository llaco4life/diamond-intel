import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineWriter } from "@/hooks/useOfflineWriter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ObservationList } from "@/components/scout/ObservationList";
import { FocusTagPicker } from "./FocusTagPicker";
import { SELF_EVAL_SENTINEL } from "@/lib/learningFocusTags";
import { toast } from "sonner";
import type { GameRow } from "@/hooks/useActiveGame";
import { Target } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ObsRow = any;

const INNINGS = [1, 2, 3, 4, 5, 6, 7];

export function LiveQuickView({
  game,
  onAdvance,
}: {
  game: GameRow;
  onAdvance: (g: GameRow) => void;
}) {
  const { user } = useAuth();
  const { write, sync, pending } = useOfflineWriter();
  const [inning, setInning] = useState(game.current_inning ?? 1);

  const [keyPlay, setKeyPlay] = useState("");
  const [recent, setRecent] = useState<ObsRow[]>([]);
  const [justAddedTag, setJustAddedTag] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focuses = useMemo(() => game.learning_focuses ?? [], [game.learning_focuses]);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("scout_observations")
      .select(
        "id, inning, is_team_level, jersey_number, tags, key_play, steal_it, offensive_team, applies_to_team, created_at",
      )
      .eq("game_id", game.id)
      .eq("player_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setRecent(data ?? []);
  }, [game.id, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of recent) {
      if (r.inning !== inning) continue;
      const tags: string[] = Array.isArray(r.tags) ? r.tags : [];
      for (const t of tags) counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [recent, inning]);

  const flashTag = (tag: string) => {
    setJustAddedTag(tag);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setJustAddedTag(null), 600);
  };

  const deleteObservation = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("scout_observations").delete().eq("id", id);
      if (error) {
        toast.error("Could not delete");
        return;
      }
      reload();
    },
    [reload],
  );

  const editKeyPlay = useCallback(
    async (row: ObsRow) => {
      const next = window.prompt("Edit note", row.key_play ?? "");
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed) return;
      const { error } = await supabase
        .from("scout_observations")
        .update({ key_play: trimmed })
        .eq("id", row.id);
      if (error) {
        toast.error("Could not update");
        return;
      }
      reload();
    },
    [reload],
  );

  // Self-evaluation write — uses the documented `"self"` sentinel for applies_to_team
  // so downstream views can distinguish Learning self-eval from Scout team rows.
  const writeTag = async (tag: string) => {
    if (!user) return;
    const payload: Record<string, unknown> = {
      game_id: game.id,
      player_id: user.id,
      inning,
      is_team_level: false,
      tags: [tag],
      offensive_team: null,
      applies_to_team: SELF_EVAL_SENTINEL,
    };
    const res = await write("scout_observations", payload);
    if (res.ok) {
      flashTag(tag);
      const insertedId = res.id;
      toast.success(tag, {
        action: insertedId
          ? { label: "Undo", onClick: () => deleteObservation(insertedId) }
          : undefined,
      });
      reload();
    } else {
      toast.warning(`${tag} (queued)`);
    }
  };

  const addKeyPlay = async () => {
    if (!user || !keyPlay.trim()) return;
    const res = await write("scout_observations", {
      game_id: game.id,
      player_id: user.id,
      inning,
      is_team_level: false,
      tags: [],
      key_play: keyPlay.trim(),
      offensive_team: null,
      applies_to_team: SELF_EVAL_SENTINEL,
    });
    if (res.ok) toast.success("Note saved");
    else toast.warning("Saved offline");
    setKeyPlay("");
    reload();
  };

  const endLive = async () => {
    setAdvancing(true);
    const { data, error } = await supabase
      .from("games")
      .update({ learning_phase: "reflect" })
      .eq("id", game.id)
      .select("*")
      .single();
    setAdvancing(false);
    if (error || !data) {
      toast.error("Could not advance");
      return;
    }
    toast.success("Game ended. Time to reflect.");
    onAdvance(data as GameRow);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-24">
      {focuses.length > 0 && (
        <div className="sticky top-[60px] z-10 -mx-4 border-b border-primary/30 bg-primary-soft/80 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Today's focus
            </span>
            <span className="truncate font-medium">{focuses.join(" · ")}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Label className="shrink-0 text-sm font-semibold">Inning</Label>
        <Select value={String(inning)} onValueChange={(v) => setInning(parseInt(v, 10))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INNINGS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                Inning {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pending > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <span>📡 {pending} pending</span>
          <Button size="sm" variant="outline" onClick={sync}>
            Sync now
          </Button>
        </div>
      )}

      <section>
        <h3 className="mb-1 text-sm font-semibold">How are you doing?</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Tap what you noticed about <span className="font-medium">your</span> play. Light touch —
          deeper reflection comes after the game.
        </p>
        <FocusTagPicker
          focuses={focuses}
          tagCounts={tagCounts}
          justAddedTag={justAddedTag}
          onPick={writeTag}
        />
      </section>

      <section className="rounded-xl border bg-card p-4">
        <Label htmlFor="kp" className="text-sm font-semibold">
          Quick Steal It / note
        </Label>
        <Textarea
          id="kp"
          value={keyPlay}
          onChange={(e) => setKeyPlay(e.target.value)}
          placeholder="Something you don't want to forget…"
          className="mt-2 min-h-16"
        />
        <Button onClick={addKeyPlay} className="mt-2 w-full" disabled={!keyPlay.trim()}>
          Save note
        </Button>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Your recent notes</h3>
        <ObservationList
          rows={recent.slice(0, 10)}
          onDelete={deleteObservation}
          onEdit={editKeyPlay}
        />
      </section>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="lg" variant="destructive" className="w-full" disabled={advancing}>
            End game → Reflect
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End game and reflect?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll move to the reflection step. You can still come back to add live notes if
              needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={endLive}>End & reflect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
