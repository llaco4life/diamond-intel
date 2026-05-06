import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListOrgs, adminDeleteOrg } from "@/server/admin.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/orgs")({ component: AdminOrgs });

function AdminOrgs() {
  const list = useServerFn(adminListOrgs);
  const del = useServerFn(adminDeleteOrg);
  const [orgs, setOrgs] = useState<Awaited<ReturnType<typeof adminListOrgs>>>([]);

  const load = useCallback(() => list({}).then(setOrgs).catch((e) => toast.error((e as Error).message)), [list]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Organizations</h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr className="text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Code</th>
              <th className="p-2">Members</th>
              <th className="p-2">Teams</th>
              <th className="p-2">Games</th>
              <th className="p-2">Created</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="p-2 font-medium">{o.name}</td>
                <td className="p-2 font-mono text-xs">{o.join_code}</td>
                <td className="p-2">{o.member_count}</td>
                <td className="p-2">{o.team_count}</td>
                <td className="p-2">{o.game_count}</td>
                <td className="p-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="p-2 text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete organization?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete <strong>{o.name}</strong> and ALL its teams, games, observations, and rosters. Members will be detached. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                          try { await del({ data: { orgId: o.id } }); toast.success("Org deleted"); load(); }
                          catch (e) { toast.error((e as Error).message); }
                        }}>Delete everything</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No orgs</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
