import { useEffect, useState, useCallback } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineWriter } from "@/hooks/useOfflineWriter";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PITCH_TYPES,
  type PitchCounts,
  type PitchSlug,
  nonZeroPitchCounts,
  pitchLabel,
} from "@/lib/pitchTypes";

interface AtBat {
  id: string;
  inning: number;
  confidence_level: number;
  execution: number;
  mental_focus: number;
  pitches_seen: string | null;
  notes: string | null;
  created_at: string;
  batter_number: string | null;
  batter_team: "my_team" | "opponent" | null;
  pitch_counts: PitchCounts | null;
}

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="mt-1.5 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-semibold",
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function teamLabel(
  team: "my_team" | "opponent" | null,
  homeTeam: string,
  awayTeam: string,
): string | null {
  if (team === "my_team") return homeTeam;
  if (team === "opponent") return awayTeam;
  return null;
}

export function AtBatLogButton({
  gameId,
  inning,
  homeTeam,
  awayTeam,
}: {
  gameId: string;
  inning: number;
  homeTeam: string;
  awayTeam: string;
}) {
  const { user } = useAuth();
  const { write } = useOfflineWriter();
  const [open, setOpen] = useState(false);
  const [batterNumber, setBatterNumber] = useState("");
  const [batterTeam, setBatterTeam] = useState<"my_team" | "opponent" | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [execution, setExecution] = useState(3);
  const [focus, setFocus] = useState(3);
  const [pitchCounts, setPitchCounts] = useState<PitchCounts>({});
  const [notes, setNotes] = useState("");
  const [recent, setRecent] = useState<AtBat[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("at_bats")
      .select(
        "id, inning, confidence_level, execution, mental_focus, pitches_seen, notes, created_at, batter_number, batter_team, pitch_counts",
      )
      .eq("game_id", gameId)
      .eq("player_id", user.id)
      .order("created_at", { ascending: false });
    setRecent((data as unknown as AtBat[]) ?? []);
  }, [gameId, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const reset = () => {
    setBatterNumber("");
    setBatterTeam(null);
    setConfidence(3);
    setExecution(3);
    setFocus(3);
    setPitchCounts({});
    setNotes("");
  };

  const bumpPitch = (slug: PitchSlug, delta: number) => {
    setPitchCounts((prev) => {
      const next = { ...prev };
      const cur = next[slug] ?? 0;
      const v = Math.max(0, cur + delta);
      if (v === 0) delete next[slug];
      else next[slug] = v;
      return next;
    });
  };

  const canSave = batterNumber.trim() !== "" && batterTeam !== null && !submitting;

  const save = async () => {
    if (!user) return;
    if (batterNumber.trim() === "" || batterTeam === null) {
      toast.error("Batter # and Team are required");
      return;
    }
    setSubmitting(true);
    const res = await write("at_bats", {
      game_id: gameId,
      player_id: user.id,
      inning,
      confidence_level: confidence,
      execution,
      mental_focus: focus,
      batter_number: batterNumber.trim(),
      batter_team: batterTeam,
      pitch_counts: nonZeroPitchCounts(pitchCounts),
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (res.ok) toast.success("At-bat logged");
    else toast.warning("Saved offline");
    reset();
    setOpen(false);
    reload();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-20 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-elevated active:scale-95 transition-transform"
        aria-label="Log at-bat"
      >
        <Plus className="h-5 w-5" />
        Log At-Bat
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Log At-Bat (Inning {inning})</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="batter-num" className="text-sm">
                  Batter #
                </Label>
                <Input
                  id="batter-num"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={batterNumber}
                  onChange={(e) => setBatterNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 12"
                  className="mt-1.5 h-11"
                />
              </div>
              <div>
                <Label className="text-sm">Team</Label>
                <div className="mt-1.5 flex gap-1.5">
                  {(["my_team", "opponent"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBatterTeam(t)}
                      className={cn(
                        "flex h-11 flex-1 items-center justify-center rounded-lg border px-2 text-xs font-semibold truncate",
                        batterTeam === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {t === "my_team" ? homeTeam : awayTeam}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Scale label="Confidence" value={confidence} onChange={setConfidence} />
            <Scale label="Execution" value={execution} onChange={setExecution} />
            <Scale label="Mental focus" value={focus} onChange={setFocus} />

            <div>
              <Label className="text-sm">Pitches seen</Label>
              <ul className="mt-1.5 space-y-1.5">
                {PITCH_TYPES.map((p) => {
                  const count = pitchCounts[p.slug] ?? 0;
                  return (
                    <li
                      key={p.slug}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-1.5",
                        count > 0 ? "border-primary/50 bg-primary/5" : "border-border bg-background",
                      )}
                    >
                      <span className="flex-1 text-sm font-medium">{p.label}</span>
                      <button
                        type="button"
                        onClick={() => bumpPitch(p.slug, -1)}
                        disabled={count === 0}
                        className="flex h-11 w-11 items-center justify-center rounded-md border bg-background text-muted-foreground disabled:opacity-40"
                        aria-label={`Decrease ${p.label}`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-7 text-center text-base font-semibold tabular-nums">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => bumpPitch(p.slug, 1)}
                        className="flex h-11 w-11 items-center justify-center rounded-md border bg-background"
                        aria-label={`Increase ${p.label}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <Label htmlFor="abnotes">Notes</Label>
              <Textarea
                id="abnotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pitch sequence, location, tendencies…"
                className="mt-1.5 min-h-20"
              />
            </div>

            <Button onClick={save} disabled={!canSave} size="lg" className="w-full">
              {submitting ? "Saving…" : "Save At-Bat"}
            </Button>

            {recent.length > 0 && (
              <section className="border-t pt-3">
                <h3 className="mb-2 text-sm font-semibold">This session ({recent.length})</h3>
                <ul className="space-y-2">
                  {recent.map((a) => {
                    const team = teamLabel(a.batter_team, homeTeam, awayTeam);
                    const counts = a.pitch_counts ?? {};
                    const countEntries = Object.entries(counts).filter(
                      ([, v]) => typeof v === "number" && v > 0,
                    );
                    return (
                      <li key={a.id} className="rounded-xl border bg-card p-3 text-sm">
                        <p className="text-xs text-muted-foreground">
                          Inning {a.inning}
                          {a.batter_number && ` · #${a.batter_number}`}
                          {team && ` · ${team}`}
                        </p>
                        <p className="mt-0.5">
                          Conf <span className="font-semibold">{a.confidence_level}</span> · Exec{" "}
                          <span className="font-semibold">{a.execution}</span> · Focus{" "}
                          <span className="font-semibold">{a.mental_focus}</span>
                        </p>
                        {countEntries.length > 0 ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {countEntries
                              .map(([slug, v]) => `${pitchLabel(slug)} ×${v}`)
                              .join(" · ")}
                          </p>
                        ) : (
                          a.pitches_seen && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{a.pitches_seen}</p>
                          )
                        )}
                        {a.notes && <p className="mt-0.5 italic">"{a.notes}"</p>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
