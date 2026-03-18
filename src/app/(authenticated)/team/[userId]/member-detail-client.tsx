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
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      {/* Back link + member info */}
      <div className="flex items-center gap-4">
        <Link href="/team">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.image ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold">{member.name}</h1>
          <p className="text-sm text-muted-foreground">Read-only view</p>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[160px] text-center font-medium">
          {format(selectedDate, "EEEE, MMM d, yyyy")}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isToday && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{entries?.length ?? 0} entries</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {totalHours}h total
        </span>
      </div>

      {/* Entries */}
      {entriesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !entries?.length ? (
        <p className="py-12 text-center text-muted-foreground">
          No entries for this date
        </p>
      ) : (
        <div className="space-y-3">
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
