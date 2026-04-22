import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TAG_CATEGORIES } from "@/lib/scoutTags";
import { cn } from "@/lib/utils";

export function TeamTagGrid({ onPick }: { onPick: (tag: string) => void }) {
  const [open, setOpen] = useState<string | null>("pitching");

  return (
    <div className="space-y-2">
      {TAG_CATEGORIES.map((cat) => {
        const isOpen = open === cat.id;
        return (
          <div key={cat.id} className="rounded-xl border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : cat.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-semibold">{cat.label}</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
              />
            </button>
            {isOpen && (
              <div className="flex flex-wrap gap-2 border-t border-border bg-background/40 p-3">
                {cat.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onPick(tag)}
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
