import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PitchEntryRow, PitchResult, PitchTypeRow } from "@/lib/pitchIntel/types";
import { ZONE_NUMBERS, type BatterHand, zoneLabel } from "@/lib/pitchIntel/pitchZones";
import { cn } from "@/lib/utils";

const RESULTS: { value: PitchResult; label: string }[] = [
  { value: "ball", label: "Ball" },
  { value: "called_strike", label: "Called Strike" },
  { value: "swinging_strike", label: "Swinging Strike" },
  { value: "foul", label: "Foul" },
  { value: "foul_tip_caught", label: "Foul Tip K" },
  { value: "caught_foul", label: "Caught Foul" },
  { value: "in_play", label: "In Play" },
  { value: "hbp", label: "HBP" },
];

interface Props {
  open: boolean;
  pitch: PitchEntryRow | null;
  pitchTypes: PitchTypeRow[];
  onClose: () => void;
  onSaved: () => void;
}

export function PitchEntryEditDialog({ open, pitch, pitchTypes, onClose, onSaved }: Props) {
  const [pitchTypeId, setPitchTypeId] = useState<string | null>(null);
  const [result, setResult] = useState<PitchResult>("ball");
  const [location, setLocation] = useState<number | null>(null);
  const [hand, setHand] = useState<BatterHand>("R");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pitch) return;
    setPitchTypeId(pitch.pitch_type_id);
    setResult(pitch.result);
    setLocation(pitch.pitch_location);
    setHand((pitch.batter_hand ?? "R") as BatterHand);
  }, [pitch]);

  if (!pitch) return null;

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("pitch_entries")
      .update({
        pitch_type_id: pitchTypeId,
        result,
        pitch_location: location,
        batter_hand: hand,
      })
      .eq("id", pitch.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pitch updated");
    onSaved();
    onClose();
  };

  const remove = async () => {
    if (!confirm("Delete this pitch? This cannot be undone.")) return;
    setBusy(true);
    const { error } = await supabase.from("pitch_entries").delete().eq("id", pitch.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pitch deleted");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit pitch</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Pitch type
            </label>
            <Select
              value={pitchTypeId ?? "__none"}
              onValueChange={(v) => setPitchTypeId(v === "__none" ? null : v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— none —</SelectItem>
                {pitchTypes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Result
            </label>
            <Select value={result} onValueChange={(v) => setResult(v as PitchResult)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESULTS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Note: changing result does not recompute the rest of the at-bat's count.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Batter hand
            </label>
            <div className="flex gap-1.5">
              {(["R", "L", "S"] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHand(h)}
                  className={cn(
                    "h-9 flex-1 rounded-md border text-sm font-bold",
                    hand === h
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary",
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Location</label>
              {location != null && (
                <button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setLocation(null)}>
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {ZONE_NUMBERS.map((z) => {
                const selected = location === z;
                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setLocation(selected ? null : z)}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-lg border text-center",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary",
                    )}
                  >
                    <span className="text-xl font-black tabular-nums leading-none">{z}</span>
                    <span className={cn("mt-0.5 text-[9px]", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {zoneLabel(z, hand)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          <Button variant="destructive" onClick={remove} disabled={busy}>Delete</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
