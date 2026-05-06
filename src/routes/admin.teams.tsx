import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListTeams, adminDeleteTeam } from "@/server/admin.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/teams")({ component: AdminTeams });

function AdminTeams() {
  const list = useServerFn(adminListTeams);
  const del = useServerFn(adminDeleteTeam);
  const [teams, setTeams] = useState<Awaited<ReturnType<typeof adminListTeams>>>([]);

  const load = useCallback(() => list({}).then(setTeams).catch((e) => toast.error((e as Error).message)), [list]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Teams</h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr className="text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Age</th>
              <th className="p-2">Org</th>
              <th className="p-2">Created</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="p-2 font-medium">{t.name}</td>
                <td className="p-2">{t.age_group ?? "—"}</td>
                <td className="p-2">{(t as { organizations?: { name: string } | null }).organizations?.name ?? "—"}</td>
                <td className="p-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="p-2 text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="destructive">Delete</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete team?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Removes the team, its roster, memberships, and pitch types. Games keep but lose team tag.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                          try { await del({ data: { teamId: t.id } }); toast.success("Team deleted"); load(); }
                          catch (e) { toast.error((e as Error).message); }
                        }}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {teams.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No teams</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
