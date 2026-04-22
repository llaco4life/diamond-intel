import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMyInning } from "@/hooks/useMyInning";
import { useOfflineWriter } from "@/hooks/useOfflineWriter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InningStepper } from "./InningStepper";
import { TeamTagGrid } from "./TeamTagGrid";
import { ObservationList } from "./ObservationList";
import { toast } from "sonner";

export function ObserveTab({
  gameId,
  defaultInning,
  homeTeam,
  awayTeam,
}: {
  gameId: string;
  defaultInning: number;
  homeTeam: string;
  awayTeam: string;
}) {
  const { user } = useAuth();
  const [inning, setInning] = useMyInning(gameId, user?.id ?? null, defaultInning);
  const { write, sync, pending } = useOfflineWriter();
  const [offensiveTeam, setOffensiveTeam] = useState<string>(awayTeam);
  const [keyPlay, setKeyPlay] = useState("");
  const [pJersey, setPJersey] = useState("");
  const [pTag, setPTag] = useState("");
  const [pNote, setPNote] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recent, setRecent] = useState<any[]>([]);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("scout_observations")
      .select("id, inning, is_team_level, jersey_number, tags, key_play, steal_it, offensive_team, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(20);
    setRecent(data ?? []);
  }, [gameId]);

  useEffect(() => {
    reload();
    const channel = supabase
      .channel(`obs-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scout_observations",
          filter: `game_id=eq.${gameId}`,
        },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, reload]);

  const addTag = async (tag: string) => {
    if (!user) return;
    const res = await write("scout_observations", {
      game_id: gameId,
      player_id: user.id,
      inning,
      is_team_level: true,
      tags: [tag],
    });
    if (res.ok) {
      toast.success(tag);
      reload();
    } else {
      toast.warning(`${tag} (queued)`);
    }
  };

  const addKeyPlay = async () => {
    if (!user || !keyPlay.trim()) return;
    const res = await write("scout_observations", {
      game_id: gameId,
      player_id: user.id,
      inning,
      is_team_level: true,
      tags: [],
      key_play: keyPlay.trim(),
    });
    if (res.ok) toast.success("Key play saved");
    else toast.warning("Saved offline");
    setKeyPlay("");
    reload();
  };

  const addPlayerObs = async () => {
    if (!user || !pJersey.trim() || (!pTag.trim() && !pNote.trim())) {
      toast.error("Jersey + tag or note required");
      return;
    }
    const res = await write("scout_observations", {
      game_id: gameId,
      player_id: user.id,
      inning,
      is_team_level: false,
      jersey_number: pJersey.trim(),
      tags: pTag.trim() ? [pTag.trim()] : [],
      key_play: pNote.trim() || null,
    });
    if (res.ok) toast.success(`#${pJersey} logged`);
    else toast.warning("Saved offline");
    setPJersey("");
    setPTag("");
    setPNote("");
    reload();
  };

  return (
    <div className="space-y-4">
      <InningStepper inning={inning} onChange={setInning} />

      {pending > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <span>📡 {pending} pending</span>
          <Button size="sm" variant="outline" onClick={sync}>
            Sync now
          </Button>
        </div>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold">Quick tags</h3>
        <TeamTagGrid onPick={addTag} />
      </section>

      <section className="rounded-xl border bg-card p-4">
        <Label htmlFor="kp" className="text-sm font-semibold">
          Key play
        </Label>
        <Textarea
          id="kp"
          value={keyPlay}
          onChange={(e) => setKeyPlay(e.target.value)}
          placeholder="What just happened that matters?"
          className="mt-2 min-h-20"
        />
        <Button onClick={addKeyPlay} className="mt-2 w-full" disabled={!keyPlay.trim()}>
          Save key play
        </Button>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">By player (jersey #)</h3>
        <div className="flex gap-2">
          <Input
            value={pJersey}
            onChange={(e) => setPJersey(e.target.value)}
            placeholder="#"
            className="w-20"
          />
          <Input
            value={pTag}
            onChange={(e) => setPTag(e.target.value)}
            placeholder="Tag (e.g. Slapper)"
            className="flex-1"
          />
        </div>
        <Textarea
          value={pNote}
          onChange={(e) => setPNote(e.target.value)}
          placeholder="Note (optional)"
          className="mt-2 min-h-16"
        />
        <Button onClick={addPlayerObs} className="mt-2 w-full">
          Log player
        </Button>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Recent observations</h3>
        <ObservationList rows={recent.slice(0, 10)} />
      </section>
    </div>
  );
}
