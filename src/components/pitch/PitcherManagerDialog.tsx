import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";

export interface ManagedPitcher {
  id: string;
  jersey_number: string;
  name: string | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  pitchers: ManagedPitcher[];
  pitchCounts: Record<string, number>;
  onAdd: (data: { jersey: string; name?: string }) => Promise<void>;
  onUpdate: (id: string, data: { jersey: string; name?: string }) => Promise<void>;
  onMakeActive: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function PitcherManagerDialog({
  open,
  onClose,
  pitchers,
  pitchCounts,
  onAdd,
  onUpdate,
  onMakeActive,
  onRemove,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editJersey, setEditJersey] = useState("");
  const [editName, setEditName] = useState("");

  const [newJersey, setNewJersey] = useState("");
  const [newName, setNewName] = useState("");

  const startEdit = (p: ManagedPitcher) => {
    setEditingId(p.id);
    setEditJersey(p.jersey_number);
    setEditName(p.name ?? "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditJersey("");
    setEditName("");
  };
  const saveEdit = async () => {
    if (!editingId || !editJersey.trim()) return;
    await onUpdate(editingId, { jersey: editJersey.trim(), name: editName.trim() || undefined });
    cancelEdit();
  };

  const handleRemove = async (p: ManagedPitcher) => {
    const label = `#${p.jersey_number}${p.name ? ` ${p.name}` : ""}`;
    if (!window.confirm(`Remove pitcher ${label}? Their logged pitches stay in history.`)) return;
    await onRemove(p.id);
  };

  const handleAdd = async () => {
    if (!newJersey.trim()) return;
    await onAdd({ jersey: newJersey.trim(), name: newName.trim() || undefined });
    setNewJersey("");
    setNewName("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage pitchers</DialogTitle>
        </DialogHeader>

        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {pitchers.length === 0 && (
            <li className="text-sm text-muted-foreground">No pitchers yet.</li>
          )}
          {pitchers.map((p) => {
            const isEditing = editingId === p.id;
            return (
              <li
                key={p.id}
                className={`rounded-xl border p-2 ${
                  p.is_active ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                }`}
              >
                {isEditing ? (
                  <div className="flex items-end gap-2">
                    <div className="w-16">
                      <Label className="text-[10px] uppercase">#</Label>
                      <Input
                        value={editJersey}
                        onChange={(e) => setEditJersey(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                        inputMode="numeric"
                        className="h-9 text-center font-bold"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] uppercase">Name</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9" />
                    </div>
                    <Button size="sm" onClick={saveEdit} className="h-9 gap-1">
                      <Save className="h-3.5 w-3.5" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-9">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <span className="text-sm font-black tabular-nums">#{p.jersey_number}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {p.name || `#${p.jersey_number}`}
                        {p.is_active && (
                          <span className="ml-2 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {pitchCounts[p.id] ?? 0} pitches
                      </div>
                    </div>
                    {!p.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMakeActive(p.id)}
                        className="h-8 gap-1 px-2 text-xs"
                      >
                        <Check className="h-3.5 w-3.5" /> Make active
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(p)}
                      className="h-8 px-2 text-muted-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(p)}
                      className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-2 rounded-xl border border-dashed border-border p-2">
          <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Add pitcher</div>
          <div className="flex items-end gap-2">
            <div className="w-16">
              <Label className="text-[10px] uppercase">#</Label>
              <Input
                value={newJersey}
                onChange={(e) => setNewJersey(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                inputMode="numeric"
                className="h-9 text-center font-bold"
                placeholder="#"
              />
            </div>
            <div className="flex-1">
              <Label className="text-[10px] uppercase">Name (optional)</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9"
                placeholder="e.g. Sara"
              />
            </div>
            <Button onClick={handleAdd} className="h-9 gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
