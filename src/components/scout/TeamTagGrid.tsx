import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TAG_CATEGORIES } from "@/lib/scoutTags";
import { cn } from "@/lib/utils";

export function TeamTagGrid({
  offenseTeam,
  defenseTeam,
  onPick,
}: {
  offenseTeam: string;
  defenseTeam: string;
  onPick: (tag: string, categoryId: string) => void;
}) {
  const [open, setOpen] = useState<string | null>("pitching");

  return (
    <div className="space-y-2">
      {TAG_CATEGORIES.map((cat) => {
        const isOpen = open === cat.id;
        const evaluating =
          cat.defaultAppliesTo === "offense"
            ? offenseTeam
            : cat.defaultAppliesTo === "defense"
              ? defenseTeam
              : null;
        return (
          <div key={cat.id} className="rounded-xl border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : cat.id)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-semibold">{cat.label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {evaluating ? `evaluating ${evaluating}` : "choose when tagging"}
                </span>
              </div>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")}
              />
            </button>
            {isOpen && (
              <div className="flex flex-wrap gap-2 border-t border-border bg-background/40 p-3">
                {cat.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onPick(tag, cat.id)}
                    className="min-h-11 rounded-full border border-primary/30 bg-primary-soft px-4 text-sm font-medium text-primary active:scale-95 transition-transform"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
