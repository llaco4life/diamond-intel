import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("player");
  const [orgName, setOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/home", search: { restricted: undefined } });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "head_coach" && !orgName.trim()) {
      toast.error("Please enter your team / organization name");
      return;
    }
    if (role !== "head_coach" && !joinCode.trim()) {
      toast.error("Please enter your team's join code");
      return;
    }

    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
          role,
          org_name: role === "head_coach" ? orgName.trim() : null,
          join_code: role !== "head_coach" ? joinCode.trim().toUpperCase() : null,
        },
      },
    });
    setSubmitting(false);

    if (error) {
      // Surface trigger error message (e.g., invalid join code)
      const msg = error.message?.includes("Invalid join code")
        ? "That join code doesn't match any team. Double-check with your coach."
        : error.message;
      toast.error(msg);
      return;
    }

    toast.success("Account created! Check your email to confirm.");
    navigate({ to: "/login", search: { redirect: undefined } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Logo size="lg" showWordmark />
          <p className="text-sm text-muted-foreground">Join your team</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Rivera"
            />
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="role">I am a…</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="assistant_coach">Assistant Coach</SelectItem>
                <SelectItem value="head_coach">Head Coach</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "head_coach" ? (
            <div className="space-y-2">
              <Label htmlFor="orgName">Team / organization name</Label>
              <Input
                id="orgName"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Lincoln Lightning 16U"
              />
              <p className="text-xs text-muted-foreground">
                You'll get a join code to share with your players and assistants.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="joinCode">Team join code</Label>
              <Input
                id="joinCode"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="font-mono uppercase tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Ask your coach for the 6-character code for your specific team.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" search={{ redirect: undefined }} className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
