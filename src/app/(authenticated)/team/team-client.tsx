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

  // Build lookup: userId -> date -> submission
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
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Overview</h1>
        <p className="text-muted-foreground">
          Weekly submission status for all team members
        </p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart(subWeeks(weekStart, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[220px] text-center font-medium">
          {format(weekStart, "MMM d")} &ndash; {format(weekEnd, "MMM d, yyyy")}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
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
          >
            This week
          </Button>
        )}
      </div>

      {/* Submissions grid */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            Click a member name to view their entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.members?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No team members found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Member</TableHead>
                    {days.map((day) => (
                      <TableHead
                        key={day.toISOString()}
                        className={cn(
                          "text-center min-w-[80px]",
                          isToday(day) && "bg-muted/50"
                        )}
                      >
                        <div className="text-xs text-muted-foreground">
                          {format(day, "EEE")}
                        </div>
                        <div>{format(day, "d")}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[80px]">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((member) => {
                    const userSubmissions = submissionMap.get(member.id);
                    let weekTotal = 0;

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Link
                            href={`/team/${member.id}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={member.image ?? undefined} />
                              <AvatarFallback className="text-xs">
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
                                isToday(day) && "bg-muted/50"
                              )}
                            >
                              {!cell || cell.entryCount === 0 ? (
                                <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
                              ) : cell.submitted ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-xs text-green-700 font-medium">
                                    {cell.totalHours}h
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <Clock className="h-4 w-4 text-yellow-600" />
                                  <span className="text-xs text-yellow-700 font-medium">
                                    {cell.totalHours}h
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-medium">
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
