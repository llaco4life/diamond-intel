import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineWriter } from "@/hooks/useOfflineWriter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InningStepper } from "@/components/scout/InningStepper";
import { TeamTagGrid } from "@/components/scout/TeamTagGrid";
import { ObservationList } from "@/components/scout/ObservationList";
import { resolveAppliesTo } from "@/lib/scoutTags";
import { toast } from "sonner";
import { MissionCard } from "./MissionCard";
import { CurrentPitcherBar, type CurrentPitcher } from "./CurrentPitcherBar";
import { DiamondDecisionsCard } from "./DiamondDecisionsCard";

type Side = "offense" | "defense";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ObsRow = any;

export function LearningObserveTab({
  gameId,
  inning,
  onInningChange,
  homeTeam,
  awayTeam,
}: {
  gameId: string;
  inning: number;
  onInningChange: (n: number) => void;
  homeTeam: string;
  awayTeam: string;
}) {
  const { user } = useAuth();
  const { write, sync, pending } = useOfflineWriter();
  const [offenseTeam, setOffenseTeam] = useState<string>(awayTeam);
  const defenseTeam = useMemo(
    () => (offenseTeam === homeTeam ? awayTeam : homeTeam),
    [offenseTeam, homeTeam, awayTeam],
  );

  const [pendingCoaching, setPendingCoaching] = useState<{ tag: string } | null>(null);
  const [currentPitcher, setCurrentPitcher] = useState<CurrentPitcher | null>(null);
  const [keyPlay, setKeyPlay] = useState("");
  const [recent, setRecent] = useState<ObsRow[]>([]);
  const [justAddedTag, setJustAddedTag] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("scout_observations")
      .select(
        "id, inning, is_team_level, jersey_number, tags, key_play, steal_it, offensive_team, applies_to_team, created_at",
      )
      .eq("game_id", gameId)
      .eq("player_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setRecent(data ?? []);
  }, [gameId, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Tag counts for current inning
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

  const writeTag = async (
    tag: string,
    appliesTo: string,
    pitcher?: CurrentPitcher | null,
  ) => {
    if (!user) return;
    const payload: Record<string, unknown> = {
      game_id: gameId,
      player_id: user.id,
      inning,
      is_team_level: pitcher ? false : true,
      tags: [tag],
      offensive_team: offenseTeam,
      applies_to_team: appliesTo,
    };
    if (pitcher) {
      payload.pitcher_id = pitcher.id;
      payload.jersey_number = pitcher.jersey_number;
    }
    const res = await write("scout_observations", payload);
    if (res.ok) {
      flashTag(tag);
      const insertedId = res.id;
      toast.success(`${tag} · ${appliesTo}`, {
        action: insertedId
          ? { label: "Undo", onClick: () => deleteObservation(insertedId) }
          : undefined,
      });
      reload();
    } else {
      toast.warning(`${tag} (queued)`);
    }
  };

  const onPickTag = async (tag: string, categoryId: string) => {
    if (categoryId === "pitching" && !currentPitcher) {
      toast.error("Pick or add the current pitcher first");
      return;
    }
    const resolved = resolveAppliesTo(categoryId, offenseTeam, defenseTeam);
    if (resolved === null) {
      setPendingCoaching({ tag });
      return;
    }
    await writeTag(
      tag,
      resolved,
      categoryId === "pitching" ? currentPitcher : null,
    );
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
      offensive_team: offenseTeam,
      applies_to_team: offenseTeam,
    });
    if (res.ok) toast.success("Key play saved");
    else toast.warning("Saved offline");
    setKeyPlay("");
    reload();
  };

  const resolveCoaching = async (side: Side) => {
    if (!pendingCoaching) return;
    const team = side === "offense" ? offenseTeam : defenseTeam;
    await writeTag(pendingCoaching.tag, team);
    setPendingCoaching(null);
  };

  return (
    <div className="space-y-4">
      <MissionCard inning={inning} />

      <DiamondDecisionsCard gameId={gameId} inning={inning} />

      <section className="rounded-xl border bg-card p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Who's on offense?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={offenseTeam === awayTeam ? "default" : "outline"}
            onClick={() => setOffenseTeam(awayTeam)}
            className="h-10"
          >
            {awayTeam}
          </Button>
          <Button
            type="button"
            variant={offenseTeam === homeTeam ? "default" : "outline"}
            onClick={() => setOffenseTeam(homeTeam)}
            className="h-10"
          >
            {homeTeam}
          </Button>
        </div>
      </section>

      <CurrentPitcherBar
        gameId={gameId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        current={currentPitcher}
        onChange={setCurrentPitcher}
      />

      <InningStepper inning={inning} onChange={onInningChange} />

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
        <p className="mb-2 text-xs text-muted-foreground">
          Tap to log for inning {inning}. Tap again to log another. Use the trash icon below to remove.
        </p>
        <TeamTagGrid
          offenseTeam={offenseTeam}
          defenseTeam={defenseTeam}
          onPick={onPickTag}
          tagCounts={tagCounts}
          justAddedTag={justAddedTag}
        />
      </section>

      <section className="rounded-xl border bg-card p-4">
        <Label htmlFor="kp" className="text-sm font-semibold">
          Key play / note
        </Label>
        <Textarea
          id="kp"
          value={keyPlay}
          onChange={(e) => setKeyPlay(e.target.value)}
          placeholder="What did you notice?"
          className="mt-2 min-h-20"
        />
        <Button onClick={addKeyPlay} className="mt-2 w-full" disabled={!keyPlay.trim()}>
          Save note
        </Button>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Your recent notes</h3>
        <ObservationList
          rows={recent.slice(0, 10)}
          offenseTeam={offenseTeam}
          onDelete={deleteObservation}
          onEdit={editKeyPlay}
        />
      </section>

      <Sheet
        open={pendingCoaching !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCoaching(null);
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Whose coaching are you tagging?</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-1 gap-3 pb-4">
            <Button size="lg" className="h-16 flex-col gap-0.5" onClick={() => resolveCoaching("offense")}>
              <span className="text-base font-semibold">Offensive Coaching</span>
              <span className="text-xs opacity-90">{offenseTeam}</span>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-16 flex-col gap-0.5"
              onClick={() => resolveCoaching("defense")}
            >
              <span className="text-base font-semibold">Defensive Coaching</span>
              <span className="text-xs opacity-90">{defenseTeam}</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
