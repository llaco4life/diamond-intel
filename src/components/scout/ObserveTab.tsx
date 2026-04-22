import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMyInning } from "@/hooks/useMyInning";
import { useOfflineWriter } from "@/hooks/useOfflineWriter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InningStepper } from "./InningStepper";
import { TeamTagGrid } from "./TeamTagGrid";
import { ObservationList } from "./ObservationList";
import { getCategory, resolveAppliesTo } from "@/lib/scoutTags";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Side = "offense" | "defense";

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
  const [offenseTeam, setOffenseTeam] = useState<string>(awayTeam);
  const defenseTeam = useMemo(
    () => (offenseTeam === homeTeam ? awayTeam : homeTeam),
    [offenseTeam, homeTeam, awayTeam],
  );

  // Last category context (from a tag chip pick) — drives default side for the
  // Key Play and By-player segmented controls.
  const [lastContext, setLastContext] = useState<string | null>(null);

  // Coaching prompt state — pending tag awaiting offense/defense choice.
  const [pendingCoaching, setPendingCoaching] = useState<
    | { kind: "tag"; tag: string }
    | { kind: "keyPlay" }
    | { kind: "playerObs" }
    | null
  >(null);

  const [keyPlay, setKeyPlay] = useState("");
  const [keyPlaySide, setKeyPlaySide] = useState<Side>("offense");
  const [keyPlaySideTouched, setKeyPlaySideTouched] = useState(false);

  const [pJersey, setPJersey] = useState("");
  const [pTag, setPTag] = useState("");
  const [pNote, setPNote] = useState("");
  const [pTeam, setPTeam] = useState<string>(awayTeam);
  const [pTeamTouched, setPTeamTouched] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recent, setRecent] = useState<any[]>([]);

  // Derive default side from last category context.
  const defaultSideFromContext = useCallback((): Side => {
    if (!lastContext) return "offense";
    const cat = getCategory(lastContext);
    if (!cat) return "offense";
    if (cat.defaultAppliesTo === "defense") return "defense";
    return "offense";
  }, [lastContext]);

  // Auto-update segmented control defaults when context changes (until user touches it).
  useEffect(() => {
    if (!keyPlaySideTouched) setKeyPlaySide(defaultSideFromContext());
    if (!pSideTouched) setPSide(defaultSideFromContext());
  }, [defaultSideFromContext, keyPlaySideTouched, pSideTouched]);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("scout_observations")
      .select(
        "id, inning, is_team_level, jersey_number, tags, key_play, steal_it, offensive_team, applies_to_team, created_at",
      )
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

  const writeTag = async (tag: string, appliesTo: string) => {
    if (!user) return;
    const res = await write("scout_observations", {
      game_id: gameId,
      player_id: user.id,
      inning,
      is_team_level: true,
      tags: [tag],
      offensive_team: offenseTeam,
      applies_to_team: appliesTo,
    });
    if (res.ok) {
      toast.success(`${tag} · ${appliesTo}`);
      reload();
    } else {
      toast.warning(`${tag} (queued)`);
    }
  };

  const onPickTag = async (tag: string, categoryId: string) => {
    setLastContext(categoryId);
    const resolved = resolveAppliesTo(categoryId, offenseTeam, defenseTeam);
    if (resolved === null) {
      // Coaching → ask
      setPendingCoaching({ kind: "tag", tag });
      return;
    }
    await writeTag(tag, resolved);
  };

  const addKeyPlay = async () => {
    if (!user || !keyPlay.trim()) return;
    const appliesTo = keyPlaySide === "offense" ? offenseTeam : defenseTeam;
    const res = await write("scout_observations", {
      game_id: gameId,
      player_id: user.id,
      inning,
      is_team_level: true,
      tags: [],
      key_play: keyPlay.trim(),
      offensive_team: offenseTeam,
      applies_to_team: appliesTo,
    });
    if (res.ok) toast.success("Key play saved");
    else toast.warning("Saved offline");
    setKeyPlay("");
    setKeyPlaySideTouched(false);
    reload();
  };

  const addPlayerObs = async () => {
    if (!user || !pJersey.trim() || (!pTag.trim() && !pNote.trim())) {
      toast.error("Jersey + tag or note required");
      return;
    }
    const appliesTo = pSide === "offense" ? offenseTeam : defenseTeam;
    const res = await write("scout_observations", {
      game_id: gameId,
      player_id: user.id,
      inning,
      is_team_level: false,
      jersey_number: pJersey.trim(),
      tags: pTag.trim() ? [pTag.trim()] : [],
      key_play: pNote.trim() || null,
      offensive_team: offenseTeam,
      applies_to_team: appliesTo,
    });
    if (res.ok) toast.success(`#${pJersey} logged`);
    else toast.warning("Saved offline");
    setPJersey("");
    setPTag("");
    setPNote("");
    setPSideTouched(false);
    reload();
  };

  // Resolve pending coaching prompt with chosen side.
  const resolveCoaching = async (side: Side) => {
    const team = side === "offense" ? offenseTeam : defenseTeam;
    if (!pendingCoaching) return;
    if (pendingCoaching.kind === "tag") {
      await writeTag(pendingCoaching.tag, team);
    }
    setPendingCoaching(null);
  };

  return (
    <div className="space-y-4">
      {/* Context card: offense / defense */}
      <section className="rounded-xl border bg-card p-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              On offense
            </p>
            <div className="space-y-1.5">
              <Button
                type="button"
                variant={offenseTeam === awayTeam ? "default" : "outline"}
                onClick={() => setOffenseTeam(awayTeam)}
                className="h-10 w-full justify-start"
              >
                {awayTeam}
              </Button>
              <Button
                type="button"
                variant={offenseTeam === homeTeam ? "default" : "outline"}
                onClick={() => setOffenseTeam(homeTeam)}
                className="h-10 w-full justify-start"
              >
                {homeTeam}
              </Button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              On defense
            </p>
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{defenseTeam}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pitching & Defense tags apply here
              </p>
            </div>
          </div>
        </div>
      </section>

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
        <TeamTagGrid
          offenseTeam={offenseTeam}
          defenseTeam={defenseTeam}
          onPick={onPickTag}
        />
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
        <SideToggle
          label="This play was about"
          value={keyPlaySide}
          onChange={(v) => {
            setKeyPlaySide(v);
            setKeyPlaySideTouched(true);
          }}
          offenseTeam={offenseTeam}
          defenseTeam={defenseTeam}
          className="mt-2"
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
        <SideToggle
          label="This player is on"
          value={pSide}
          onChange={(v) => {
            setPSide(v);
            setPSideTouched(true);
          }}
          offenseTeam={offenseTeam}
          defenseTeam={defenseTeam}
          className="mt-2"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {pSide === "offense"
            ? `Logging jersey from ${offenseTeam} offense`
            : `Logging jersey from ${defenseTeam} defense`}
        </p>
        <Button onClick={addPlayerObs} className="mt-2 w-full">
          Log player
        </Button>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Recent observations</h3>
        <ObservationList rows={recent.slice(0, 10)} offenseTeam={offenseTeam} />
      </section>

      {/* Coaching prompt sheet */}
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
            <Button
              size="lg"
              className="h-16 flex-col gap-0.5"
              onClick={() => resolveCoaching("offense")}
            >
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

function SideToggle({
  label,
  value,
  onChange,
  offenseTeam,
  defenseTeam,
  className,
}: {
  label: string;
  value: Side;
  onChange: (v: Side) => void;
  offenseTeam: string;
  defenseTeam: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex overflow-hidden rounded-lg border">
        <button
          type="button"
          onClick={() => onChange("offense")}
          className={cn(
            "flex-1 px-3 py-1.5 text-xs font-medium",
            value === "offense"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground",
          )}
        >
          Offense: {offenseTeam}
        </button>
        <button
          type="button"
          onClick={() => onChange("defense")}
          className={cn(
            "flex-1 px-3 py-1.5 text-xs font-medium",
            value === "defense"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground",
          )}
        >
          Defense: {defenseTeam}
        </button>
      </div>
    </div>
  );
}
