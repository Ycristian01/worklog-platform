import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const dateObj = new Date(date);
  const userId = session.user.id;

  // Check if already submitted
  const existing = await prisma.dailySubmission.findUnique({
    where: { userId_date: { userId, date: dateObj } },
  });

  if (existing?.submittedAt) {
    return NextResponse.json(
      { error: "This day has already been submitted" },
      { status: 409 }
    );
  }

  // Get all entries for this day
  const entries = await prisma.entry.findMany({
    where: { userId, date: dateObj },
  });

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "No entries to submit for this day" },
      { status: 400 }
    );
  }

  // Check for unconfirmed draft entries
  const drafts = entries.filter((e) => e.status === "draft");
  if (drafts.length > 0) {
    return NextResponse.json(
      { error: "All entries must be confirmed before submitting" },
      { status: 400 }
    );
  }

  const totalHours = entries.reduce((sum, e) => sum + Number(e.timeHours), 0);

  // Submit all entries and create submission record in a transaction
  await prisma.$transaction([
    prisma.entry.updateMany({
      where: { userId, date: dateObj, status: "confirmed" },
      data: { status: "submitted" },
    }),
    prisma.dailySubmission.upsert({
      where: { userId_date: { userId, date: dateObj } },
      update: { submittedAt: new Date(), totalHours },
      create: { userId, date: dateObj, submittedAt: new Date(), totalHours },
    }),
  ]);

  return NextResponse.json({ ok: true, totalHours });
}
