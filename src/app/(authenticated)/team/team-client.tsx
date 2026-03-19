"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  isSameWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, CheckCircle, Clock, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamSubmissions } from "@/lib/hooks";

export function TeamClient() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const fromStr = format(weekStart, "yyyy-MM-dd");
  const toStr = format(weekEnd, "yyyy-MM-dd");

  const { data, isLoading } = useTeamSubmissions(fromStr, toStr);

  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  const submissionMap = useMemo(() => {
    const map = new Map<string, Map<string, { submitted: boolean; totalHours: number; entryCount: number }>>();
    if (!data?.submissions) return map;
    for (const s of data.submissions) {
      if (!map.has(s.userId)) map.set(s.userId, new Map());
      map.get(s.userId)!.set(s.date, {
        submitted: s.submitted,
        totalHours: s.totalHours,
        entryCount: s.entryCount,
      });
    }
    return map;
  }, [data?.submissions]);

  const isCurrentWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Team Overview</h1>
        <p className="mt-1 text-muted-foreground">
          Weekly submission status for all team members
        </p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          className="h-9 w-9 rounded-lg border-border/60"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[220px] text-center font-medium tabular-nums">
          {format(weekStart, "MMM d")} &ndash; {format(weekEnd, "MMM d, yyyy")}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          className="h-9 w-9 rounded-lg border-border/60"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isCurrentWeek && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
            className="text-accent hover:text-accent border-border/60"
          >
            This week
          </Button>
        )}
      </div>

      {/* Submissions grid */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-display text-lg">Submissions</CardTitle>
          <CardDescription>
            Click a member name to view their entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !data?.members?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No team members found
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[200px] text-xs uppercase tracking-wider text-muted-foreground/70 font-medium">Member</TableHead>
                    {days.map((day) => (
                      <TableHead
                        key={day.toISOString()}
                        className={cn(
                          "text-center min-w-[80px]",
                          isToday(day) && "bg-accent/5 rounded-t-lg"
                        )}
                      >
                        <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/60 font-medium">
                          {format(day, "EEE")}
                        </div>
                        <div className={cn(
                          "text-sm font-semibold tabular-nums",
                          isToday(day) && "text-accent"
                        )}>
                          {format(day, "d")}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[80px] text-xs uppercase tracking-wider text-muted-foreground/70 font-medium">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((member) => {
                    const userSubmissions = submissionMap.get(member.id);
                    let weekTotal = 0;

                    return (
                      <TableRow key={member.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Link
                            href={`/team/${member.id}`}
                            className="flex items-center gap-2.5 hover:text-accent transition-colors"
                          >
                            <Avatar className="h-7 w-7 ring-1 ring-border/50">
                              <AvatarImage src={member.image ?? undefined} />
                              <AvatarFallback className="text-[0.6rem] font-medium bg-secondary">
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate max-w-[140px]">
                              {member.name}
                            </span>
                          </Link>
                        </TableCell>
                        {days.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const cell = userSubmissions?.get(dateStr);

                          if (cell) weekTotal += cell.totalHours;

                          return (
                            <TableCell
                              key={dateStr}
                              className={cn(
                                "text-center",
                                isToday(day) && "bg-accent/5"
                              )}
                            >
                              {!cell || cell.entryCount === 0 ? (
                                <Minus className="mx-auto h-4 w-4 text-muted-foreground/25" />
                              ) : cell.submitted ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                  <span className="text-[0.65rem] text-emerald-600 font-semibold tabular-nums">
                                    {cell.totalHours}h
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <Clock className="h-4 w-4 text-amber-500" />
                                  <span className="text-[0.65rem] text-amber-600 font-semibold tabular-nums">
                                    {cell.totalHours}h
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-semibold tabular-nums">
                          {weekTotal > 0 ? `${weekTotal}h` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
