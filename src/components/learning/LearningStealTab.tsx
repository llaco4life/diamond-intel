import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineWriter } from "@/hooks/useOfflineWriter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Steal {
  id: string;
  steal_it: string;
  inning: number;
  created_at: string;
}

export function LearningStealTab({
  gameId,
  inning,
}: {
  gameId: string;
  inning: number;
}) {
  const { user } = useAuth();
  const { write } = useOfflineWriter();
  const [text, setText] = useState("");
  const [items, setItems] = useState<Steal[]>([]);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("scout_observations")
      .select("id, steal_it, inning, created_at")
      .eq("game_id", gameId)
      .eq("player_id", user.id)
      .not("steal_it", "is", null)
      .order("created_at", { ascending: false });
    setItems((data as Steal[]) ?? []);
  }, [gameId, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = async () => {
    if (!user || !text.trim()) return;
    const res = await write("scout_observations", {
      game_id: gameId,
      player_id: user.id,
      inning,
      is_team_level: true,
      tags: [],
      steal_it: text.trim(),
    });
    if (res.ok) toast.success("Added 🔥");
    else toast.warning("Saved offline");
    setText("");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-pink/60 bg-pink p-4">
        <Label htmlFor="si" className="text-pink-foreground font-semibold">
          🔥 Steal It
        </Label>
        <p className="mb-2 text-xs text-pink-foreground/70">
          What can you steal from this — a tendency, an approach, a habit you want to copy?
        </p>
        <Textarea
          id="si"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Slap hitter shortens up with 2 strikes"
          className="bg-card"
        />
        <Button onClick={add} className="mt-2 w-full" disabled={!text.trim()}>
          Add to my Steal It list
        </Button>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">This session</h3>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nothing yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card p-3 text-sm">
                <span className="text-xs text-muted-foreground">Inning {s.inning} · </span>
                {s.steal_it}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
