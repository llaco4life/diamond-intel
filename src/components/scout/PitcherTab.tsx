import { useEffect, useState, useCallback, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineWriter } from "@/hooks/useOfflineWriter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useMyInning } from "@/hooks/useMyInning";
import { PITCHER_QUICK_TAGS } from "@/lib/scoutTags";
import { cn } from "@/lib/utils";

type TeamSide = "home" | "away";

interface Pitcher {
  id: string;
  jersey_number: string;
  name: string | null;
  notes: string | null;
  is_active: boolean;
  team_side: string | null;
  created_at: string;
}

interface PitcherObs {
  id: string;
  pitcher_id: string;
  inning: number;
  tags: string[];
  created_at: string;
}

export function PitcherTab({
  gameId,
  defaultInning,
  homeTeam,
  awayTeam,
}: {
  gameId: string;
  defaultInning: number;
  defenseTeam?: string;
  homeTeam: string;
  awayTeam: string;
}) {
  const { user } = useAuth();
  const [inning] = useMyInning(gameId, user?.id ?? null, defaultInning);
  const { write } = useOfflineWriter();
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  const [obs, setObs] = useState<PitcherObs[]>([]);
  const [addingForSide, setAddingForSide] = useState<TeamSide | null>(null);
  const [jersey, setJersey] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const reloadPitchers = useCallback(async () => {
    const { data } = await supabase
      .from("pitchers")
      .select("id, jersey_number, name, notes, is_active, team_side, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    setPitchers((data as Pitcher[]) ?? []);
  }, [gameId]);

  const reloadObs = useCallback(async () => {
    const { data } = await supabase
      .from("scout_observations")
      .select("id, pitcher_id, inning, tags, created_at")
      .eq("game_id", gameId)
      .not("pitcher_id", "is", null)
      .order("created_at", { ascending: true });
    const rows: PitcherObs[] = (data ?? []).map((r) => ({
      id: r.id as string,
      pitcher_id: r.pitcher_id as string,
      inning: r.inning as number,
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      created_at: r.created_at as string,
    }));
    setObs(rows);
  }, [gameId]);

  useEffect(() => {
    reloadPitchers();
    reloadObs();
    const channel = supabase
      .channel(`pitcher-tab-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pitchers", filter: `game_id=eq.${gameId}` },
        () => reloadPitchers(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scout_observations", filter: `game_id=eq.${gameId}` },
        () => reloadObs(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, reloadPitchers, reloadObs]);

  const obsByPitcher = useMemo(() => {
    const m = new Map<string, PitcherObs[]>();
    for (const r of obs) {
      const list = m.get(r.pitcher_id) ?? [];
      list.push(r);
      m.set(r.pitcher_id, list);
    }
    return m;
  }, [obs]);

  const teamNameFor = (side: TeamSide) => (side === "home" ? homeTeam : awayTeam);

  const openAdd = (side: TeamSide) => {
    setAddingForSide(side);
    setJersey("");
    setName("");
    setNotes("");
  };

  const cancelAdd = () => setAddingForSide(null);

  const deactivateOthersOnSide = async (side: TeamSide) => {
    await supabase
      .from("pitchers")
      .update({ is_active: false })
      .eq("game_id", gameId)
      .eq("team_side", side)
      .eq("is_active", true);
  };

  const submitAdd = async () => {
    if (!addingForSide) return;
    if (!jersey.trim()) {
      toast.error("Jersey number required");
      return;
    }
    const side = addingForSide;
    await deactivateOthersOnSide(side);
    const { error } = await supabase.from("pitchers").insert({
      game_id: gameId,
      jersey_number: jersey.trim(),
      name: name.trim() || null,
      notes: notes.trim() || null,
      team_side: side,
      is_active: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Subbed in #${jersey.trim()} (${teamNameFor(side)})`);
    setAddingForSide(null);
    reloadPitchers();
  };

  const makeActive = async (p: Pitcher) => {
    if (!p.team_side) return;
    await supabase
      .from("pitchers")
      .update({ is_active: false })
      .eq("game_id", gameId)
      .eq("team_side", p.team_side)
      .eq("is_active", true);
    await supabase.from("pitchers").update({ is_active: true }).eq("id", p.id);
    toast.success(`Active: #${p.jersey_number}`);
    reloadPitchers();
  };

  const assignTeam = async (p: Pitcher, side: TeamSide) => {
    await supabase.from("pitchers").update({ team_side: side }).eq("id", p.id);
    toast.success(`Assigned to ${teamNameFor(side)}`);
    reloadPitchers();
  };

  const deleteObs = async (id: string) => {
    const { error } = await supabase.from("scout_observations").delete().eq("id", id);
    if (error) {
      toast.error("Could not undo");
      return;
    }
    reloadObs();
  };

  const quickTag = async (p: Pitcher, tag: string) => {
    if (!user) return;
    const appliesTo = p.team_side === "home" ? homeTeam : p.team_side === "away" ? awayTeam : null;
    const res = await write("scout_observations", {
      game_id: gameId,
      player_id: user.id,
      pitcher_id: p.id,
      inning,
      is_team_level: true,
      tags: [tag],
      applies_to_team: appliesTo,
    });
    if (res.ok) {
      const insertedId = res.id;
      toast.success(`${tag} · #${p.jersey_number} · Inning ${inning}`, {
        action: insertedId ? { label: "Undo", onClick: () => deleteObs(insertedId) } : undefined,
      });
      reloadObs();
    } else {
      toast.warning(`${tag} (queued)`);
    }
  };

  const homePitchers = pitchers.filter((p) => p.team_side === "home");
  const awayPitchers = pitchers.filter((p) => p.team_side === "away");
  const legacyPitchers = pitchers.filter((p) => p.team_side == null);

  return (
    <div className="space-y-6">
      <TeamSection
        side="away"
        teamName={awayTeam}
        pitchers={awayPitchers}
        obsByPitcher={obsByPitcher}
        currentInning={inning}
        addingOpen={addingForSide === "away"}
        onOpenAdd={() => openAdd("away")}
        onCancelAdd={cancelAdd}
        onSubmitAdd={submitAdd}
        onMakeActive={makeActive}
        onQuickTag={quickTag}
        jersey={jersey}
        setJersey={setJersey}
        name={name}
        setName={setName}
        notes={notes}
        setNotes={setNotes}
      />
      <TeamSection
        side="home"
        teamName={homeTeam}
        pitchers={homePitchers}
        obsByPitcher={obsByPitcher}
        currentInning={inning}
        addingOpen={addingForSide === "home"}
        onOpenAdd={() => openAdd("home")}
        onCancelAdd={cancelAdd}
        onSubmitAdd={submitAdd}
        onMakeActive={makeActive}
        onQuickTag={quickTag}
        jersey={jersey}
        setJersey={setJersey}
        name={name}
        setName={setName}
        notes={notes}
        setNotes={setNotes}
      />

      {legacyPitchers.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Legacy (no team)</h3>
          <div className="space-y-2">
            {legacyPitchers.map((p) => {
              const pObs = obsByPitcher.get(p.id) ?? [];
              return (
                <div key={p.id} className="rounded-xl border bg-card p-4">
                  <p className="font-semibold">
                    #{p.jersey_number}
                    {p.name && <span className="ml-1 text-muted-foreground">— {p.name}</span>}
                  </p>
                  {pObs.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">{pObs.length} tags logged</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => assignTeam(p, "away")}>
                      Assign to {awayTeam}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => assignTeam(p, "home")}>
                      Assign to {homeTeam}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function TeamSection({
  side,
  teamName,
  pitchers,
  obsByPitcher,
  currentInning,
  addingOpen,
  onOpenAdd,
  onCancelAdd,
  onSubmitAdd,
  onMakeActive,
  onQuickTag,
  jersey,
  setJersey,
  name,
  setName,
  notes,
  setNotes,
}: {
  side: TeamSide;
  teamName: string;
  pitchers: Pitcher[];
  obsByPitcher: Map<string, PitcherObs[]>;
  currentInning: number;
  addingOpen: boolean;
  onOpenAdd: () => void;
  onCancelAdd: () => void;
  onSubmitAdd: () => void;
  onMakeActive: (p: Pitcher) => void;
  onQuickTag: (p: Pitcher, tag: string) => void;
  jersey: string;
  setJersey: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
}) {
  const active = pitchers.find((p) => p.is_active);
  const earlier = pitchers.filter((p) => !p.is_active);
  const sideLabel = side === "home" ? "Home" : "Away";

  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{teamName}</h3>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {sideLabel} pitchers
          </p>
        </div>
        <Button size="sm" onClick={addingOpen ? onCancelAdd : onOpenAdd}>
          {addingOpen ? "Cancel" : "+ Add / Sub Pitcher"}
        </Button>
      </header>

      {addingOpen && (
        <div className="space-y-3 border-b border-border bg-background/60 p-4">
          <p className="text-xs text-muted-foreground">
            Adding for <span className="font-medium text-foreground">{teamName}</span>. Saving will
            sub them in as the active pitcher; the previous active {teamName} pitcher moves to
            Earlier Pitchers.
          </p>
          <div>
            <Label htmlFor={`pj-${side}`}>Jersey #</Label>
            <Input
              id={`pj-${side}`}
              value={jersey}
              onChange={(e) => setJersey(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`pn-${side}`}>Name (optional)</Label>
            <Input
              id={`pn-${side}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`pno-${side}`}>Notes (optional)</Label>
            <Textarea
              id={`pno-${side}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={onSubmitAdd} className="w-full">
            Sub in pitcher
          </Button>
        </div>
      )}

      <div className="space-y-3 p-4">
        {active ? (
          <ActivePitcherCard
            pitcher={active}
            pObs={obsByPitcher.get(active.id) ?? []}
            currentInning={currentInning}
            onTag={(t) => onQuickTag(active, t)}
          />
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            No active {teamName} pitcher. Tap “+ Add / Sub Pitcher”.
          </div>
        )}

        {earlier.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-background/40 px-3 py-2 text-sm font-medium [&[data-state=open]>svg]:rotate-180">
              <span>Earlier Pitchers ({earlier.length})</span>
              <ChevronDown className="h-4 w-4 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {earlier.map((p) => (
                <EarlierPitcherRow
                  key={p.id}
                  pitcher={p}
                  pObs={obsByPitcher.get(p.id) ?? []}
                  onMakeActive={() => onMakeActive(p)}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </section>
  );
}

function summarizeCounts(pObs: PitcherObs[]): { tag: string; count: number; lastInning: number }[] {
  const m = new Map<string, { count: number; lastInning: number }>();
  for (const r of pObs) {
    for (const t of r.tags) {
      const cur = m.get(t) ?? { count: 0, lastInning: r.inning };
      cur.count += 1;
      if (r.inning > cur.lastInning) cur.lastInning = r.inning;
      m.set(t, cur);
    }
  }
  return Array.from(m.entries())
    .map(([tag, v]) => ({ tag, count: v.count, lastInning: v.lastInning }))
    .sort((a, b) => b.count - a.count);
}

function firstSeenInning(pObs: PitcherObs[]): number | null {
  if (pObs.length === 0) return null;
  return pObs.reduce((min, r) => (r.inning < min ? r.inning : min), pObs[0].inning);
}

function ActivePitcherCard({
  pitcher,
  pObs,
  currentInning,
  onTag,
}: {
  pitcher: Pitcher;
  pObs: PitcherObs[];
  currentInning: number;
  onTag: (tag: string) => void;
}) {
  const counts = summarizeCounts(pObs);
  const tagCount = (tag: string) => counts.find((c) => c.tag === tag)?.count ?? 0;
  const firstSeen = firstSeenInning(pObs);

  return (
    <div className="rounded-xl border-2 border-primary/40 bg-primary-soft/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
              ● Active
            </span>
            <p className="font-semibold">
              #{pitcher.jersey_number}
              {pitcher.name && (
                <span className="ml-1 text-muted-foreground">— {pitcher.name}</span>
              )}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {firstSeen !== null ? `First seen Inning ${firstSeen} · ` : ""}Tagging Inning{" "}
            {currentInning}
          </p>
          {pitcher.notes && <p className="mt-1 text-xs text-muted-foreground">{pitcher.notes}</p>}
        </div>
      </div>

      {counts.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {counts.slice(0, 6).map((c) => (
            <li key={c.tag}>
              <span className="font-medium text-foreground">{c.tag}</span> ×{c.count}
              <span className="ml-1 opacity-70">(last I{c.lastInning})</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {PITCHER_QUICK_TAGS.map((t) => {
          const count = tagCount(t);
          return (
            <button
              key={t}
              onClick={() => onTag(t)}
              className={cn(
                "min-h-11 rounded-full border border-primary/30 bg-background px-3 text-sm font-medium text-primary transition active:scale-95 hover:bg-primary-soft",
              )}
            >
              {t}
              {count > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EarlierPitcherRow({
  pitcher,
  pObs,
  onMakeActive,
}: {
  pitcher: Pitcher;
  pObs: PitcherObs[];
  onMakeActive: () => void;
}) {
  const counts = summarizeCounts(pObs);
  const firstSeen = firstSeenInning(pObs);

  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            #{pitcher.jersey_number}
            {pitcher.name && <span className="ml-1 text-muted-foreground">— {pitcher.name}</span>}
          </p>
          {firstSeen !== null && (
            <p className="text-[11px] text-muted-foreground">First seen Inning {firstSeen}</p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onMakeActive}>
          Make Active
        </Button>
      </div>
      {counts.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {counts.map((c) => (
            <li key={c.tag}>
              <span className="font-medium text-foreground">{c.tag}</span> ×{c.count}
              <span className="ml-1 opacity-70">(last I{c.lastInning})</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs italic text-muted-foreground">No tags logged.</p>
      )}
    </div>
  );
}
