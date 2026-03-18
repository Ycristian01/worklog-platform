import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/require-manager";

export async function GET() {
  const session = await requireManager();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.user.findMany({
    select: { id: true, name: true, email: true, image: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ members });
}
