import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateEntrySchema } from "@/lib/schemas";

async function getOwnEntry(entryId: string, userId: string) {
  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== userId) return null;
  return entry;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await getOwnEntry(id, session.user.id);
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (entry.status === "submitted") {
    return NextResponse.json(
      { error: "Cannot edit a submitted entry" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.entry.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
  });

  return NextResponse.json({
    ...updated,
    timeHours: Number(updated.timeHours),
    date: updated.date.toISOString().split("T")[0],
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await getOwnEntry(id, session.user.id);
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (entry.status === "submitted") {
    return NextResponse.json(
      { error: "Cannot delete a submitted entry" },
      { status: 409 }
    );
  }

  await prisma.entry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
