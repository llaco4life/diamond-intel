import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Download, Upload, Plus, Trash2 } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePitchTypes } from "@/hooks/usePitchTypes";
import { usePitchCodeMap } from "@/hooks/usePitchCodeMap";
import { downloadTemplate, parseImportFile, type ImportRow } from "@/lib/pitchIntel/codeTemplate";

interface PitcherOpt {
  id: string;
  jersey_number: string;
  name: string | null;
  game_id: string;
  home_team: string;
  away_team: string;
}

export const Route = createFileRoute("/pitch/codes")({
  component: PitchCodesRoute,
});

function PitchCodesRoute() {
  return (
    <ProtectedShell>
      <PitchCodes />
    </ProtectedShell>
  );
}

function PitchCodes() {
  const { org } = useAuth();
  const { types: pitchTypes } = usePitchTypes();
  const [pitchers, setPitchers] = useState<PitcherOpt[]>([]);
  const [pitcherId, setPitcherId] = useState<string>("");
  const { rows, refresh } = usePitchCodeMap(pitcherId);
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState("");
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!org) return;
    void (async () => {
      const { data } = await supabase
        .from("pitchers")
        .select("id,jersey_number,name,game_id,games:game_id(home_team,away_team,org_id)")
        .order("created_at", { ascending: false });
      const list = (data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((p: any) => p.games?.org_id === org.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) => ({
          id: p.id,
          jersey_number: p.jersey_number,
          name: p.name,
          game_id: p.game_id,
          home_team: p.games?.home_team ?? "",
          away_team: p.games?.away_team ?? "",
        }));
      // De-dupe by jersey + name (same pitcher across games)
      const seen = new Set<string>();
      const dedup = list.filter((p) => {
        const k = `${p.jersey_number}#${p.name ?? ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setPitchers(dedup);
      if (dedup.length > 0 && !pitcherId) setPitcherId(dedup[0].id);
    })();
  }, [org, pitcherId]);

  const addRow = async () => {
    if (!org || !pitcherId || !newCode.trim() || !newType) return;
    const { error } = await supabase.from("pitch_code_map").upsert(
      { org_id: org.id, pitcher_id: pitcherId, numeric_code: newCode.trim(), pitch_type_id: newType },
      { onConflict: "pitcher_id,numeric_code" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewCode("");
    setNewType("");
    void refresh();
  };

  const updateRow = async (id: string, pitchTypeId: string) => {
    await supabase.from("pitch_code_map").update({ pitch_type_id: pitchTypeId }).eq("id", id);
    void refresh();
  };

  const deleteRow = async (id: string) => {
    await supabase.from("pitch_code_map").delete().eq("id", id);
    void refresh();
  };

  const handleFile = async (file: File) => {
    const preview = await parseImportFile(file, pitchTypes);
    setImportPreview(preview);
  };

  const applyImport = async () => {
    if (!org || !pitcherId || !importPreview) return;
    const valid = importPreview.filter((r) => !r.invalid && r.pitch_type_id);
    if (valid.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    const payload = valid.map((r) => ({
      org_id: org.id,
      pitcher_id: pitcherId,
      numeric_code: r.numeric_code,
      pitch_type_id: r.pitch_type_id!,
    }));
    const { error } = await supabase
      .from("pitch_code_map")
      .upsert(payload, { onConflict: "pitcher_id,numeric_code" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Imported ${valid.length} codes`);
    setImportPreview(null);
    if (fileInput.current) fileInput.current.value = "";
    void refresh();
  };

  const activePitcher = pitchers.find((p) => p.id === pitcherId);
  const labelOf = (id: string) => pitchTypes.find((p) => p.id === id)?.label ?? "—";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      <header className="mb-3 flex items-center justify-between">
        <Link to="/pitch" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Pitch Intel
        </Link>
      </header>

      <h1 className="mb-1 text-2xl font-bold">Pitcher Pitch Codes</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Map each pitcher's numeric codes (what they flash from the mound) to a pitch type.
      </p>

      <div className="mb-4">
        <Select value={pitcherId} onValueChange={setPitcherId}>
          <SelectTrigger><SelectValue placeholder="Select a pitcher" /></SelectTrigger>
          <SelectContent>
            {pitchers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                #{p.jersey_number}{p.name ? ` ${p.name}` : ""} · {p.away_team || p.home_team}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activePitcher && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                downloadTemplate(
                  `${activePitcher.jersey_number}-${activePitcher.name ?? "pitcher"}`,
                  pitchTypes,
                )
              }
            >
              <Download className="h-4 w-4" /> Template
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInput.current?.click()}>
              <Upload className="h-4 w-4" /> Import .xlsx
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </div>

          {importPreview && (
            <div className="mb-3 space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="text-xs font-bold uppercase">Import preview</div>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {importPreview.map((r, i) => (
                  <li key={i} className={r.invalid ? "text-destructive" : ""}>
                    <span className="font-mono">{r.numeric_code}</span> → {r.pitch_type_code}{" "}
                    {r.invalid ? `· ${r.invalid}` : `· ${r.label}`}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setImportPreview(null)}>Cancel</Button>
                <Button size="sm" onClick={applyImport}>Apply</Button>
              </div>
            </div>
          )}

          <div className="mb-3 flex gap-2 rounded-xl border border-border bg-card p-3">
            <Input
              placeholder="code"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 4))}
              className="w-20 text-center font-mono font-bold"
            />
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Pitch type" /></SelectTrigger>
              <SelectContent>
                {pitchTypes.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={addRow} className="gap-1"><Plus className="h-4 w-4" />Add</Button>
          </div>

          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <span className="w-12 text-center font-mono font-bold">{r.numeric_code}</span>
                <Select value={r.pitch_type_id} onValueChange={(v) => updateRow(r.id, v)}>
                  <SelectTrigger className="flex-1 h-9"><SelectValue>{labelOf(r.pitch_type_id)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {pitchTypes.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => deleteRow(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
            {rows.length === 0 && (
              <li className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No codes yet. Add one above or import from Excel.
              </li>
            )}
          </ul>
        </>
      )}

      {pitchers.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No pitchers in the system yet. Start a Pitch Intel game and add a pitcher to begin.
        </div>
      )}
    </div>
  );
}
