import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListGames, adminDeleteGame } from "@/server/admin.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/games")({ component: AdminGames });

function AdminGames() {
  const list = useServerFn(adminListGames);
  const del = useServerFn(adminDeleteGame);
  const [games, setGames] = useState<Awaited<ReturnType<typeof adminListGames>>>([]);

  const load = useCallback(() => list({ data: { limit: 200 } }).then(setGames).catch((e) => toast.error((e as Error).message)), [list]);
  useEffect(() => { load(); }, [load]);

  const orgName = (g: typeof games[number]) =>
    (Array.isArray(g.organizations) ? g.organizations[0]?.name : (g.organizations as { name?: string } | null)?.name) ?? "—";

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Games</h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr className="text-left">
              <th className="p-2">Date</th>
              <th className="p-2">Matchup</th>
              <th className="p-2">Org</th>
              <th className="p-2">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id} className="border-b">
                <td className="p-2 text-xs">{new Date(g.game_date).toLocaleDateString()}</td>
                <td className="p-2">{g.away_team} @ {g.home_team}</td>
                <td className="p-2">{orgName(g)}</td>
                <td className="p-2"><Badge variant={g.status === "active" ? "default" : "secondary"}>{g.status}</Badge></td>
                <td className="p-2 text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="destructive">Delete</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete game?</AlertDialogTitle>
                        <AlertDialogDescription>Removes the game and all linked pitches, observations, at-bats, and reports.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                          try { await del({ data: { gameId: g.id } }); toast.success("Game deleted"); load(); }
                          catch (e) { toast.error((e as Error).message); }
                        }}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {games.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No games</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
