import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check, LogOut, Users } from "lucide-react";
import { ProtectedShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: () => (
    <ProtectedShell>
      <ProfilePage />
    </ProtectedShell>
  ),
});

function ProfilePage() {
  const { profile, org, role, signOut, refreshProfile } = useAuth();
  const [jersey, setJersey] = useState(profile?.jersey_number ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHeadCoach = role === "head_coach";
  const roleLabel =
    role === "head_coach" ? "Head Coach" : role === "assistant_coach" ? "Assistant Coach" : "Player";

  const copyCode = async () => {
    if (!org?.join_code) return;
    await navigator.clipboard.writeText(org.join_code);
    setCopied(true);
    toast.success("Join code copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const saveJersey = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ jersey_number: jersey || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    refreshProfile();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <h1 className="mb-1 text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mb-6 text-sm text-muted-foreground">Manage your account and team</p>

      <section className="mb-4 rounded-2xl border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
            {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="font-semibold text-foreground">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <div className="space-y-1.5 border-t border-border pt-4 text-sm">
          <Row label="Team" value={org?.name ?? "—"} />
          <Row label="Role" value={roleLabel} />
        </div>
      </section>

      {isHeadCoach && org && (
        <section className="mb-4 rounded-2xl border-2 border-primary/30 bg-primary-soft p-5 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Team Join Code
          </h2>
          <p className="mt-1 text-xs text-foreground/70">
            Share this with your assistant coaches and players so they can join your team.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 rounded-xl bg-card px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.4em] text-foreground shadow-sm">
              {org.join_code}
            </div>
            <Button onClick={copyCode} size="lg" variant="outline" className="h-auto py-4">
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </Button>
          </div>
        </section>
      )}

      {role === "player" && (
        <section className="mb-4 rounded-2xl border bg-card p-5 shadow-card">
          <Label htmlFor="jersey" className="text-sm font-semibold">
            Jersey number
          </Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="jersey"
              value={jersey}
              onChange={(e) => setJersey(e.target.value)}
              placeholder="e.g. 12"
              className="max-w-32"
            />
            <Button onClick={saveJersey} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </section>
      )}

      {(role === "head_coach" || role === "assistant_coach") && org && (
        <RosterSection orgId={org.id} />
      )}

      <section className="mt-4 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold">My game history</h2>
        <p className="text-sm text-muted-foreground">
          Coming soon — once you've logged a game, your history will appear here.
        </p>
      </section>

      <div className="mt-6">
        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
