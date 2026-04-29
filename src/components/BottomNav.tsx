import { Link, useLocation } from "@tanstack/react-router";
import { Home, Eye, GraduationCap, LayoutDashboard, Sprout, User, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  coachOnly?: boolean;
}

const items: NavItem[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/scout", label: "Scout", icon: Eye },
  { to: "/learning", label: "Learning", icon: GraduationCap },
  { to: "/pitch", label: "Pitch", icon: Target },
  { to: "/dashboard", label: "Coach", icon: LayoutDashboard, coachOnly: true },
  { to: "/development", label: "Dev", icon: Sprout },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const { role } = useAuth();
  const isCoach = role === "head_coach" || role === "assistant_coach";

  const visible = items.filter((i) => !i.coachOnly || isCoach);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md shadow-elevated">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {visible.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === "/home"
              ? location.pathname === "/home"
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
