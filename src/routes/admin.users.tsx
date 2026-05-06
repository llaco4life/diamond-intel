import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListUsers,
  adminBlockUser,
  adminDeleteUser,
  adminSetSuperAdmin,
} from "@/server/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type Row = Awaited<ReturnType<typeof adminListUsers>>["users"][number];

function AdminUsers() {
  const list = useServerFn(adminListUsers);
  const block = useServerFn(adminBlockUser);
  const del = useServerFn(adminDeleteUser);
  const setSA = useServerFn(adminSetSuperAdmin);

  const [users, setUsers] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await list({ data: { search: search || undefined, page } });
      setUsers(res.users);
      setHasMore(res.hasMore);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [list, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handle = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Users</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
            className="w-56"
          />
          <Button onClick={() => { setPage(1); load(); }} disabled={loading}>Search</Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr className="text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Name</th>
              <th className="p-2">Org</th>
              <th className="p-2">Roles</th>
              <th className="p-2">Status</th>
              <th className="p-2">Last sign-in</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isBanned = !!u.banned_until && new Date(u.banned_until) > new Date();
              const isSA = u.roles.includes("super_admin");
              return (
                <tr key={u.id} className="border-b">
                  <td className="p-2 font-mono text-xs">{u.email}</td>
                  <td className="p-2">{u.full_name ?? "—"}</td>
                  <td className="p-2">{u.org_name ?? "—"}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant={r === "super_admin" ? "default" : "secondary"}>{r}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    {isBanned ? <Badge variant="destructive">Blocked</Badge> : <Badge variant="outline">Active</Badge>}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handle(() => block({ data: { userId: u.id, block: !isBanned } }), isBanned ? "Unblocked" : "Blocked")}
                      >
                        {isBanned ? "Unblock" : "Block"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handle(() => setSA({ data: { userId: u.id, enabled: !isSA } }), isSA ? "Demoted" : "Promoted")}
                      >
                        {isSA ? "Demote" : "Make admin"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete user?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently deletes <span className="font-mono">{u.email}</span> and their profile/memberships. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handle(() => del({ data: { userId: u.id } }), "User deleted")}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No users</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
