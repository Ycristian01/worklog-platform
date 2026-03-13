import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, integrations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.integration.findMany({
      where: { userId: session.user.id },
      select: {
        provider: true,
        connectedAt: true,
        lastSyncAt: true,
      },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <ProfileClient
      user={{
        ...user,
        createdAt: user.createdAt.toISOString(),
      }}
      integrations={integrations.map((i) => ({
        provider: i.provider,
        connectedAt: i.connectedAt.toISOString(),
        lastSyncAt: i.lastSyncAt?.toISOString() ?? null,
      }))}
    />
  );
}
