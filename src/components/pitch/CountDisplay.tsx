interface Props {
  balls: number;
  strikes: number;
  paPitches: number;
  totalPitches: number;
}

export function CountDisplay({ balls, strikes, paPitches, totalPitches }: Props) {
  const dots = (filled: number, total: number) =>
    Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        className={`h-2.5 w-2.5 rounded-full ${i < filled ? "bg-primary" : "bg-muted"}`}
      />
    ));
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-muted-foreground">B</span>
          <div className="flex gap-1">{dots(balls, 4)}</div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-muted-foreground">S</span>
          <div className="flex gap-1">{dots(strikes, 3)}</div>
        </div>
      </div>
      <div className="font-mono text-xs text-muted-foreground tabular-nums">
        PA {paPitches} · Tot {totalPitches}
      </div>
    </div>
  );
}
