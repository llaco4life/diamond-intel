import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enqueue, flushQueue, readQueue, type QueuedTable } from "@/lib/offlineQueue";

export type WriteResult = { ok: true; id: string | null } | { ok: false };

export function useOfflineWriter() {
  const [pending, setPending] = useState(0);

  const refresh = useCallback(async () => {
    const q = await readQueue();
    setPending(q.length);
  }, []);

  useEffect(() => {
    refresh();
    const onOnline = async () => {
      await flushQueue();
      refresh();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  const write = useCallback(
    async (table: QueuedTable, payload: Record<string, unknown>): Promise<WriteResult> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from(table) as any)
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return { ok: true, id: (data?.id as string) ?? null };
      } catch {
        await enqueue({
          id: crypto.randomUUID(),
          table,
          payload,
          createdAt: Date.now(),
        });
        await refresh();
        return { ok: false };
      }
    },
    [refresh],
  );

  const sync = useCallback(async () => {
    const res = await flushQueue();
    await refresh();
    return res;
  }, [refresh]);

  return { write, sync, pending };
}
