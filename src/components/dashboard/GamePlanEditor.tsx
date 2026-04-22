import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, AlertCircle } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 800;

export function GamePlanEditor({ gameId, coachId }: { gameId: string; coachId: string }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const reportIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>("");
  const pendingValueRef = useRef<string | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Initial load
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("scouting_reports")
        .select("id, game_plan_notes")
        .eq("game_id", gameId)
        .eq("coach_id", coachId)
        .maybeSingle();
      if (cancel) return;
      const notes = data?.game_plan_notes ?? "";
      reportIdRef.current = data?.id ?? null;
      lastSavedRef.current = notes;
      setValue(notes);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [gameId, coachId]);

  const performSave = async (toSave: string) => {
    inFlightRef.current = true;
    setStatus("saving");
    try {
      if (reportIdRef.current === null) {
        const { data, error } = await supabase
          .from("scouting_reports")
          .insert({ game_id: gameId, coach_id: coachId, game_plan_notes: toSave })
          .select("id")
          .single();
        if (error) throw error;
        reportIdRef.current = data.id;
      } else {
        const { error } = await supabase
          .from("scouting_reports")
          .update({ game_plan_notes: toSave })
          .eq("id", reportIdRef.current);
        if (error) throw error;
      }
      lastSavedRef.current = toSave;
      if (mountedRef.current) setStatus("saved");
    } catch (e) {
      console.error("[GamePlanEditor] save failed", e);
      if (mountedRef.current) setStatus("error");
    } finally {
      inFlightRef.current = false;
      // If something changed during the save, save again
      if (pendingValueRef.current !== null && pendingValueRef.current !== lastSavedRef.current) {
        const next = pendingValueRef.current;
        pendingValueRef.current = null;
        performSave(next);
      }
    }
  };

  const scheduleSave = (next: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (next === lastSavedRef.current) return;
      if (inFlightRef.current) {
        pendingValueRef.current = next;
      } else {
        performSave(next);
      }
    }, DEBOUNCE_MS);
  };

  const onChange = (next: string) => {
    setValue(next);
    setStatus("idle");
    scheduleSave(next);
  };

  // Flush on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      // Best-effort flush; not awaited
      const current = pendingValueRef.current ?? value;
      if (current !== lastSavedRef.current && !inFlightRef.current) {
        void performSave(current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl bg-muted/50" />;
  }

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-card">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Notes for your team — what to watch for, who to attack, defensive plan…"
        rows={6}
        className="resize-y border-0 bg-transparent p-1 focus-visible:ring-0 shadow-none"
      />
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Only you can see your notes. Saved automatically.</span>
        <span className="flex items-center gap-1">
          {status === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="h-3 w-3 text-primary" /> Saved
            </>
          )}
          {status === "error" && (
            <button
              type="button"
              onClick={() => performSave(value)}
              className="flex items-center gap-1 text-destructive hover:underline"
            >
              <AlertCircle className="h-3 w-3" /> Save failed — retry
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
