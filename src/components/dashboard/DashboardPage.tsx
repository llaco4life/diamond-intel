import { LayoutDashboard, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ScoutReportsTab } from "./ScoutReportsTab";
import { cn } from "@/lib/utils";
import { useState } from "react";

const TABS = [
  { id: "scout", label: "Scout Reports", enabled: true },
  { id: "learning", label: "Learning Insights", enabled: false },
  { id: "development", label: "Development", enabled: false },
  { id: "atbat", label: "At-Bat Trends", enabled: false },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function DashboardPage() {
  const [tab, setTab] = useState<TabId>("scout");

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-6">
      <header className="mb-5 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Coach Dashboard</h1>
          <p className="text-xs text-muted-foreground">Scout reports for your team</p>
        </div>
      </div>

      <div className="mb-4 -mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 min-w-max pb-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={!t.enabled}
                onClick={() => t.enabled && setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : t.enabled
                      ? "border-border bg-card text-foreground hover:bg-muted"
                      : "border-dashed border-border bg-muted/30 text-muted-foreground cursor-not-allowed",
                )}
              >
                {!t.enabled && <Lock className="h-3 w-3" />}
                {t.label}
                {!t.enabled && <span className="text-[10px] opacity-70">Coming soon</span>}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "scout" && <ScoutReportsTab />}
    </div>
  );
}
