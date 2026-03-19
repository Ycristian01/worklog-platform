"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Pencil,
  Trash2,
  X,
  Clock,
  Calendar,
  Github,
  MessageSquare,
  Minus,
  Plus,
} from "lucide-react";
import {
  type Entry,
  type Category,
  useUpdateEntry,
  useDeleteEntry,
  useConfirmEntry,
} from "@/lib/hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EntryCardProps {
  entry: Entry;
  categories: Category[];
  date: string;
  readOnly?: boolean;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  google_calendar: <Calendar className="h-3 w-3" />,
  github: <Github className="h-3 w-3" />,
  slack: <MessageSquare className="h-3 w-3" />,
  manual: <Pencil className="h-3 w-3" />,
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  confirmed: "secondary",
  submitted: "default",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "border-amber-300/50 bg-amber-50/50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300",
  confirmed: "bg-blue-50/50 text-blue-700 border-0 dark:bg-blue-950/30 dark:text-blue-300",
  submitted: "bg-emerald-600 text-white border-0",
};

export function EntryCard({ entry, categories, date, readOnly }: EntryCardProps) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(entry.description);
  const [timeHours, setTimeHours] = useState(String(entry.timeHours));
  const [categoryId, setCategoryId] = useState(entry.categoryId ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");

  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();
  const confirmEntry = useConfirmEntry();

  const isSubmitted = entry.status === "submitted";
  const isDraft = entry.status === "draft";
  const canAdjustHours = !isSubmitted && !readOnly;

  const handleQuickHourChange = (delta: number) => {
    const newHours = Math.round((entry.timeHours + delta) * 100) / 100;
    if (newHours < 0.25 || newHours > 24) return;

    updateEntry.mutate(
      {
        id: entry.id,
        date,
        description: entry.description,
        timeHours: newHours,
        categoryId: entry.categoryId || undefined,
        notes: entry.notes || undefined,
      },
      {
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleSave = () => {
    const hours = parseFloat(timeHours);
    if (isNaN(hours) || hours < 0.25 || hours > 24) {
      toast.error("Time must be between 0.25 and 24 hours");
      return;
    }

    updateEntry.mutate(
      {
        id: entry.id,
        date,
        description: description.trim(),
        timeHours: hours,
        categoryId: categoryId || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Entry updated");
          setEditing(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleCancel = () => {
    setDescription(entry.description);
    setTimeHours(String(entry.timeHours));
    setCategoryId(entry.categoryId ?? "");
    setNotes(entry.notes ?? "");
    setEditing(false);
  };

  const handleDelete = () => {
    deleteEntry.mutate(
      { id: entry.id, date },
      {
        onSuccess: () => toast.success("Entry deleted"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleConfirm = () => {
    confirmEntry.mutate(
      { id: entry.id, date },
      {
        onSuccess: () => toast.success("Entry confirmed"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (editing) {
    return (
      <Card className="ring-2 ring-accent/20 shadow-md">
        <CardContent className="space-y-3 pt-4">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="font-medium"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              value={timeHours}
              onChange={(e) => setTimeHours(e.target.value)}
            />
            <Select
              value={categoryId || undefined}
              onValueChange={(val) => setCategoryId(val ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category">
                  {(value: string | null) => {
                    const cat = categories.find((c) => c.id === value);
                    return cat?.name ?? "Category";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="mr-1 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateEntry.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90 border-0">
              <Check className="mr-1 h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all",
      isSubmitted && "opacity-70",
      isDraft && "ring-1 ring-amber-200/60 dark:ring-amber-800/30"
    )}>
      <CardContent className="flex items-start justify-between gap-4 pt-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="font-medium leading-snug">{entry.description}</p>
          </div>
          {entry.notes && (
            <p className="text-sm text-muted-foreground leading-relaxed">{entry.notes}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {entry.category && (
              <Badge
                variant="outline"
                className="rounded-md text-[0.7rem] font-medium"
                style={{
                  borderColor: entry.category.color ?? undefined,
                  color: entry.category.color ?? undefined,
                  backgroundColor: entry.category.color ? `${entry.category.color}10` : undefined,
                }}
              >
                {entry.category.name}
              </Badge>
            )}
            <Badge
              variant={STATUS_VARIANT[entry.status]}
              className={cn("rounded-md text-[0.7rem]", STATUS_COLORS[entry.status])}
            >
              {entry.status}
            </Badge>
            {/* Hours display with +/- controls for non-submitted entries */}
            {canAdjustHours ? (
              <span className="inline-flex w-[100px] items-center justify-between gap-0.5 rounded-md border border-border/60 bg-muted/40 pl-1">
                <button
                  type="button"
                  onClick={() => handleQuickHourChange(-0.5)}
                  disabled={entry.timeHours <= 0.5 || updateEntry.isPending}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                  title="Decrease by 30 min"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <span className="flex items-center justify-center gap-1 text-sm font-medium tabular-nums text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {entry.timeHours}h
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickHourChange(0.5)}
                  disabled={entry.timeHours >= 24 || updateEntry.isPending}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                  title="Increase by 30 min"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm font-medium tabular-nums text-muted-foreground">
                <Clock className="h-3 w-3" />
                {entry.timeHours}h
              </span>
            )}
            {entry.source && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                {SOURCE_ICONS[entry.source] ?? null}
                {entry.source.replace("_", " ")}
              </span>
            )}
          </div>
        </div>
        {!isSubmitted && !readOnly && (
          <div className="flex items-center gap-0.5">
            {isDraft && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleConfirm}
                disabled={confirmEntry.isPending}
                title="Confirm"
                className="h-8 w-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              title="Edit"
              className="h-8 w-8 rounded-lg"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleteEntry.isPending}
              title="Delete"
              className="h-8 w-8 rounded-lg hover:bg-destructive/8 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
