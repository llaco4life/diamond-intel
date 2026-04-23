import { Sparkles, Sprout, Circle } from "lucide-react";
import { tagsForFocus, type FocusTag, type FocusTagTone } from "@/lib/learningFocusTags";

/**
 * Renders one card per selected focus, with its 4–6 self-evaluation tags.
 * Tone styling is intentionally developmental — growth tags use a soft accent
 * (not destructive / red) so the picker reads as coaching, not failure.
 */

const toneStyles: Record<
  FocusTagTone,
  { base: string; flash: string; icon: typeof Sparkles }
> = {
  positive: {
    base: "border-primary/40 bg-primary-soft/40 text-foreground hover:bg-primary-soft/70",
    flash: "ring-2 ring-primary scale-[1.03]",
    icon: Sparkles,
  },
  growth: {
    // Soft amber-ish via warning token — coaching cue, not blame.
    base: "border-warning/40 bg-warning/10 text-foreground hover:bg-warning/20",
    flash: "ring-2 ring-warning scale-[1.03]",
    icon: Sprout,
  },
  neutral: {
    base: "border-border bg-card hover:bg-muted",
    flash: "ring-2 ring-foreground/40 scale-[1.03]",
    icon: Circle,
  },
};

export function FocusTagPicker({
  focuses,
  tagCounts,
  justAddedTag,
  onPick,
}: {
  focuses: string[];
  tagCounts: Record<string, number>;
  justAddedTag: string | null;
  onPick: (tag: string) => void;
}) {
  if (focuses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No focus picked yet. Head back to Prep to pick 1–2 focus areas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {focuses.map((focus) => {
        const tags = tagsForFocus(focus);
        return (
          <section key={focus} className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold">{focus}</h4>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Tap what you noticed
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagChip
                  key={tag.label}
                  tag={tag}
                  count={tagCounts[tag.label] ?? 0}
                  flash={justAddedTag === tag.label}
                  onPick={onPick}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TagChip({
  tag,
  count,
  flash,
  onPick,
}: {
  tag: FocusTag;
  count: number;
  flash: boolean;
  onPick: (tag: string) => void;
}) {
  const style = toneStyles[tag.tone];
  const Icon = style.icon;
  return (
    <button
      type="button"
      onClick={() => onPick(tag.label)}
      className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${style.base} ${flash ? style.flash : ""}`}
    >
      <Icon className="h-3.5 w-3.5 opacity-70" />
      <span>{tag.label}</span>
      {count > 0 && (
        <span className="ml-1 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
