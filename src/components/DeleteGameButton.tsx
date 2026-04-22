import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { GameRow } from "@/hooks/useActiveGame";

export function DeleteGameButton({
  game,
  busy,
  onConfirm,
  label = "Delete game",
  iconOnly = false,
}: {
  game: GameRow;
  busy: boolean;
  onConfirm: () => void;
  label?: string;
  iconOnly?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <button
            type="button"
            disabled={busy}
            aria-label={label}
            className="text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <Button size="sm" variant="ghost" disabled={busy} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-1 h-4 w-4" />
            {busy ? "Deleting…" : "Delete"}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {label.toLowerCase().includes("session") ? "session" : "game"}?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">
              {game.home_team} vs {game.away_team}
            </span>{" "}
            and all related data — observations, at-bats, pitchers, notes — will be permanently
            removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
