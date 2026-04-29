import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, Plus, Trash2, Save, Upload, ImageIcon, UserCog, Pencil, X, Check } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { InviteLinksSection } from "@/components/profile/InviteLinksSection";
import { toast } from "sonner";

interface RosterRow {
  id: string;
  team_id: string;
  jersey_number: string;
  name: string | null;
  position: string | null;
  bat_order: number | null;
}

interface TeamRow {
  id: string;
  name: string;
  age_group: string | null;
  season: string | null;
  logo_url: string | null;
}

export const Route = createFileRoute("/teams/$teamId")({
  component: TeamDetailRoute,
});

function TeamDetailRoute() {
  return (
    <ProtectedShell>
      <TeamDetailContent />
    </ProtectedShell>
  );
}

function TeamDetailContent() {
  const { teamId } = Route.useParams();
  const { role, org } = useAuth();
  const isCoach = role === "head_coach" || role === "assistant_coach";

  const [team, setTeam] = useState<TeamRow | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [season, setSeason] = useState("");
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [newJersey, setNewJersey] = useState("");
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editJersey, setEditJersey] = useState("");
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from("teams").select("id,name,age_group,season,logo_url").eq("id", teamId).maybeSingle(),
      supabase
        .from("team_roster")
        .select("*")
        .eq("team_id", teamId)
        .order("bat_order", { ascending: true, nullsFirst: false })
        .order("jersey_number"),
    ]);
    if (t) {
      setTeam(t as TeamRow);
      setName(t.name);
      setAge(t.age_group ?? "");
      setSeason(t.season ?? "");
    }
    setRoster((r ?? []) as RosterRow[]);
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveTeam = async () => {
    const { error } = await supabase
      .from("teams")
      .update({ name: name.trim(), age_group: age.trim() || null, season: season.trim() || null })
      .eq("id", teamId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Team saved");
    await load();
  };

  const addBatter = async () => {
    if (!newJersey.trim()) {
      toast.error("Jersey number required");
      return;
    }
    const nextOrder = (roster[roster.length - 1]?.bat_order ?? roster.length) + 1;
    const { error } = await supabase.from("team_roster").insert({
      team_id: teamId,
      jersey_number: newJersey.trim(),
      name: newName.trim() || null,
      bat_order: nextOrder,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewJersey("");
    setNewName("");
    await load();
  };

  const removeBatter = async (id: string) => {
    if (!confirm("Remove this player from the roster?")) return;
    const { error } = await supabase.from("team_roster").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
  };

  const startEdit = (b: RosterRow) => {
    setEditingId(b.id);
    setEditJersey(b.jersey_number);
    setEditName(b.name ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditJersey("");
    setEditName("");
  };

  const saveEdit = async (id: string) => {
    if (!editJersey.trim()) {
      toast.error("Jersey number required");
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from("team_roster")
      .update({ jersey_number: editJersey.trim(), name: editName.trim() || null })
      .eq("id", id);
    setSavingEdit(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Player updated");
    cancelEdit();
    await load();
  };

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${teamId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("team-logos")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("team-logos").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("teams")
        .update({ logo_url: pub.publicUrl })
        .eq("id", teamId);
      if (updErr) throw updErr;
      toast.success("Logo updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    const { error } = await supabase.from("teams").update({ logo_url: null }).eq("id", teamId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Logo removed");
    await load();
  };

  if (!team) {
    return <div className="mx-auto max-w-2xl px-4 pt-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      <header className="mb-3">
        <Link to="/teams" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> My Teams
        </Link>
      </header>

      <div className="mb-4 flex items-center gap-3">
        {team.logo_url ? (
          <img src={team.logo_url} alt={`${team.name} logo`} className="h-14 w-14 rounded-lg border bg-background object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <h1 className="text-2xl font-bold">{team.name}</h1>
      </div>

      <section className="mb-5 space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Team info</h2>
        <div>
          <Label htmlFor="e-name">Name</Label>
          <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isCoach} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="e-age">Age group</Label>
            <Input id="e-age" value={age} onChange={(e) => setAge(e.target.value)} disabled={!isCoach} />
          </div>
          <div>
            <Label htmlFor="e-season">Season</Label>
            <Input id="e-season" value={season} onChange={(e) => setSeason(e.target.value)} disabled={!isCoach} />
          </div>
        </div>
        {isCoach && (
          <div>
            <Label>Logo</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                }}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
                <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : team.logo_url ? "Replace logo" : "Upload logo"}
              </Button>
              {team.logo_url && (
                <Button type="button" variant="ghost" onClick={() => void removeLogo()} disabled={uploading}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        )}
        {isCoach && (
          <Button onClick={saveTeam} className="gap-1.5">
            <Save className="h-4 w-4" /> Save
          </Button>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Roster</h2>

        {isCoach && (
          <div className="flex gap-2">
            <Input
              placeholder="#"
              value={newJersey}
              onChange={(e) => setNewJersey(e.target.value)}
              className="w-16 text-center font-mono"
            />
            <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
            <Button onClick={addBatter} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        )}

        <ul className="space-y-1.5">
          {roster.map((b, i) => {
            const isEditing = editingId === b.id;
            return (
              <li key={b.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">{i + 1}.</span>
                {isEditing ? (
                  <>
                    <Input
                      value={editJersey}
                      onChange={(e) => setEditJersey(e.target.value)}
                      className="w-14 px-1 text-center font-mono"
                      placeholder="#"
                    />
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      placeholder="Name"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={() => void saveEdit(b.id)} disabled={savingEdit} title="Save">
                      <Check className="h-4 w-4 text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEdit} disabled={savingEdit} title="Cancel">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="w-12 shrink-0 text-center font-mono font-bold">#{b.jersey_number}</span>
                    <span className="flex-1 truncate text-sm">{b.name ?? "—"}</span>
                    {isCoach && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => startEdit(b)} title="Edit player">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void removeBatter(b.id)} title="Remove player">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </li>
            );
          })}
          {roster.length === 0 && (
            <li className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No roster yet. Add batters above.
            </li>
          )}
        </ul>
      </section>

      {isCoach && (
        <div className="mt-4">
          <Link to="/teams/$teamId/members" params={{ teamId }}>
            <Button variant="outline" className="w-full gap-1.5">
              <UserCog className="h-4 w-4" /> Manage members
            </Button>
          </Link>
        </div>
      )}

      {isCoach && org && (
        <div className="mt-4">
          <InviteLinksSection orgId={org.id} teamId={teamId} title="Team invite links" />
        </div>
      )}
    </div>
  );
}
