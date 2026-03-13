"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCategories, useCreateEntry } from "@/lib/hooks";
import { toast } from "sonner";

interface CreateEntryDialogProps {
  date: string;
  disabled?: boolean;
}

export function CreateEntryDialog({ date, disabled }: CreateEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [timeHours, setTimeHours] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: categories = [] } = useCategories();
  const createEntry = useCreateEntry();

  const reset = () => {
    setDescription("");
    setTimeHours("1");
    setCategoryId("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(timeHours);
    if (isNaN(hours) || hours < 0.25 || hours > 24) {
      toast.error("Time must be between 0.25 and 24 hours");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    createEntry.mutate(
      {
        date,
        description: description.trim(),
        timeHours: hours,
        categoryId: categoryId || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Entry created");
          reset();
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" disabled={disabled}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Manual Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeHours">Hours</Label>
              <Input
                id="timeHours"
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={timeHours}
                onChange={(e) => setTimeHours(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={categoryId || undefined}
                onValueChange={(val) => setCategoryId(val ?? "")}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category">
                    {(value: string | null) => {
                      const cat = categories.find((c) => c.id === value);
                      return cat?.name ?? "Select category";
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending ? "Creating..." : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
