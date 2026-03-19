"use client";

import { useState } from "react";
import Link from "next/link";
import { format, addDays, subDays, isToday as checkIsToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ArrowLeft, Clock } from "lucide-react";
import { EntryCard } from "@/components/entry-card";
import { useTeamMemberEntries, useCategories } from "@/lib/hooks";

interface MemberDetailProps {
  member: { id: string; name: string; image: string | null };
}

export function MemberDetailClient({ member }: MemberDetailProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isToday = checkIsToday(selectedDate);

  const { data: entries, isLoading: entriesLoading } = useTeamMemberEntries(
    member.id,
    dateStr
  );
  const { data: categories } = useCategories();

  const totalHours =
    entries?.reduce((sum, e) => sum + e.timeHours, 0).toFixed(2) ?? "0.00";

  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6 animate-fade-in">
      {/* Back link + member info */}
      <div className="flex items-center gap-4">
        <Link href="/team">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Avatar className="h-10 w-10 ring-2 ring-border/50">
          <AvatarImage src={member.image ?? undefined} />
          <AvatarFallback className="font-medium bg-secondary">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">{member.name}</h1>
          <p className="text-sm text-muted-foreground">Read-only view</p>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          className="h-9 w-9 rounded-lg border-border/60"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[180px] text-center font-medium tabular-nums">
          {format(selectedDate, "EEEE, MMM d, yyyy")}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="h-9 w-9 rounded-lg border-border/60"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isToday && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            className="text-accent hover:text-accent border-border/60"
          >
            Today
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{entries?.length ?? 0}</span> entries
        </span>
        <div className="h-3.5 w-px bg-border/60" />
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground tabular-nums">{totalHours}h</span> total
        </span>
      </div>

      {/* Entries */}
      {entriesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !entries?.length ? (
        <div className="rounded-xl border-2 border-dashed border-border/50 py-16 text-center">
          <p className="text-muted-foreground">No entries for this date</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              categories={categories ?? []}
              date={dateStr}
              readOnly
            />
          ))}
        </div>
      )}
    </div>
  );
}
