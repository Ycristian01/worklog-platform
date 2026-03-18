import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/require-manager";
import { teamEntriesQuerySchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const session = await requireManager();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = teamEntriesQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, date } = parsed.data;

  const entries = await prisma.entry.findMany({
    where: { userId, date: new Date(date) },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    entries.map((e) => ({
      ...e,
      timeHours: Number(e.timeHours),
      date: e.date.toISOString().split("T")[0],
    }))
  );
}
