import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEntrySchema, entriesQuerySchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = entriesQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date, from, to, status } = parsed.data;

  const where: Record<string, unknown> = { userId: session.user.id };

  if (date) {
    where.date = new Date(date);
  } else if (from && to) {
    where.date = { gte: new Date(from), lte: new Date(to) };
  }

  if (status) {
    where.status = status;
  }

  const entries = await prisma.entry.findMany({
    where,
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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date, categoryId, timeHours, description, notes, source } = parsed.data;

  // Check if day is already submitted
  const submission = await prisma.dailySubmission.findUnique({
    where: {
      userId_date: { userId: session.user.id, date: new Date(date) },
    },
  });

  if (submission?.submittedAt) {
    return NextResponse.json(
      { error: "This day has already been submitted" },
      { status: 409 }
    );
  }

  const entry = await prisma.entry.create({
    data: {
      userId: session.user.id,
      date: new Date(date),
      categoryId: categoryId ?? null,
      timeHours,
      description,
      notes: notes ?? null,
      source,
    },
    include: { category: true },
  });

  return NextResponse.json(
    {
      ...entry,
      timeHours: Number(entry.timeHours),
      date: entry.date.toISOString().split("T")[0],
    },
    { status: 201 }
  );
}
