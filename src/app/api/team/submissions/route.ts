import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/require-manager";
import { teamSubmissionsQuerySchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const session = await requireManager();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = teamSubmissionsQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { from, to } = parsed.data;
  const dateFrom = new Date(from);
  const dateTo = new Date(to);

  // Get all members
  const members = await prisma.user.findMany({
    select: { id: true, name: true, image: true },
    orderBy: { name: "asc" },
  });

  // Get all daily submissions in range
  const dailySubmissions = await prisma.dailySubmission.findMany({
    where: { date: { gte: dateFrom, lte: dateTo } },
    select: {
      userId: true,
      date: true,
      submittedAt: true,
      totalHours: true,
    },
  });

  // Get entry hour totals for days without submissions (drafts/confirmed)
  const entries = await prisma.entry.groupBy({
    by: ["userId", "date"],
    where: { date: { gte: dateFrom, lte: dateTo } },
    _sum: { timeHours: true },
    _count: true,
  });

  // Build submission map: userId -> date -> status
  const submissionMap = new Map<string, Map<string, { submitted: boolean; totalHours: number; entryCount: number }>>();

  for (const member of members) {
    submissionMap.set(member.id, new Map());
  }

  // Fill with entry data first
  for (const e of entries) {
    const dateStr = e.date.toISOString().split("T")[0];
    const userMap = submissionMap.get(e.userId);
    if (userMap) {
      userMap.set(dateStr, {
        submitted: false,
        totalHours: Number(e._sum.timeHours ?? 0),
        entryCount: e._count,
      });
    }
  }

  // Override with submission data
  for (const ds of dailySubmissions) {
    const dateStr = ds.date.toISOString().split("T")[0];
    const userMap = submissionMap.get(ds.userId);
    if (userMap && ds.submittedAt) {
      const existing = userMap.get(dateStr);
      userMap.set(dateStr, {
        submitted: true,
        totalHours: Number(ds.totalHours ?? existing?.totalHours ?? 0),
        entryCount: existing?.entryCount ?? 0,
      });
    }
  }

  // Flatten to array
  const submissions = members.flatMap((member) => {
    const userMap = submissionMap.get(member.id) ?? new Map();
    return Array.from(userMap.entries()).map(([date, status]) => ({
      userId: member.id,
      userName: member.name,
      userImage: member.image,
      date,
      submitted: status.submitted,
      totalHours: status.totalHours,
      entryCount: status.entryCount,
    }));
  });

  return NextResponse.json({ members, submissions });
}
