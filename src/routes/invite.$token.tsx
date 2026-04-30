import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

type Preview = {
  org_name: string | null;
  team_name: string | null;
  role: "player" | "assistant_coach" | "head_coach" | null;
  is_valid: boolean;
  reason: string | null;
};

const ROLE_LABEL = {
  player: "Player",
  assistant_coach: "Assistant Coach",
  head_coach: "Head Coach",
} as const;

const REASON_MESSAGE: Record<string, string> = {
  not_found: "This invite link is invalid.",
  revoked: "This invite link has been revoked.",
  expired: "This invite link has expired.",
  max_uses_reached: "This invite link has reached its maximum uses.",
  already_in_other_org: "You already belong to another team. Sign out first to use this invite.",
  not_authenticated: "Please sign in to accept this invite.",
};

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProfile } = useAuth();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_invite_preview", { _token: token });
      const fallback: Preview = { org_name: null, team_name: null, role: null, is_valid: false, reason: "not_found" };
      if (error) {
        setPreview(fallback);
      } else {
        const row = (data ?? [])[0] as Preview | undefined;
        setPreview(row ?? fallback);
      }
      setLoadingPreview(false);
    })();
  }, [token]);

  // If user is already signed in & invite is valid, attempt redeem automatically once.
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!preview?.is_valid) return;
    if (redeemed) return;
    (async () => {
      setSubmitting(true);
      const { data, error } = await supabase.rpc("redeem_invite", { _token: token });
      setSubmitting(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      const row = (data ?? [])[0] as { success: boolean; reason: string | null } | undefined;
      if (row?.success) {
        setRedeemed(true);
        toast.success(`You've joined ${preview.team_name ?? preview.org_name}!`);
        await refreshProfile();
        setTimeout(() => navigate({ to: "/", search: { restricted: undefined } }), 600);
      } else {
        toast.error(REASON_MESSAGE[row?.reason ?? ""] ?? "Couldn't redeem invite.");
      }
    })();
  }, [authLoading, user, preview, token, redeemed, navigate, refreshProfile]);

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview?.is_valid) return;
    setSubmitting(true);
    const isLovableInternal =
      window.location.origin.includes("id-preview--") ||
      window.location.origin.includes("lovableproject.com") ||
      window.location.origin.includes("lovable.dev");
    const baseOrigin = isLovableInternal
      ? "https://diamond-intel.lovable.app"
      : window.location.origin;
    const redirectUrl = `${baseOrigin}/invite/${token}`;
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
          invited: true,
          invite_token: token,
        },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    // If a session was issued immediately (auto-confirm on), redeem the invite
    // right now instead of waiting for the auth state effect to catch up.
    if (signUpData.session) {
      const { data: redeemData, error: redeemErr } = await supabase.rpc("redeem_invite", { _token: token });
      setSubmitting(false);
      if (redeemErr) {
        toast.error(redeemErr.message);
        return;
      }
      const row = (redeemData ?? [])[0] as { success: boolean; reason: string | null } | undefined;
      if (row?.success) {
        setRedeemed(true);
        toast.success(`You've joined ${preview.team_name ?? preview.org_name}!`);
        await refreshProfile();
        setTimeout(() => navigate({ to: "/", search: { restricted: undefined } }), 600);
        return;
      }
      toast.error(REASON_MESSAGE[row?.reason ?? ""] ?? "Couldn't redeem invite.");
      return;
    }

    // No session returned — try signing in with the credentials we just used
    // (handles cases where signUp didn't auto-issue a session but the account is usable).
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setSubmitting(false);
      toast.success("Account created! Check your email to confirm, then return to this link.");
      return;
    }
    // Auth state listener will pick up the new session and the auto-redeem effect will fire.
    setSubmitting(false);
  };

  const onSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    }
    // Auto-redeem effect will fire once user is set.
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Logo size="lg" showWordmark />
          <p className="text-sm text-muted-foreground">Team invitation</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          {loadingPreview ? (
            <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
          ) : !preview?.is_valid ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold">Invite unavailable</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {REASON_MESSAGE[preview?.reason ?? "not_found"] ?? "This invite link is no longer available."}
              </p>
              <Link
                to="/login"
                search={{ redirect: undefined }}
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-xl bg-primary-soft p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-primary">You're invited to join</p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {preview.team_name ?? preview.org_name}
                </p>
                {preview.team_name && preview.org_name && (
                  <p className="text-[11px] text-muted-foreground">{preview.org_name}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  as {preview.role ? ROLE_LABEL[preview.role] : ""}
                </p>
              </div>

              {user ? (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {submitting ? "Joining team…" : redeemed ? "Joined! Redirecting…" : "Tap to accept this invite."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex gap-2 rounded-xl bg-muted p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className={`flex-1 rounded-lg py-2 ${
                        mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      Create account
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className={`flex-1 rounded-lg py-2 ${
                        mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      Sign in
                    </button>
                  </div>

                  {mode === "signup" ? (
                    <form onSubmit={onSignup} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName">Full name</Label>
                        <Input
                          id="fullName"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          autoComplete="new-password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? "Creating account…" : "Accept & create account"}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={onSignin} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="email-in">Email</Label>
                        <Input
                          id="email-in"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password-in">Password</Label>
                        <Input
                          id="password-in"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? "Signing in…" : "Accept & sign in"}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
