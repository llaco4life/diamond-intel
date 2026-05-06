import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListInvites, adminRevokeInvite } from "@/server/admin.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/invites")({ component: AdminInvites });

function AdminInvites() {
  const list = useServerFn(adminListInvites);
  const revoke = useServerFn(adminRevokeInvite);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminListInvites>>>([]);

  const load = useCallback(() => list({}).then(setRows).catch((e) => toast.error((e as Error).message)), [list]);
  useEffect(() => { load(); }, [load]);

  const orgName = (r: typeof rows[number]) =>
    (Array.isArray(r.organizations) ? r.organizations[0]?.name : (r.organizations as { name?: string } | null)?.name) ?? "—";

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Invite links</h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr className="text-left">
              <th className="p-2">Org</th>
              <th className="p-2">Role</th>
              <th className="p-2">Uses</th>
              <th className="p-2">Status</th>
              <th className="p-2">Created</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const revoked = !!r.revoked_at;
              const expired = !!r.expires_at && new Date(r.expires_at) < new Date();
              const maxed = r.max_uses != null && r.uses_count >= r.max_uses;
              const status = revoked ? "Revoked" : expired ? "Expired" : maxed ? "Maxed" : "Active";
              return (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{orgName(r)}</td>
                  <td className="p-2"><Badge variant="secondary">{r.role}</Badge></td>
                  <td className="p-2">{r.uses_count}{r.max_uses != null ? ` / ${r.max_uses}` : ""}</td>
                  <td className="p-2"><Badge variant={status === "Active" ? "default" : "outline"}>{status}</Badge></td>
                  <td className="p-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-2 text-right">
                    {!revoked && (
                      <Button size="sm" variant="destructive" onClick={async () => {
                        try { await revoke({ data: { inviteId: r.id } }); toast.success("Revoked"); load(); }
                        catch (e) { toast.error((e as Error).message); }
                      }}>Revoke</Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No invites</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
