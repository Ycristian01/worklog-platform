import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

  const submission = await prisma.dailySubmission.findUnique({
    where: {
      userId_date: { userId: session.user.id, date: new Date(date) },
    },
  });

  return NextResponse.json({
    submitted: !!submission?.submittedAt,
    submittedAt: submission?.submittedAt?.toISOString() ?? null,
    totalHours: submission?.totalHours ? Number(submission.totalHours) : null,
  });
}
