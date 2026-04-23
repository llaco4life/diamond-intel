import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TAG_CATEGORIES } from "@/lib/scoutTags";
import { cn } from "@/lib/utils";

export function TeamTagGrid({
  offenseTeam,
  defenseTeam,
  onPick,
  tagCounts,
  justAddedTag,
  pitchingDisabled,
  pitchingDisabledReason,
}: {
  offenseTeam: string;
  defenseTeam: string;
  onPick: (tag: string, categoryId: string) => void;
  tagCounts?: Record<string, number>;
  justAddedTag?: string | null;
  pitchingDisabled?: boolean;
  pitchingDisabledReason?: string;
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
        const disabled = cat.id === "pitching" && !!pitchingDisabled;
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
              <div className="border-t border-border bg-background/40 p-3">
                {disabled && (
                  <p className="mb-2 text-xs italic text-muted-foreground">
                    {pitchingDisabledReason ?? "Pick a pitcher first"}
                  </p>
                )}
                <div className={cn("flex flex-wrap gap-2", disabled && "opacity-50")}>
                  {cat.tags.map((tag) => {
                    const count = tagCounts?.[tag] ?? 0;
                    const flash = justAddedTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && onPick(tag, cat.id)}
                        className={cn(
                          "min-h-11 rounded-full border px-4 text-sm font-medium transition-all",
                          "border-primary/30 bg-primary-soft text-primary",
                          !disabled && "active:scale-95",
                          disabled && "cursor-not-allowed",
                          flash && "ring-2 ring-success bg-success/20 text-success-foreground",
                        )}
                      >
                        {tag}
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
            )}
          </div>
        );
      })}
    </div>
  );
}
