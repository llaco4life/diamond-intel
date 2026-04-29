import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Users, ClipboardList } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { completeAsHeadCoach } from "@/server/onboarding.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const AGE_GROUPS = [
  "8U",
  "10U",
  "12U",
  "14U",
  "16U",
  "18U",
  "JV",
  "Varsity",
  "College",
  "Adult",
];

type View = "choice" | "create" | "invite";

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [view, setView] = useState<View>("choice");

  // Create-team form state
  const [teamName, setTeamName] = useState("");
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Invite-link form state
  const [inviteInput, setInviteInput] = useState("");

  const createHeadCoach = useServerFn(completeAsHeadCoach);

  // Guard: must be signed in; if already onboarded, send home.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/signup" });
      return;
    }
    if (profile?.org_id) {
      navigate({ to: "/home", search: { restricted: undefined } });
    }
  }, [user, profile, loading, navigate]);

  const onCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await createHeadCoach({
        data: { teamName: teamName.trim(), ageGroup: ageGroup || null },
      });
      if (!res.success) {
        toast.error(res.reason ?? "Couldn't create your team.");
        return;
      }
      toast.success("Team created!");
      await refreshProfile();
      navigate({ to: "/home", search: { restricted: undefined } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const onUseInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = inviteInput.trim();
    if (!raw) {
      toast.error("Paste your invite link or token");
      return;
    }
    // Accept either a full URL containing /invite/<token> or a bare token.
    let token: string | null = null;
    const match = raw.match(/\/invite\/([^/?#]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    } else if (/^[A-Za-z0-9_-]{6,}$/.test(raw)) {
      token = raw;
    }
    if (!token) {
      toast.error("That doesn't look like a valid invite link.");
      return;
    }
    navigate({ to: "/invite/$token", params: { token } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Logo size="lg" showWordmark />
          <p className="text-sm text-muted-foreground">Let's get you set up</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          {view === "choice" && (
            <>
              <h1 className="text-lg font-semibold text-foreground">How are you joining?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the option that matches you.
              </p>
              <div className="mt-5 space-y-3">
                <ChoiceCard
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="I'm a head coach"
                  description="Create a new team and invite your staff and players."
                  onClick={() => setView("create")}
                />
                <ChoiceCard
                  icon={<Users className="h-5 w-5" />}
                  title="I'm joining an existing team"
                  description="Use the invite link your head coach sent you."
                  onClick={() => setView("invite")}
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Assistant coaches and players need an invite link from their head coach. Coach
                permissions only come from a coach invite link.
              </p>
            </>
          )}

          {view === "create" && (
            <>
              <BackButton onClick={() => setView("choice")} />
              <h1 className="mt-2 text-lg font-semibold text-foreground">Create your first team</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You'll get invite links to share with your staff and players.
              </p>
              <form onSubmit={onCreateTeam} className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">Team name</Label>
                  <Input
                    id="teamName"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Lincoln Lightning 16U"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ageGroup">Age group</Label>
                  <Select value={ageGroup} onValueChange={setAgeGroup}>
                    <SelectTrigger id="ageGroup">
                      <SelectValue placeholder="Select age group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Creating team…" : (
                    <>
                      Create team <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          {view === "invite" && (
            <>
              <BackButton onClick={() => setView("choice")} />
              <h1 className="mt-2 text-lg font-semibold text-foreground">Join your team</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Paste the invite link your head coach sent you.
              </p>
              <form onSubmit={onUseInvite} className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite">Invite link</Label>
                  <Input
                    id="invite"
                    required
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder="https://…/invite/abc123"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Don't have one? Ask your head coach to send a player or coach invite link
                    from their Profile page.
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Wrong account?{" "}
          <Link to="/login" search={{ redirect: undefined }} className="font-medium text-primary hover:underline">
            Sign in with a different one
          </Link>
        </p>
      </div>
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-primary/50 hover:shadow-card"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}
