import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export interface BatterRef {
  team: string;
  number: string;
}

interface Props {
  team: string;
  lineup: string[]; // jersey numbers
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: (jersey: string) => void;
  onRemove: (i: number) => void;
}

export function LineupStrip({ team, lineup, activeIndex, onSelect, onAdd, onRemove }: Props) {
  const [adding, setAdding] = useState("");
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Lineup · {team}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {lineup.map((j, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`group relative h-9 min-w-[2.75rem] rounded-lg px-2 text-sm font-bold ${
              i === activeIndex
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            }`}
          >
            #{j}
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          </button>
        ))}
        <div className="flex items-center gap-1">
          <Input
            value={adding}
            onChange={(e) => setAdding(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            placeholder="#"
            className="h-9 w-14 text-center text-sm font-bold"
            inputMode="numeric"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-9 p-0"
            onClick={() => {
              if (!adding.trim()) return;
              onAdd(adding.trim());
              setAdding("");
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
