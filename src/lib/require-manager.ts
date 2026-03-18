import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Verify the current user has the manager role.
 * Checks the database directly (not the session) to prevent stale-role exploits.
 * Returns the session if the user is a manager, null otherwise.
 */
export async function requireManager() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "manager") return null;
  return session;
}
