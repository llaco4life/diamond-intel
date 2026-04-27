import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { PitchCodeMapRow, PitchTypeRow } from "@/lib/pitchIntel/types";

interface Props {
  codeMap: PitchCodeMapRow[];
  pitchTypes: PitchTypeRow[];
  value: string;
  onChange: (v: string) => void;
}

export function CodeEntry({ codeMap, pitchTypes, value, onChange }: Props) {
  const [focused, setFocused] = useState(false);
  const map = codeMap.find((m) => m.numeric_code === value.trim());
  const type = map ? pitchTypes.find((p) => p.id === map.pitch_type_id) : null;

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="code"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 4))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="h-12 w-24 text-center text-lg font-mono font-semibold"
      />
      <div className="flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-sm">
        {value.trim() === "" ? (
          <span className="text-muted-foreground">enter pitcher's code</span>
        ) : type ? (
          <span className="font-medium">{type.label}</span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400">unknown code · pitch logged anyway</span>
        )}
      </div>
    </div>
  );
}
