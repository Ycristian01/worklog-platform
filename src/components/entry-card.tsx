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
} from "lucide-react";
import {
  type Entry,
  type Category,
  useUpdateEntry,
  useDeleteEntry,
  useConfirmEntry,
} from "@/lib/hooks";
import { toast } from "sonner";

interface EntryCardProps {
  entry: Entry;
  categories: Category[];
  date: string;
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

export function EntryCard({ entry, categories, date }: EntryCardProps) {
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
      <Card>
        <CardContent className="space-y-3 pt-4">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
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
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateEntry.isPending}>
              <Check className="mr-1 h-4 w-4" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isSubmitted ? "opacity-75" : ""}>
      <CardContent className="flex items-start justify-between gap-4 pt-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{entry.description}</p>
          </div>
          {entry.notes && (
            <p className="text-sm text-muted-foreground">{entry.notes}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {entry.category && (
              <Badge
                variant="outline"
                style={{
                  borderColor: entry.category.color ?? undefined,
                  color: entry.category.color ?? undefined,
                }}
              >
                {entry.category.name}
              </Badge>
            )}
            <Badge variant={STATUS_VARIANT[entry.status]}>{entry.status}</Badge>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {entry.timeHours}h
            </span>
            {entry.source && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {SOURCE_ICONS[entry.source] ?? null}
                {entry.source.replace("_", " ")}
              </span>
            )}
          </div>
        </div>
        {!isSubmitted && (
          <div className="flex items-center gap-1">
            {isDraft && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleConfirm}
                disabled={confirmEntry.isPending}
                title="Confirm"
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleteEntry.isPending}
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
