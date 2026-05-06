import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListAudit } from "@/server/admin.functions";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/audit")({ component: AdminAudit });

function AdminAudit() {
  const list = useServerFn(adminListAudit);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminListAudit>>>([]);

  useEffect(() => { list({}).then(setRows).catch((e) => toast.error((e as Error).message)); }, [list]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Audit log</h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr className="text-left">
              <th className="p-2">When</th>
              <th className="p-2">Actor</th>
              <th className="p-2">Action</th>
              <th className="p-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.actor_name}</td>
                <td className="p-2 font-mono text-xs">{r.action}</td>
                <td className="p-2 font-mono text-xs text-muted-foreground">{r.target_type ? `${r.target_type}:${r.target_id?.slice(0, 8)}` : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No actions yet</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
