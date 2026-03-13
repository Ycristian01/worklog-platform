import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await prisma.entry.findUnique({ where: { id } });

  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (entry.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft entries can be confirmed" },
      { status: 409 }
    );
  }

  const updated = await prisma.entry.update({
    where: { id },
    data: { status: "confirmed" },
    include: { category: true },
  });

  return NextResponse.json({
    ...updated,
    timeHours: Number(updated.timeHours),
    date: updated.date.toISOString().split("T")[0],
  });
}
