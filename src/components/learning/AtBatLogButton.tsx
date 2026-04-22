import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
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

interface AtBat {
  id: string;
  inning: number;
  confidence_level: number;
  execution: number;
  mental_focus: number;
  pitches_seen: string | null;
  notes: string | null;
  created_at: string;
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

export function AtBatLogButton({
  gameId,
  inning,
}: {
  gameId: string;
  inning: number;
}) {
  const { user } = useAuth();
  const { write } = useOfflineWriter();
  const [open, setOpen] = useState(false);
  const [confidence, setConfidence] = useState(3);
  const [execution, setExecution] = useState(3);
  const [focus, setFocus] = useState(3);
  const [pitches, setPitches] = useState("");
  const [notes, setNotes] = useState("");
  const [recent, setRecent] = useState<AtBat[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("at_bats")
      .select("id, inning, confidence_level, execution, mental_focus, pitches_seen, notes, created_at")
      .eq("game_id", gameId)
      .eq("player_id", user.id)
      .order("created_at", { ascending: false });
    setRecent((data as AtBat[]) ?? []);
  }, [gameId, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const reset = () => {
    setConfidence(3);
    setExecution(3);
    setFocus(3);
    setPitches("");
    setNotes("");
  };

  const save = async () => {
    if (!user) return;
    setSubmitting(true);
    const res = await write("at_bats", {
      game_id: gameId,
      player_id: user.id,
      inning,
      confidence_level: confidence,
      execution,
      mental_focus: focus,
      pitches_seen: pitches.trim() || null,
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
            <Scale label="Confidence" value={confidence} onChange={setConfidence} />
            <Scale label="Execution" value={execution} onChange={setExecution} />
            <Scale label="Mental focus" value={focus} onChange={setFocus} />
            <div>
              <Label htmlFor="pitches">Pitches seen</Label>
              <Input
                id="pitches"
                value={pitches}
                onChange={(e) => setPitches(e.target.value)}
                placeholder="e.g. FB, CH, FB, CB"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="abnotes">Notes</Label>
              <Textarea
                id="abnotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What worked, what didn't?"
                className="mt-1.5 min-h-20"
              />
            </div>
            <Button onClick={save} disabled={submitting} size="lg" className="w-full">
              {submitting ? "Saving…" : "Save At-Bat"}
            </Button>

            {recent.length > 0 && (
              <section className="border-t pt-3">
                <h3 className="mb-2 text-sm font-semibold">This session ({recent.length})</h3>
                <ul className="space-y-2">
                  {recent.map((a) => (
                    <li key={a.id} className="rounded-xl border bg-card p-3 text-sm">
                      <p className="text-xs text-muted-foreground">Inning {a.inning}</p>
                      <p className="mt-0.5">
                        Conf <span className="font-semibold">{a.confidence_level}</span> · Exec{" "}
                        <span className="font-semibold">{a.execution}</span> · Focus{" "}
                        <span className="font-semibold">{a.mental_focus}</span>
                      </p>
                      {a.pitches_seen && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{a.pitches_seen}</p>
                      )}
                      {a.notes && <p className="mt-0.5 italic">"{a.notes}"</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
