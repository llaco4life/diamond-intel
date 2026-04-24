import { useEffect, useState } from "react";
import { Copy, Check, Link2, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { toast } from "sonner";

type InviteRole = Extract<AppRole, "player" | "assistant_coach">;

interface InviteLink {
  id: string;
  org_id: string;
  role: InviteRole;
  token: string;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const DEFAULT_MAX_USES: Record<InviteRole, number> = {
  player: 25,
  assistant_coach: 5,
};

const ROLE_META: Record<InviteRole, { label: string; cta: string; icon: typeof Users }> = {
  player: { label: "Player invite", cta: "Invite Player", icon: Users },
  assistant_coach: { label: "Assistant coach invite", cta: "Invite Assistant Coach", icon: UserPlus },
};

function generateToken(): string {
  // URL-safe random token
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Always use the published app domain for invite links so they work for
// recipients (not the Lovable editor preview URL the coach happens to be on).
const PUBLISHED_APP_ORIGIN = "https://diamond-intel.lovable.app";

function inviteUrl(token: string): string {
  if (typeof window === "undefined") return `${PUBLISHED_APP_ORIGIN}/invite/${token}`;
  const origin = window.location.origin;
  // If the coach is viewing the app inside the Lovable editor/preview, those
  // hosts redirect strangers into Lovable's own auth. Force the published URL.
  const isLovableInternal =
    origin.includes("id-preview--") ||
    origin.includes("lovableproject.com") ||
    origin.includes("lovable.dev");
  const base = isLovableInternal ? PUBLISHED_APP_ORIGIN : origin;
  return `${base}/invite/${token}`;
}

function statusFor(link: InviteLink): { label: string; tone: "active" | "revoked" | "exhausted" | "expired" } {
  if (link.revoked_at) return { label: "Revoked", tone: "revoked" };
  if (link.expires_at && new Date(link.expires_at) < new Date()) return { label: "Expired", tone: "expired" };
  if (link.max_uses !== null && link.uses_count >= link.max_uses) return { label: "Max uses reached", tone: "exhausted" };
  return { label: "Active", tone: "active" };
}

export function InviteLinksSection({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const [links, setLinks] = useState<InviteLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<InviteRole | null>(null);
  const [maxUses, setMaxUses] = useState<Record<InviteRole, string>>({
    player: String(DEFAULT_MAX_USES.player),
    assistant_coach: String(DEFAULT_MAX_USES.assistant_coach),
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    const { data, error: err } = await supabase
      .from("org_invite_links")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setLinks((data ?? []) as InviteLink[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const createInvite = async (role: InviteRole) => {
    if (!user) return;
    setCreating(role);
    const parsed = parseInt(maxUses[role], 10);
    const max = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_USES[role];
    const token = generateToken();
    const { error: err } = await supabase.from("org_invite_links").insert({
      org_id: orgId,
      role,
      token,
      created_by: user.id,
      max_uses: max,
    });
    setCreating(null);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success(`${ROLE_META[role].label} created`);
    load();
  };

  const copyLink = async (link: InviteLink) => {
    await navigator.clipboard.writeText(inviteUrl(link.token));
    setCopiedId(link.id);
    toast.success("Invite link copied");
    setTimeout(() => setCopiedId((c) => (c === link.id ? null : c)), 2000);
  };

  const revoke = async (link: InviteLink) => {
    if (!confirm("Revoke this invite link? Anyone using it will no longer be able to join.")) return;
    const { error: err } = await supabase
      .from("org_invite_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", link.id);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("Invite revoked");
    load();
  };

  return (
    <section className="mb-4 rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Invite Links</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Share a one-tap link to onboard new teammates. They'll be added to your org with the right role automatically.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(ROLE_META) as InviteRole[]).map((r) => {
          const meta = ROLE_META[r];
          const Icon = meta.icon;
          return (
            <div key={r} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{meta.label}</p>
              </div>
              <Label htmlFor={`max-${r}`} className="text-xs text-muted-foreground">
                Max uses
              </Label>
              <Input
                id={`max-${r}`}
                type="number"
                min={1}
                value={maxUses[r]}
                onChange={(e) => setMaxUses((m) => ({ ...m, [r]: e.target.value }))}
                className="mt-1 h-9"
              />
              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={() => createInvite(r)}
                disabled={creating === r}
              >
                {creating === r ? "Creating…" : meta.cta}
              </Button>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">Couldn't load invites: {error}</p>}

      <div className="mt-5 space-y-2">
        {links === null ? (
          <div className="h-12 animate-pulse rounded-xl bg-muted/50" />
        ) : links.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/40 p-4 text-center text-xs text-muted-foreground">
            No invite links yet. Create one above.
          </p>
        ) : (
          links.map((link) => {
            const status = statusFor(link);
            const isActive = status.tone === "active";
            return (
              <div
                key={link.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {ROLE_META[link.role].label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        status.tone === "active"
                          ? "bg-primary-soft text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {inviteUrl(link.token)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {link.uses_count}
                    {link.max_uses !== null ? ` / ${link.max_uses}` : ""} uses
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyLink(link)}
                  disabled={!isActive}
                  title="Copy invite link"
                >
                  {copiedId === link.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                {!link.revoked_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revoke(link)}
                    title="Revoke invite"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
