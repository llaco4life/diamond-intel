import { get, set, del } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";

const QUEUE_KEY = "scout:queue:v1";

export type QueuedTable =
  | "scout_observations"
  | "pitchers"
  | "game_assignments"
  | "at_bats"
  | "diamond_decision_responses";

export interface QueuedWrite {
  id: string;
  table: QueuedTable;
  payload: Record<string, unknown>;
  createdAt: number;
}

const isBrowser = () => typeof window !== "undefined";

export async function readQueue(): Promise<QueuedWrite[]> {
  if (!isBrowser()) return [];
  return ((await get(QUEUE_KEY)) as QueuedWrite[] | undefined) ?? [];
}

export async function enqueue(item: QueuedWrite): Promise<void> {
  const q = await readQueue();
  q.push(item);
  await set(QUEUE_KEY, q);
}

export async function removeFromQueue(id: string): Promise<void> {
  const q = await readQueue();
  await set(
    QUEUE_KEY,
    q.filter((x) => x.id !== id),
  );
}

export async function clearQueue(): Promise<void> {
  await del(QUEUE_KEY);
}

export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  if (!isBrowser()) return { flushed: 0, remaining: 0 };
  const q = await readQueue();
  let flushed = 0;
  const remaining: QueuedWrite[] = [];
  for (const item of q) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(item.table) as any).insert(item.payload);
      if (error) throw error;
      flushed++;
    } catch {
      remaining.push(item);
    }
  }
  await set(QUEUE_KEY, remaining);
  return { flushed, remaining: remaining.length };
}
