"use client";

import { useState } from "react";
import { format, addDays, subDays, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Send,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EntryCard } from "@/components/entry-card";
import { CreateEntryDialog } from "@/components/create-entry-dialog";
import {
  useEntries,
  useCategories,
  useDayStatus,
  useConfirmEntry,
  useSubmitDay,
  useSyncCalendar,
} from "@/lib/hooks";
import { toast } from "sonner";

function formatDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function DashboardClient({ userName }: { userName: string }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = formatDateParam(selectedDate);

  const { data: entries, isLoading: entriesLoading } = useEntries(dateStr);
  const { data: categories = [] } = useCategories();
  const { data: dayStatus } = useDayStatus(dateStr);
  const confirmEntry = useConfirmEntry();
  const submitDay = useSubmitDay();
  const syncCalendar = useSyncCalendar();

  const isSubmitted = dayStatus?.submitted ?? false;
  const drafts = entries?.filter((e) => e.status === "draft") ?? [];
  const confirmed = entries?.filter((e) => e.status === "confirmed") ?? [];
  const submitted = entries?.filter((e) => e.status === "submitted") ?? [];
  const totalHours =
    entries?.reduce((sum, e) => sum + e.timeHours, 0) ?? 0;

  const goToday = () => setSelectedDate(new Date());
  const goPrev = () => setSelectedDate((d) => subDays(d, 1));
  const goNext = () => setSelectedDate((d) => addDays(d, 1));

  const handleConfirmAll = () => {
    drafts.forEach((entry) => {
      confirmEntry.mutate(
        { id: entry.id, date: dateStr },
        { onError: (err) => toast.error(err.message) }
      );
    });
    if (drafts.length > 0) toast.success(`Confirmed ${drafts.length} entries`);
  };

  const handleSyncCalendar = () => {
    syncCalendar.mutate(dateStr, {
      onSuccess: (data) => {
        if (data.synced > 0) {
          toast.success(`Synced ${data.synced} calendar event${data.synced !== 1 ? "s" : ""}`);
        } else {
          toast.info("No new calendar events to sync");
        }
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleSubmitDay = () => {
    submitDay.mutate(dateStr, {
      onSuccess: (data) =>
        toast.success(`Day submitted! Total: ${data.totalHours}h`),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {userName}</p>
      </div>

      {/* Date navigation */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-semibold">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </span>
            {isToday(selectedDate) && (
              <Badge variant="secondary">Today</Badge>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday(selectedDate) && (
            <Button variant="ghost" size="sm" onClick={goToday}>
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-4 text-sm">
          <span>
            <strong>{entries?.length ?? 0}</strong> entries
          </span>
          <span>
            <strong>{totalHours}</strong> h total
          </span>
          {drafts.length > 0 && (
            <span className="text-orange-600">
              {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
            </span>
          )}
          {isSubmitted && (
            <Badge variant="default" className="bg-green-600">
              Submitted
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isSubmitted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncCalendar}
              disabled={syncCalendar.isPending}
            >
              <RefreshCw
                className={cn(
                  "mr-2 h-4 w-4",
                  syncCalendar.isPending && "animate-spin"
                )}
              />
              Sync Calendar
            </Button>
          )}
          {drafts.length > 0 && !isSubmitted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConfirmAll}
              disabled={confirmEntry.isPending}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Confirm All
            </Button>
          )}
          {confirmed.length > 0 && drafts.length === 0 && !isSubmitted && (
            <Button
              size="sm"
              onClick={handleSubmitDay}
              disabled={submitDay.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit Day
            </Button>
          )}
          <CreateEntryDialog date={dateStr} disabled={isSubmitted} />
        </div>
      </div>

      {/* Entries list */}
      {entriesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="space-y-3">
          {/* Show drafts first, then confirmed, then submitted */}
          {[...drafts, ...confirmed, ...submitted].map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              categories={categories}
              date={dateStr}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">No entries for this day</p>
          <p className="mt-1 text-sm">
            Add a manual entry or connect integrations to auto-generate entries.
          </p>
        </div>
      )}
    </div>
  );
}
