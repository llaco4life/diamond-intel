import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LineupSlot } from "@/hooks/usePitchLineup";

interface EditProps {
  mode: "edit";
  open: boolean;
  slot: LineupSlot;
  onClose: () => void;
  onSave: (patch: { jersey: string; name?: string; note?: string }) => void;
}

interface SubProps {
  mode: "sub";
  open: boolean;
  slot: LineupSlot;
  inning: number;
  onClose: () => void;
  onSave: (data: { jersey: string; name?: string; inning: number; note?: string }) => void;
}

type Props = EditProps | SubProps;

export function BatterEditDialog(props: Props) {
  const { open, onClose, slot } = props;
  const [jersey, setJersey] = useState(slot.jersey);
  const [name, setName] = useState(slot.name ?? "");
  const [note, setNote] = useState("");
  const [inning, setInning] = useState(props.mode === "sub" ? props.inning : 1);

  useEffect(() => {
    if (!open) return;
    if (props.mode === "edit") {
      setJersey(slot.jersey);
      setName(slot.name ?? "");
      setNote(slot.note ?? "");
    } else {
      setJersey("");
      setName("");
      setNote("");
      setInning(props.inning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isSub = props.mode === "sub";
  const title = isSub ? `Substitute for #${slot.jersey}${slot.name ? ` ${slot.name}` : ""}` : "Edit batter";

  const submit = () => {
    if (!jersey.trim()) return;
    if (props.mode === "edit") {
      props.onSave({ jersey: jersey.trim(), name: name.trim(), note: note.trim() });
    } else {
      props.onSave({
        jersey: jersey.trim(),
        name: name.trim() || undefined,
        inning: Number(inning) || 1,
        note: note.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <div>
              <Label className="text-[10px] uppercase">Jersey</Label>
              <Input
                value={jersey}
                onChange={(e) => setJersey(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                inputMode="numeric"
                className="text-center font-bold"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Name (optional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riley" />
            </div>
          </div>

          {isSub && (
            <div>
              <Label className="text-[10px] uppercase">Inning</Label>
              <Input
                value={String(inning)}
                onChange={(e) => setInning(Number(e.target.value.replace(/[^0-9]/g, "")) || 1)}
                inputMode="numeric"
                className="w-20 text-center font-bold"
              />
            </div>
          )}

          <div>
            <Label className="text-[10px] uppercase">{isSub ? "Reason / note" : "Note"} (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isSub ? "e.g. pinch hitter, injury" : "e.g. lefty, slap hitter"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!jersey.trim()}>
            {isSub ? "Sub in" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
