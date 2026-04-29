import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Users, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveTeam } from "@/hooks/useActiveTeam";

export function TeamSwitcher() {
  const { teams, activeTeam, setActiveTeamId, loading } = useActiveTeam();
  const location = useLocation();
  const navigate = useNavigate();

  const handleTeamSelect = async (teamId: string) => {
    await setActiveTeamId(teamId);
    if (/^\/pitch\/(?!codes\b)/.test(location.pathname)) {
      navigate({ to: "/pitch" });
    }
  };

  if (loading) return null;

  const label = activeTeam
    ? `${activeTeam.name}${activeTeam.age_group ? ` · ${activeTeam.age_group}` : ""}`
    : "Select a team";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[140px] truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs">Active team</DropdownMenuLabel>
        {teams.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">No teams yet.</div>
        ) : (
          teams.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => void handleTeamSelect(t.id)}
              className={t.id === activeTeam?.id ? "bg-secondary font-semibold" : ""}
            >
              <div className="flex flex-col">
                <span>{t.name}</span>
                {(t.age_group || t.season) && (
                  <span className="text-[10px] text-muted-foreground">
                    {[t.age_group, t.season].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/teams" className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">Manage teams</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
