import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AbResult } from "@/lib/pitchIntel/types";

interface Props {
  open: boolean;
  suggested: AbResult | null;
  onPick: (r: AbResult) => void;
  onClose: () => void;
}

const ALL: AbResult[] = ["K", "BB", "HBP", "1B", "2B", "3B", "HR", "GO", "FO", "LO", "PO", "SF", "E"];

export function AbResultPicker({ open, suggested, onPick, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm at-bat result</DialogTitle>
        </DialogHeader>
        {suggested && (
          <Button onClick={() => onPick(suggested)} className="h-14 text-base font-bold">
            {suggested}
          </Button>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          {ALL.filter((r) => r !== suggested).map((r) => (
            <Button key={r} variant="outline" size="sm" onClick={() => onPick(r)}>
              {r}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
