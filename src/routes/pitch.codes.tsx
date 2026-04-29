import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ChevronLeft, Download, Upload, Plus, Trash2, AlertCircle } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTeam } from "@/hooks/useActiveTeam";
import { toast } from "sonner";
import { usePitchTypes } from "@/hooks/usePitchTypes";
import { usePitchCodeMap } from "@/hooks/usePitchCodeMap";
import { downloadTemplate, parseImportFile, type ImportRow } from "@/lib/pitchIntel/codeTemplate";

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
  const { activeTeamId, activeTeam } = useActiveTeam();
  const { types: pitchTypes } = usePitchTypes();
  const { rows, refresh } = usePitchCodeMap(activeTeamId);
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState("");
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const labelOf = (id: string) => pitchTypes.find((p) => p.id === id)?.label ?? "—";

  const addRow = async () => {
    if (!org || !newCode.trim() || !newType) return;
    if (!activeTeamId) {
      toast.error("Select a team first.");
      return;
    }
    const { error } = await supabase.from("pitch_code_map").upsert(
      {
        org_id: org.id,
        team_id: activeTeamId,
        numeric_code: newCode.trim(),
        pitch_type_id: newType,
      },
      { onConflict: "team_id,numeric_code" },
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

  const updateCode = async (id: string, numericCode: string) => {
    const trimmed = numericCode.trim();
    if (!trimmed) {
      toast.error("Code cannot be empty");
      void refresh();
      return;
    }
    const { error } = await supabase
      .from("pitch_code_map")
      .update({ numeric_code: trimmed })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    }
    void refresh();
  };

  const deleteRow = async (id: string) => {
    await supabase.from("pitch_code_map").delete().eq("id", id);
    void refresh();
  };

  const handleFile = async (file: File) => {
    if (!activeTeamId) {
      toast.error("Select a team first.");
      return;
    }
    const preview = await parseImportFile(file, pitchTypes);
    setImportPreview(preview);
  };

  const applyImport = async () => {
    if (!org || !importPreview) return;
    if (!activeTeamId) {
      toast.error("Select a team first.");
      return;
    }
    const valid = importPreview.filter((r) => !r.invalid && r.pitch_type_id);
    if (valid.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    const payload = valid.map((r) => ({
      org_id: org.id,
      team_id: activeTeamId,
      numeric_code: r.numeric_code,
      pitch_type_id: r.pitch_type_id!,
    }));
    const { error } = await supabase
      .from("pitch_code_map")
      .upsert(payload, { onConflict: "team_id,numeric_code" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Imported ${valid.length} codes`);
    setImportPreview(null);
    if (fileInput.current) fileInput.current.value = "";
    void refresh();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      <header className="mb-3 flex items-center justify-between">
        <Link to="/pitch" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Pitch Intel
        </Link>
      </header>

      <h1 className="mb-1 text-2xl font-bold">Team Pitch Codes</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        One shared code sheet for the whole team. Every pitcher on{" "}
        {activeTeam ? <span className="font-semibold">{activeTeam.name}</span> : "this team"} uses these
        mappings during a Pitch Intel game.
      </p>

      {!activeTeamId && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold">Select a team first.</p>
            <p className="text-xs text-muted-foreground">
              Pitch codes are saved per team.
            </p>
          </div>
          <Link to="/teams">
            <Button size="sm" variant="outline">Manage teams</Button>
          </Link>
        </div>
      )}

      {activeTeamId && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => downloadTemplate(activeTeam?.name ?? "team", pitchTypes)}
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
                No codes yet for {activeTeam?.name ?? "this team"}. Add one above or import from Excel.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
