import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberDetailClient } from "./member-detail-client";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "manager") redirect("/dashboard");

  const { userId } = await params;

  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true },
  });
  if (!member) notFound();

  return <MemberDetailClient member={member} />;
}
