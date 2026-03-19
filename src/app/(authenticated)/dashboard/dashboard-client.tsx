"use client";

import { useState, useEffect } from "react";
import { format, addDays, subDays, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Send,
  CalendarDays,
  RefreshCw,
  Github,
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
  useSyncGitHub,
} from "@/lib/hooks";
import { toast } from "sonner";

function formatDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function DashboardClient({ userName }: { userName: string }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateStr = formatDateParam(selectedDate);

  const { data: entries, isLoading: entriesLoading } = useEntries(dateStr);
  const { data: categories = [] } = useCategories();
  const { data: dayStatus } = useDayStatus(dateStr);
  const confirmEntry = useConfirmEntry();
  const submitDay = useSubmitDay();
  const syncCalendar = useSyncCalendar();
  const syncGitHub = useSyncGitHub();

  const [autoSynced, setAutoSynced] = useState(false);
  const syncCalendarMutate = syncCalendar.mutate;
  const syncGitHubMutate = syncGitHub.mutate;
  useEffect(() => {
    if (
      isToday(selectedDate) &&
      !entriesLoading &&
      entries !== undefined &&
      !autoSynced
    ) {
      setAutoSynced(true);
      syncCalendarMutate(dateStr, {
        onSuccess: (data) => {
          if (data.synced > 0) {
            toast.success(
              `Auto-synced ${data.synced} calendar event${data.synced !== 1 ? "s" : ""}`
            );
          }
        },
        onError: () => {},
      });
      syncGitHubMutate(dateStr, {
        onSuccess: (data) => {
          if (data.synced > 0) {
            toast.success(
              `Auto-synced ${data.synced} GitHub activit${data.synced !== 1 ? "ies" : "y"}`
            );
          }
        },
        onError: () => {},
      });
    }
  }, [selectedDate, entriesLoading, entries, dateStr, autoSynced, syncCalendarMutate, syncGitHubMutate]);

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

  const handleSyncGitHub = () => {
    syncGitHub.mutate(dateStr, {
      onSuccess: (data) => {
        if (data.synced > 0) {
          toast.success(`Synced ${data.synced} GitHub activit${data.synced !== 1 ? "ies" : "y"}`);
        } else {
          toast.info("No new GitHub activity to sync");
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
    <div className="mx-auto max-w-3xl p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Welcome back, {userName}</p>
      </div>

      {/* Date navigation */}
      <div className="mb-6 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goPrev} className="h-9 w-9 shrink-0 rounded-lg">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {/* Fixed-width date display to prevent layout shift */}
        <div className="flex w-[320px] shrink-0 items-center justify-center gap-2.5">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted"
                >
                  <CalendarDays className="h-4 w-4 text-accent" />
                  <span className="text-lg font-semibold tracking-tight">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </span>
                </button>
              }
            />
            <PopoverContent align="center" sideOffset={8} className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(day) => {
                  if (day) {
                    setSelectedDate(day);
                    setCalendarOpen(false);
                  }
                }}
                defaultMonth={selectedDate}
              />
            </PopoverContent>
          </Popover>
          {isToday(selectedDate) && (
            <Badge variant="secondary" className="bg-accent/10 text-accent border-0 font-medium shrink-0">
              Today
            </Badge>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={goNext} className="h-9 w-9 shrink-0 rounded-lg">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isToday(selectedDate) && (
          <Button variant="ghost" size="sm" onClick={goToday} className="ml-1 shrink-0 text-accent hover:text-accent">
            Today
          </Button>
        )}
      </div>

      {/* Stats bar */}
      <div className="mb-5 flex items-center justify-between rounded-xl border border-border/60 bg-card px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-5 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="text-lg font-semibold tabular-nums">{entries?.length ?? 0}</span>
            <span className="text-muted-foreground">entries</span>
          </span>
          <div className="h-4 w-px bg-border/60" />
          <span className="flex items-center gap-1.5">
            <span className="text-lg font-semibold tabular-nums">{totalHours}</span>
            <span className="text-muted-foreground">hours</span>
          </span>
          {drafts.length > 0 && (
            <>
              <div className="h-4 w-px bg-border/60" />
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
          {isSubmitted && (
            <>
              <div className="h-4 w-px bg-border/60" />
              <Badge variant="default" className="bg-emerald-600 border-0 font-medium">
                Submitted
              </Badge>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isSubmitted && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncCalendar}
                disabled={syncCalendar.isPending}
                className="border-border/60"
              >
                <RefreshCw
                  className={cn(
                    "mr-1.5 h-3.5 w-3.5",
                    syncCalendar.isPending && "animate-spin"
                  )}
                />
                Calendar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncGitHub}
                disabled={syncGitHub.isPending}
                className="border-border/60"
              >
                <Github
                  className={cn(
                    "mr-1.5 h-3.5 w-3.5",
                    syncGitHub.isPending && "animate-spin"
                  )}
                />
                GitHub
              </Button>
            </>
          )}
          {drafts.length > 0 && !isSubmitted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConfirmAll}
              disabled={confirmEntry.isPending}
              className="border-border/60"
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              Confirm All
            </Button>
          )}
          {confirmed.length > 0 && drafts.length === 0 && !isSubmitted && (
            <Button
              size="sm"
              onClick={handleSubmitDay}
              disabled={submitDay.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90 border-0 shadow-sm"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
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
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="space-y-3 stagger-children">
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
        <div className="animate-fade-in rounded-xl border-2 border-dashed border-border/50 p-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-display text-lg font-medium">No entries for this day</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Add a manual entry or connect integrations to auto-generate entries.
          </p>
        </div>
      )}
    </div>
  );
}
