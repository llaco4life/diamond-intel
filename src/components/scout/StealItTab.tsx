import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineWriter } from "@/hooks/useOfflineWriter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMyInning } from "@/hooks/useMyInning";

interface Steal {
  id: string;
  steal_it: string;
  tags: string[] | null;
  inning: number;
  created_at: string;
}

export function StealItTab({
  gameId,
  defaultInning,
  opponentId,
}: {
  gameId: string;
  defaultInning: number;
  opponentId: string | null;
}) {
  const { user } = useAuth();
  const [inning] = useMyInning(gameId, user?.id ?? null, defaultInning);
  const { write } = useOfflineWriter();
  const [text, setText] = useState("");
  const [tag, setTag] = useState("");
  const [current, setCurrent] = useState<Steal[]>([]);
  const [historical, setHistorical] = useState<Steal[]>([]);

  const reload = useCallback(async () => {
    const { data: cur } = await supabase
      .from("scout_observations")
      .select("id, steal_it, tags, inning, created_at")
      .eq("game_id", gameId)
      .not("steal_it", "is", null)
      .order("created_at", { ascending: false });
    setCurrent((cur as Steal[]) ?? []);

    if (opponentId) {
      const { data: games } = await supabase
        .from("games")
        .select("id")
        .eq("opponent_id", opponentId)
        .neq("id", gameId);
      const ids = (games ?? []).map((g) => g.id);
      if (ids.length > 0) {
        const { data: hist } = await supabase
          .from("scout_observations")
          .select("id, steal_it, tags, inning, created_at")
          .in("game_id", ids)
          .not("steal_it", "is", null)
          .order("created_at", { ascending: false })
          .limit(20);
        setHistorical((hist as Steal[]) ?? []);
      }
    }
  }, [gameId, opponentId]);

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
      tags: tag.trim() ? [tag.trim()] : [],
      steal_it: text.trim(),
    });
    if (res.ok) toast.success("Steal It added 🔥");
    else toast.warning("Saved offline");
    setText("");
    setTag("");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-pink/60 bg-pink p-4">
        <Label htmlFor="si" className="text-pink-foreground font-semibold">
          🔥 Steal It
        </Label>
        <p className="text-xs text-pink-foreground/70 mb-2">
          What can we take from this opponent?
        </p>
        <Textarea
          id="si"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Catcher tips fastball with glove flutter"
          className="bg-card"
        />
        <Input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Tag (optional)"
          className="mt-2 bg-card"
        />
        <Button onClick={add} className="mt-2 w-full" disabled={!text.trim()}>
          Add to Steal It wall
        </Button>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">This game</h3>
        {current.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nothing yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {current.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card p-3 text-sm">
                <span className="text-xs text-muted-foreground">Inning {s.inning} · </span>
                {s.steal_it}
              </li>
            ))}
          </ul>
        )}
      </section>

      {historical.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            From past games vs this opponent
          </h3>
          <ul className="space-y-2">
            {historical.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card/60 p-3 text-sm">
                {s.steal_it}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
